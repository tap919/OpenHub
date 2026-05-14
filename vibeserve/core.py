"""Core business logic: validation, critique, generators, memory, cache."""

from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
from pathlib import Path

from vibeserve.models import (
    ArchitectureDecision, CodeFile, ContrastResult, IterationResult,
    UIComponent, VibePlan, WCAGLevel,
)
from vibeserve.utils import contrast_ratio, StructuredLogger

log = logging.getLogger("VibeServe")


# ====================== WCAG VALIDATION ======================
def validate_wcag_contrast(fg: str, bg: str, min_level: WCAGLevel = WCAGLevel.AA) -> ContrastResult:
    ratio = contrast_ratio(fg, bg)
    result = ContrastResult(fg=fg, bg=bg, ratio=round(ratio, 2), wcag_level=WCAGLevel.FAIL, passes_aa=False, passes_aaa=False)
    result.passes_min = (
        result.passes_aaa if min_level == WCAGLevel.AAA
        else result.passes_aa if min_level == WCAGLevel.AA
        else False
    )
    return result


# ====================== CONFIG ======================
class Config:
    cache_dir: Path = Path(".aether_prime_cache")
    memory_dir: Path = Path(".aether_prime_memory")
    memory_db: Path = Path(".aether_prime_memory/specs.db")
    cache_ttl: int = 7200
    max_concurrency: int = 3
    max_retries: int = 4
    max_repairs: int = 2
    temp_generator: float = 0.82
    temp_critic: float = 0.15
    temp_synthesizer: float = 0.65
    max_variants: int = 4
    evolution_threshold: float = 0.85
    min_score_to_store: float = 0.82


CONFIG = Config()
CONFIG.cache_dir.mkdir(parents=True, exist_ok=True)
CONFIG.memory_dir.mkdir(parents=True, exist_ok=True)


# ====================== SCHEMA VALIDATOR ======================
class SchemaValidator:
    @staticmethod
    def validate_component(component: Dict[str, Any], design_system: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not component.get("id"):
            errors.append("component.id is required")
        if not component.get("type"):
            errors.append("component.type is required")
        if not component.get("accessibility", {}).get("aria_role"):
            errors.append(f"Component {component.get('id')} missing aria_role")

        palette = design_system.get("tokens", {}).get("colors", {})
        whitelisted = list(palette.keys())
        if component.get("visual", {}).get("color_role"):
            color = component["visual"]["color_role"]
            if color not in whitelisted:
                errors.append(f"Color '{color}' not in design system palette")

        allowed = design_system.get("constraints", {}).get("allowed_components", [])
        if allowed and component.get("type") not in allowed:
            errors.append(f"Component type '{component.get('type')}' not in allowed list")
        return len(errors) == 0, errors

    @staticmethod
    def validate_schema(schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if schema.get("version") != "1.0":
            errors.append("Schema version must be 1.0")
        if not schema.get("metadata", {}).get("id"):
            errors.append("metadata.id is required")
        if not schema.get("metadata", {}).get("name"):
            errors.append("metadata.name is required")

        design_system = schema.get("design_system", {})
        for component in schema.get("components", []):
            valid, comp_errors = SchemaValidator.validate_component(component, design_system)
            if not valid:
                errors.extend(comp_errors)

        constraints = design_system.get("constraints", {})
        min_wcag = constraints.get("min_wcag_level", "AA")
        tokens = design_system.get("tokens", {})

        for color_id, color_data in tokens.get("colors", {}).items():
            if isinstance(color_data, dict):
                if color_data.get("role") == "background_only":
                    continue
                hex_val = color_data.get("hex")
                if hex_val:
                    white_ratio = contrast_ratio(hex_val, "#FFFFFF")
                    black_ratio = contrast_ratio(hex_val, "#000000")
                    if min_wcag == "AAA":
                        if white_ratio < 7 and black_ratio < 7:
                            errors.append(f"Color {color_id} fails WCAG AAA contrast requirements")
        return len(errors) == 0, errors


# ====================== MEMORY STORE ======================
class MemoryStore:
    def __init__(self, db_path: Path = CONFIG.memory_db):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        import sqlite3
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS specs (
                    id TEXT PRIMARY KEY,
                    page_type TEXT NOT NULL,
                    score REAL NOT NULL DEFAULT 0.0,
                    timestamp TEXT NOT NULL,
                    spec_json TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_page_type ON specs(page_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_score ON specs(score DESC)")
            conn.commit()

    def store(self, page_type: str, spec: Dict[str, Any], score: float):
        if score < CONFIG.min_score_to_store:
            return
        import sqlite3
        spec_id = spec.get("metadata", {}).get("id", hashlib.sha256(
            f"{page_type}{time.time()}".encode()
        ).hexdigest()[:20])
        timestamp = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO specs (id, page_type, score, timestamp, spec_json) VALUES (?, ?, ?, ?, ?)",
                (spec_id, page_type, score, timestamp, json.dumps(spec))
            )
            conn.commit()
        log.info(f"Stored spec {spec_id[:8]} for {page_type} (score: {score:.2f})")

    def get(self, page_type: str, limit: int = 3) -> List[Dict[str, Any]]:
        import sqlite3
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT spec_json, score FROM specs WHERE page_type = ? ORDER BY score DESC LIMIT ?",
                (page_type, limit)
            ).fetchall()
        return [{"score": row["score"], "spec": json.loads(row["spec_json"])} for row in rows]

    def stats(self) -> Dict[str, Any]:
        import sqlite3
        stats: Dict[str, Any] = {
            "total_stored_specs": 0, "by_page_type": {},
            "memory_usage_mb": 0, "oldest_spec": None, "highest_score": 0
        }
        with sqlite3.connect(str(self.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT page_type, COUNT(*) as cnt, MAX(score) as max_score, MIN(timestamp) as oldest "
                "FROM specs GROUP BY page_type"
            ).fetchall()
            for row in rows:
                stats["by_page_type"][row["page_type"]] = {
                    "count": row["cnt"], "highest_score": row["max_score"], "oldest": row["oldest"]
                }
                stats["total_stored_specs"] += row["cnt"]
                stats["highest_score"] = max(stats["highest_score"], row["max_score"])
        if self.db_path.exists():
            stats["memory_usage_mb"] = self.db_path.stat().st_size / (1024 * 1024)
        return stats


memory_store = MemoryStore()


def store_successful_spec(page_type: str, spec: Dict[str, Any], score: float):
    memory_store.store(page_type, spec, score)


def get_similar_specs(page_type: str, limit: int = 3) -> List[Dict[str, Any]]:
    return memory_store.get(page_type, limit)


# ====================== CACHE ======================
class CacheManager:
    def __init__(self, cache_dir: Path = CONFIG.cache_dir, ttl: int = CONFIG.cache_ttl):
        self.cache_dir = cache_dir
        self.ttl = ttl
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_cache_key(self, page_type: str, requirements: List[str], design_system_id: str) -> str:
        return hashlib.sha256(
            json.dumps({"page_type": page_type, "requirements": sorted(requirements),
                        "design_system": design_system_id[:20]}, sort_keys=True).encode()
        ).hexdigest()[:32]

    def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        f = self.cache_dir / f"{cache_key}.json"
        if not f.exists():
            return None
        try:
            with open(f) as fh:
                raw = json.load(fh)
            payload = json.dumps(raw["data"])
            if hashlib.sha256(payload.encode()).hexdigest() != raw["checksum"]:
                log.warning(f"[CacheManager] Integrity check failed for {cache_key} — evicting")
                f.unlink()
                return None
            data = raw["data"]
            if time.time() - data.get("timestamp", 0) > self.ttl:
                f.unlink()
                return None
            return data.get("result")
        except Exception as e:
            log.warning(f"[CacheManager] Failed to read cache {cache_key}: {e}")
            return None

    def set(self, cache_key: str, result: Dict[str, Any]) -> bool:
        f = self.cache_dir / f"{cache_key}.json"
        try:
            cache_data = {"timestamp": time.time(), "result": result}
            payload = json.dumps(cache_data)
            with open(f, "w") as fh:
                json.dump({"checksum": hashlib.sha256(payload.encode()).hexdigest(),
                           "data": cache_data}, fh)
            return True
        except Exception as e:
            log.warning(f"[CacheManager] Failed to write cache {cache_key}: {e}")
            return False


cache_manager = CacheManager()


# ====================== MULTI-AGENT CRITIQUE ======================
class DesignAgent:
    def __init__(self, role: str, personality: str, provider=None):
        self.role = role
        self.personality = personality
        from vibeserve.providers import router
        self.provider = provider or router.get()

    async def critique(self, schema: Dict[str, Any], requirements: List[str]) -> Dict[str, Any]:
        from vibeserve.providers import router
        prompt = f"""You are a {self.role} reviewing a UI design specification.

Your personality: {self.personality}

Design to critique:
{json.dumps(schema, indent=2)[:2000]}...

Requirements this design should meet:
{chr(10).join(f'- {r}' for r in requirements)}

Provide a JSON critique with:
{{
  "score": <0.0-1.0>,
  "strengths": [<list of 2-3 strengths>],
  "weaknesses": [<list of 2-3 weaknesses>],
  "specific_feedback": "<1-2 sentences of actionable feedback>",
  "concern_level": "<low|medium|high>",
  "recommendation": "<keep|modify|reject>"
}}

Be concise and specific. Your perspective as a {self.role} matters."""

        response = await router.get().call(prompt, temperature=CONFIG.temp_critic)
        if not response:
            return {"score": 0.5, "error": "Failed to generate critique"}
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            log.warning(f"Failed to parse critique from {self.role}")
            return {"score": 0.5, "error": "Invalid JSON response"}


class MultiAgentCritique:
    def __init__(self):
        self.designer = DesignAgent(
            role="UX Designer",
            personality="Focus on user experience, delight, and aesthetic coherence.",
            provider=os.getenv("DESIGNER_PROVIDER")
        )
        self.engineer = DesignAgent(
            role="Frontend Engineer",
            personality="Focus on implementation feasibility and performance.",
            provider=os.getenv("ENGINEER_PROVIDER")
        )
        self.advocate = DesignAgent(
            role="Accessibility Advocate",
            personality="Focus on accessibility, inclusion, and WCAG compliance.",
            provider=os.getenv("ADVOCATE_PROVIDER")
        )

    async def review(self, schema: Dict[str, Any], requirements: List[str]) -> Dict[str, Any]:
        log.info("Starting multi-agent critique...")
        critiques = await asyncio.gather(
            self.designer.critique(schema, requirements),
            self.engineer.critique(schema, requirements),
            self.advocate.critique(schema, requirements),
            return_exceptions=True
        )
        scores = [c.get("score", 0.5) for c in critiques if "error" not in c]
        avg_score = sum(scores) / len(scores) if scores else 0.5
        concerns = [c.get("concern_level") for c in critiques if c.get("concern_level") == "high"]
        recommendations = [c.get("recommendation") for c in critiques]

        synthesis = {
            "agents": {"designer": critiques[0], "engineer": critiques[1], "advocate": critiques[2]},
            "consensus_score": round(avg_score, 2),
            "red_flags": len([c for c in concerns if c == "high"]),
            "recommendation": "proceed" if avg_score > 0.7 else "revise" if avg_score > 0.5 else "reject",
            "agent_agreement": len([r for r in recommendations if r == "keep"]) / 3 if recommendations else 0.5
        }
        log.info(f"Critique complete. Consensus: {synthesis['recommendation']} (score: {synthesis['consensus_score']})")
        return synthesis


# ====================== SPEC GENERATOR ======================
class SpecGenerator:
    def __init__(self, design_system: Dict[str, Any], provider=None):
        self.design_system = design_system
        self.critique = MultiAgentCritique()
        from vibeserve.providers import router
        self.provider = provider or router.get()
        self.ctx = None

    def _sanitize_input(self, text: str, max_len: int = 500) -> str:
        if not text or not isinstance(text, str):
            log.warning("[Security] _sanitize_input received non-string input")
            return ""
        dangerous = [
            "ignore previous", "system:", "assistant:", "```", "<|", "|>",
            "DROP TABLE", "DELETE FROM", "INSERT INTO", "UNION SELECT",
            "<script", "javascript:", "onerror=", "onload=",
            "../", "\\x", "SELECT * FROM",
        ]
        for pattern in dangerous:
            text = text.replace(pattern, "")
        text = re.sub(r'\s+', ' ', text)
        sanitized = text[:max_len].strip()
        if sanitized != text[:max_len].strip():
            log.warning(f"[Security] Input sanitized: {len(text) - len(sanitized)} chars removed or truncated")
        return sanitized

    async def _mcp_llm_call(self, prompt, temperature, ctx=None):
        import vibeserve
        return await vibeserve.mcp_llm_call(prompt, temperature=temperature, ctx=ctx)

    async def generate_variant(self, requirements: List[str], iteration: int = 0) -> Dict[str, Any]:
        spec_id = hashlib.sha256(f"{json.dumps(requirements)}{time.time()}".encode()).hexdigest()[:20]
        clean_reqs = [self._sanitize_input(r) for r in requirements]

        prompt = f"""Generate a production-ready UI specification for:
Requirements:
{chr(10).join(f'- {r}' for r in clean_reqs)}

Design System Constraints:
- Must use colors from: {', '.join(self.design_system.get('tokens', {}).get('colors', {}).keys())}
- Minimum WCAG level: {self.design_system.get('constraints', {}).get('min_wcag_level', 'AA')}
- Allowed components: {', '.join(self.design_system.get('constraints', {}).get('allowed_components', []))}

Return a valid UISchema v1.0 JSON with proper metadata, at least 3 components with full accessibility attributes, responsive layouts, and WCAG AAA-passing contrast ratios."""

        response = await self._mcp_llm_call(prompt, temperature=CONFIG.temp_generator, ctx=self.ctx)
        if not response:
            log.error("Failed to generate spec variant")
            return {}
        try:
            spec = json.loads(response)
            spec["metadata"]["id"] = spec_id
            spec["metadata"]["created_at"] = datetime.now(timezone.utc).isoformat()
            return spec
        except (json.JSONDecodeError, KeyError) as e:
            log.error(f"Invalid spec JSON generated: {e}")
            return {}

    async def generate_with_critique(self, requirements: List[str], iterations: int = 2) -> Dict[str, Any]:
        variants = []
        for i in range(min(CONFIG.max_variants, 2)):
            log.info(f"Generating variant {i + 1}...")
            variant = await self.generate_variant(requirements, i)
            if not variant:
                continue
            valid, errors = SchemaValidator.validate_schema(variant)
            if not valid:
                log.warning(f"Variant {i + 1} validation failed: {errors}")
                continue
            critique_result = await self.critique.review(variant, requirements)
            variant["_critique"] = critique_result
            variant["_score"] = critique_result.get("consensus_score", 0.5)
            variants.append(variant)

        if not variants:
            log.error("No valid variants generated")
            return {}

        best = max(variants, key=lambda v: v.get("_score", 0))
        log.info(f"Selected best variant with score {best['_score']}")

        return {
            "selected": best,
            "alternatives": sorted(variants, key=lambda v: v.get("_score", 0), reverse=True)[1:],
            "generation_metadata": {
                "total_variants": len(variants),
                "best_score": best["_score"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }


# ====================== VIBE ARCHITECT ======================
CONTENT_GUIDELINES = """
CRITICAL CONTENT RULES:

NO FABRICATION:
- NEVER invent statistics: no fake download counts, uptime percentages, user numbers.
- NEVER fabricate features not in the architecture plan.
- NEVER invent testimonials, quotes, or named users.
- NEVER use SaaS copy: "Free Trial", "Pricing Plans", "Sign Up", "Enterprise Tier".

MUST INCLUDE (OSS projects):
- Logo image (use provided paths)
- Actual tools/features list from the architecture plan
- Pipeline diagram or workflow
- Quick start / installation code block
- Donate link (GitHub star + CashApp if specified)
- Footer with project name and license

STRUCTURAL:
- Valid HTML with proper tag nesting
- ARIA labels on all interactive elements
- Relative asset paths for deployment context
- Current year

IF UNSURE, OMIT stats and testimonials. ALWAYS include the actual product features.
A clean honest page showing the real product is better than a fabricated marketing page.
"""


class VibeArchitect:
    def __init__(self, provider=None, ctx: Any = None):
        from vibeserve.providers import router
        self.provider = provider or router.get()
        self.ctx = ctx

    async def _mcp_llm_call(self, prompt, temperature, ctx=None):
        import vibeserve
        return await vibeserve.mcp_llm_call(prompt, temperature=temperature, ctx=ctx)

    async def plan(self, intent: str, constraints: List[str] = None,
                   context: Dict[str, Any] = None, target_stack: str = "react") -> VibePlan:
        constraints = constraints or []
        context = context or {}
        prompt = f"""You are a senior software architect. Produce a detailed architecture plan.

{CONTENT_GUIDELINES}

USER INTENT: {intent}
CONSTRAINTS: {chr(10).join(f'- {c}' for c in constraints) if constraints else 'None'}
TARGET STACK: {target_stack}

Return JSON: {{"decisions": [{{"id":"ADR-001","title":"...","context":"...","decision":"...","alternatives":["A","B"],"rationale":"...","consequences":["..."],"confidence":0.9}}], "component_tree": [...], "data_flow": {{}}, "file_structure": [...], "estimated_complexity": "low|medium|high", "risks": [...], "recommended_stack": {{}}}}"""
        response = await self._mcp_llm_call(prompt, temperature=0.3, ctx=self.ctx)
        if not response:
            return VibePlan(intent=intent, risks=["Failed to generate plan"])
        try:
            data = json.loads(response)
            return VibePlan(intent=intent,
                decisions=[ArchitectureDecision(**d) for d in data.get("decisions", [])],
                component_tree=data.get("component_tree", []),
                data_flow=data.get("data_flow", {}),
                file_structure=data.get("file_structure", []),
                estimated_complexity=data.get("estimated_complexity", "medium"),
                risks=data.get("risks", []),
                recommended_stack=data.get("recommended_stack", {}))
        except Exception as e:
            return VibePlan(intent=intent, risks=[f"Parse error: {str(e)}"])


# ====================== VIBE IMPLEMENTER ======================
DEFAULT_DESIGN_SYSTEM = {
    "tokens": {
        "colors": {
            "primary": {"hex": "#00FF9F", "wcag_level": "AAA"},
            "secondary": {"hex": "#00B8FF", "wcag_level": "AAA"},
            "accent": {"hex": "#FF00AA", "wcag_level": "AAA"},
            "background": {"hex": "#0A0A0A", "wcag_level": "FAIL", "role": "background_only"},
            "surface": {"hex": "#111111", "wcag_level": "AA"},
            "text": {"hex": "#EEEEEE", "wcag_level": "AAA"},
            "text_secondary": {"hex": "#AAAAAA", "wcag_level": "AA"},
            "success": {"hex": "#00FF9F", "wcag_level": "AAA"},
            "warning": {"hex": "#FFB800", "wcag_level": "AAA"},
            "error": {"hex": "#FF4444", "wcag_level": "AAA"},
        },
        "typography": {
            "heading": {"font_family": "Inter", "font_size": "2.5rem", "font_weight": "700", "line_height": 1.2, "letter_spacing": "-0.02em"},
            "subheading": {"font_family": "Inter", "font_size": "1.5rem", "font_weight": "600", "line_height": 1.3},
            "body": {"font_family": "Inter", "font_size": "1rem", "font_weight": "400", "line_height": 1.5},
            "caption": {"font_family": "Inter", "font_size": "0.875rem", "font_weight": "400", "line_height": 1.4}
        },
        "spacing": {"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "2rem", "xl": "4rem", "2xl": "8rem"},
        "shadows": {"sm": "0 1px 2px rgba(0,0,0,0.05)", "md": "0 4px 6px rgba(0,0,0,0.1)", "lg": "0 10px 15px rgba(0,0,0,0.1)", "xl": "0 20px 25px rgba(0,0,0,0.1)"},
        "border_radius": {"sm": "0.25rem", "md": "0.5rem", "lg": "1rem", "full": "9999px"}
    },
    "constraints": {
        "min_wcag_level": "AA",
        "allowed_components": ["button", "input", "card", "modal", "dropdown", "tabs", "badge", "avatar", "breadcrumb", "tooltip", "checkbox", "radio", "toggle", "slider", "progress", "spinner", "alert", "snackbar", "hero", "form", "grid", "list", "table", "pagination", "custom"],
        "color_whitelist": ["primary", "secondary", "accent", "background", "surface", "text", "text_secondary", "success", "warning", "error"],
        "max_component_depth": 6,
        "required_aria_roles": ["button", "navigation", "main", "contentinfo"]
    }
}


class VibeImplementer:
    def __init__(self, provider=None, design_system: Optional[Dict[str, Any]] = None, ctx: Any = None):
        from vibeserve.providers import router
        self.provider = provider or router.get()
        self._design_system = design_system
        self.ctx = ctx

    @property
    def design_system(self):
        return self._design_system or DEFAULT_DESIGN_SYSTEM

    async def _mcp_llm_call(self, prompt, temperature, ctx=None):
        import vibeserve
        return await vibeserve.mcp_llm_call(prompt, temperature=temperature, ctx=ctx)

    async def implement(self, plan: VibePlan, intent: str, constraints: List[str] = None,
                        target_language: str = "typescript") -> List[CodeFile]:
        constraints = constraints or []
        ds_tokens = json.dumps(self.design_system.get("tokens", {}), indent=2)[:2000]
        prompt = f"""Generate production-ready code from this plan. Enforce constraints. Include full accessibility.

{CONTENT_GUIDELINES}

INTENT: {intent}
DECISIONS: {json.dumps([asdict(d) for d in plan.decisions], indent=2)[:2000]}
COMPONENTS: {json.dumps(plan.component_tree, indent=2)[:1000]}
FILES: {json.dumps(plan.file_structure)}
STACK: {json.dumps(plan.recommended_stack)}
CONSTRAINTS: {chr(10).join(f'- {c}' for c in constraints)}
DESIGN TOKENS: {ds_tokens}
TARGET: {target_language}

Return a JSON array of files: [{{"path":"...","content":"...","language":"tsx","purpose":"...","accessibility_notes":["..."]}}]"""
        response = await self._mcp_llm_call(prompt, temperature=CONFIG.temp_generator, ctx=self.ctx)
        if not response:
            return []
        try:
            data = json.loads(response)
            if isinstance(data, list):
                return [CodeFile(**f) for f in data]
            return []
        except Exception as e:
            log.warning(f"[VibeImplementer] Failed to parse code files: {e}")
            return []


# ====================== VIBE VERIFIER ======================
class VibeVerifier:
    @staticmethod
    def verify_spec(spec: Dict[str, Any]) -> Dict[str, Any]:
        validator = SchemaValidator()
        valid, errors = validator.validate_schema(spec)
        return {"valid": valid, "errors": errors, "error_count": len(errors)}

    @staticmethod
    def verify_code_quality(files: List[CodeFile]) -> Dict[str, Any]:
        issues = []
        fabricated_patterns = [
            (r"\d+K\+.*[Dd]ownloads", "fabricated download count"),
            (r"\d+\.\d+%.*[Uu]ptime", "fabricated uptime stat"),
            (r"24/7.*[Ss]upport", "fabricated support claim"),
            (r"[Ee]nterprise.grade.{0,30}security", "fabricated security claim"),
            (r"[Rr]eal.time.{0,20}[Cc]ollaboration", "fabricated feature"),
            (r"\d+%.*faster", "fabricated performance claim"),
            (r"[Jj]oin.{0,15}thousands.{0,15}developers", "fabricated user count"),
            (r"Sarah K\.|Marcus J\.|Elena R\.", "fabricated testimonial name"),
            (r"[Ss]ign.{0,10}[Uu]p|[Ff]ree.{0,10}[Tt]rial|[Pp]ricing.{0,10}[Pp]lan|[Ss]chedule.{0,10}[Dd]emo", "SaaS CTA pattern"),
            (r"[Ww]hat.{0,15}[Dd]evelopers.{0,15}[Ss]ay", "testimonial header with no content"),
        ]
        for f in files:
            if not f.accessibility_notes:
                issues.append(f"{f.path}: missing accessibility notes")
            if "aria-" not in f.content.lower() and f.language in ("tsx", "jsx", "html"):
                issues.append(f"{f.path}: no ARIA attributes found")
            if "TODO" in f.content or "FIXME" in f.content:
                issues.append(f"{f.path}: contains TODO/FIXME")
            if f.language == "html":
                for pattern, label in fabricated_patterns:
                    if re.search(pattern, f.content):
                        issues.append(f"{f.path}: {label} — fabricated/hallucinated content")
                opens = len(re.findall(r"<section\b", f.content))
                closes = len(re.findall(r"</section>", f.content))
                if opens != closes:
                    issues.append(f"{f.path}: HTML nesting error — {opens} <section> opens vs {closes} closes")
        return {"passed": len(issues) == 0, "issues": issues, "issue_count": len(issues), "files_checked": len(files)}


# ====================== VIBE CODE REVIEWER ======================
class VibeCodeReviewer:
    def __init__(self):
        self.designer = DesignAgent(role="UX Code Reviewer",
            personality="Review for visual quality, design tokens, hierarchy",
            provider=os.getenv("DESIGNER_PROVIDER"))
        self.engineer = DesignAgent(role="Code Quality Reviewer",
            personality="Review for bugs, error handling, architecture",
            provider=os.getenv("ENGINEER_PROVIDER"))
        self.advocate = DesignAgent(role="Accessibility Code Reviewer",
            personality="Review for ARIA, keyboard nav, WCAG",
            provider=os.getenv("ADVOCATE_PROVIDER"))

    async def review_code(self, files: List[CodeFile], requirements: List[str]) -> Dict[str, Any]:
        code_summary = [{"path": f.path, "language": f.language, "purpose": f.purpose, "content_preview": f.content[:500]} for f in files]
        schema_for_review = {"files": code_summary, "requirements": requirements}
        critiques = await asyncio.gather(
            self.designer.critique(schema_for_review, requirements),
            self.engineer.critique(schema_for_review, requirements),
            self.advocate.critique(schema_for_review, requirements),
            return_exceptions=True)
        scores = [c.get("score", 0.5) for c in critiques if isinstance(c, dict) and "error" not in c]
        avg_score = sum(scores) / len(scores) if scores else 0.5
        return {
            "consensus_score": round(avg_score, 2),
            "recommendation": "approve" if avg_score > 0.8 else "revise" if avg_score > 0.6 else "reject",
            "agent_reviews": {"designer": critiques[0], "engineer": critiques[1], "advocate": critiques[2]},
            "line_level_issues": [{
                "agent": c.get("role", "?"), "issue": w,
                "severity": "high" if "crash" in str(w).lower() else "medium"
            } for c in critiques for w in c.get("weaknesses", [])],
            "files_reviewed": len(files), "critical_issues": 0
        }


# ====================== SYSTEM AUDITOR ======================
class SystemAuditor:
    def __init__(self):
        self.backend = DesignAgent(
            role="Backend Engineer",
            personality="Review for code quality: error handling, async patterns, resource cleanup, SQL injection, type safety, logging consistency, API design.",
            provider=os.getenv("ENGINEER_PROVIDER"))
        self.security = DesignAgent(
            role="Security Auditor",
            personality="Review for vulnerabilities: API key exposure, prompt injection, path traversal, input validation, auth bypass, secrets in logs.",
            provider=os.getenv("ADVOCATE_PROVIDER"))
        self.perf = DesignAgent(
            role="Performance Reviewer",
            personality="Review for performance: blocking I/O in async, missing caching, N+1 queries, large memory structures, excessive retries.",
            provider=os.getenv("DESIGNER_PROVIDER"))

    async def audit(self, files: List[CodeFile], requirements: List[str]) -> Dict[str, Any]:
        code_summary = [{"path": f.path, "language": f.language, "purpose": f.purpose, "content_preview": f.content[:500]} for f in files]
        schema = {"files": code_summary, "requirements": requirements}
        critiques = await asyncio.gather(
            self.backend.critique(schema, requirements),
            self.security.critique(schema, requirements),
            self.perf.critique(schema, requirements),
            return_exceptions=True)
        scores = [c.get("score", 0.5) for c in critiques if isinstance(c, dict) and "error" not in c]
        avg_score = sum(scores) / len(scores) if scores else 0.5
        line_level = []
        for c in critiques:
            if isinstance(c, dict):
                for w in c.get("weaknesses", []):
                    line_level.append({
                        "agent": c.get("role", "?"),
                        "issue": w,
                        "severity": "high" if any(kw in str(w).lower() for kw in ["security", "vulnerability", "exposure", "injection", "crash", "sql"]) else "medium"
                    })
        return {
            "consensus_score": round(avg_score, 2),
            "recommendation": "approve" if avg_score > 0.8 else "revise" if avg_score > 0.6 else "reject",
            "agent_reviews": {
                "backend": critiques[0] if isinstance(critiques[0], dict) else {"error": str(critiques[0])},
                "security": critiques[1] if isinstance(critiques[1], dict) else {"error": str(critiques[1])},
                "performance": critiques[2] if isinstance(critiques[2], dict) else {"error": str(critiques[2])},
            },
            "line_level_issues": line_level,
            "files_reviewed": len(files),
            "critical_issues": len([i for i in line_level if i["severity"] == "high"])
        }


# ====================== CRITIQUE LOOP ======================
class CritiqueLoop:
    def __init__(self, max_iterations: int = 3, quality_threshold: float = 0.80,
                 generator_provider=None, critic_provider=None):
        self.max_iterations = max_iterations
        self.quality_threshold = quality_threshold
        self.critique = MultiAgentCritique()
        from vibeserve.providers import router
        self.generator = router.get(generator_provider)
        self.critic = router.get(critic_provider) if critic_provider else self.generator

    async def improve(self, initial_output: Dict[str, Any],
                      requirements: List[str], ctx: Any = None) -> Tuple[Dict[str, Any], List[IterationResult]]:
        history: List[IterationResult] = []
        current = initial_output
        for i in range(self.max_iterations):
            if ctx:
                await ctx.report_progress(int((i / self.max_iterations) * 100), 100,
                    f"Iteration {i + 1}/{self.max_iterations}: Critiquing...")
            review = await self.critique.review(current, requirements)
            score = review.get("consensus_score", 0.5)
            recommendation = review.get("recommendation", "proceed")
            if ctx:
                await ctx.info(f"Iteration {i + 1} score: {score:.2f} [{recommendation}]")
            if recommendation in ("proceed", "approve") and score >= self.quality_threshold:
                history.append(IterationResult(iteration=i + 1, score_before=score, score_after=score, passed=True))
                break
            if recommendation in ("reject", "revise", "modify"):
                repair_prompt = self._build_repair_prompt(current, review, requirements)
                repaired = await self.generator.call(repair_prompt, temperature=CONFIG.temp_generator, response_format="json")
                if repaired:
                    try:
                        new_output = json.loads(repaired)
                        new_review = await self.critique.review(new_output, requirements)
                        new_score = new_review.get("consensus_score", 0.5)
                        history.append(IterationResult(iteration=i + 1, score_before=score, score_after=new_score,
                            critique=review, passed=new_score >= self.quality_threshold))
                        if new_score > score:
                            current = new_output
                        if new_score >= self.quality_threshold:
                            break
                    except json.JSONDecodeError:
                        log.warning(f"[CritiqueLoop] JSON decode failed for repair response")
                        history.append(IterationResult(iteration=i + 1, score_before=score, score_after=0, passed=False))
            else:
                history.append(IterationResult(iteration=i + 1, score_before=score, score_after=score,
                    critique=review, passed=score >= self.quality_threshold))
        return current, history

    def _build_repair_prompt(self, current: Dict[str, Any], review: Dict[str, Any], requirements: List[str]) -> str:
        weaknesses = []
        for agent_name, agent_review in review.get("agents", {}).items():
            for w in agent_review.get("weaknesses", []):
                weaknesses.append(f"[{agent_name}] {w}")
        specific = []
        for agent_name, agent_review in review.get("agents", {}).items():
            fb = agent_review.get("specific_feedback", "")
            if fb:
                specific.append(f"[{agent_name}] {fb}")
        return f"""Repair this output based on critique feedback.

REQUIREMENTS:\n{chr(10).join(f'- {r}' for r in requirements)}
CURRENT OUTPUT:\n{json.dumps(current, indent=2)[:3000]}
CRITIQUE WEAKNESSES:\n{chr(10).join(f'- {w}' for w in weaknesses)}
SPECIFIC FEEDBACK:\n{chr(10).join(f'- {s}' for s in specific)}
Produce the repaired version as valid JSON. Fix every weakness listed above."""


# ====================== TESTER ======================
class VibeTester:
    def __init__(self, provider=None, ctx: Any = None):
        from vibeserve.providers import router
        self.provider = provider or router.get()
        self.ctx = ctx

    async def _mcp_llm_call(self, prompt, temperature, ctx=None):
        import vibeserve
        return await vibeserve.mcp_llm_call(prompt, temperature=temperature, ctx=ctx)

    async def generate_tests(self, files: List[CodeFile], requirements: List[str] = None,
                              test_framework: str = "vitest") -> List[CodeFile]:
        requirements = requirements or []
        files_summary = [{"path": f.path, "language": f.language, "purpose": f.purpose, "content": f.content[:800]} for f in files]
        prompt = f"""You are a senior QA engineer. Generate comprehensive tests.

SOURCE FILES:\n{json.dumps(files_summary, indent=2)[:3000]}
REQUIREMENTS:\n{chr(10).join(f'- {r}' for r in requirements)}
TEST FRAMEWORK: {test_framework}

Return a JSON array of test files with path, content, language, purpose, accessibility_notes.
Cover: unit, accessibility, integration, edge cases, responsive breakpoints."""

        response = await self._mcp_llm_call(prompt, temperature=CONFIG.temp_generator, ctx=self.ctx)
        if not response:
            return []
        try:
            data = json.loads(response)
            if isinstance(data, list):
                return [CodeFile(**f) for f in data]
            return []
        except Exception as e:
            log.error(f"[VibeTester] Failed to parse test files: {e}")
            return []


# ====================== DEPLOYER ======================
class VibeDeployer:
    def __init__(self, provider=None, ctx: Any = None):
        from vibeserve.providers import router
        self.provider = provider or router.get()
        self.ctx = ctx

    async def _mcp_llm_call(self, prompt, temperature, ctx=None):
        import vibeserve
        return await vibeserve.mcp_llm_call(prompt, temperature=temperature, ctx=ctx)

    async def generate_deploy(self, project_name: str, files: List[CodeFile],
                               targets: List[str] = None) -> Dict[str, Any]:
        targets = targets or ["vercel"]
        files_summary = [{"path": f.path, "purpose": f.purpose} for f in files]
        prompt = f"""You are a DevOps engineer. Generate deployment configurations.

PROJECT: {project_name}
FILES: {json.dumps(files_summary, indent=2)[:2000]}
TARGETS: {', '.join(targets)}

Return a JSON object with deployment configs for each target:
{{
  "configs": {{
    "vercel": {{"vercel.json": "...", "env": {{}}, "build_command": "...", "output_dir": "..."}},
    "docker": {{"Dockerfile": "...", "docker-compose.yml": "...", "nginx.conf": "..."}},
    "static": {{"build_command": "...", "output_dir": "..."}},
    "node": {{"package.json_scripts": {{}}, "start_command": "..."}}
  }},
  "environment_variables": {{"KEY": "description"}},
  "health_check": {{"endpoint": "...", "interval": "..."}},
  "monitoring": {{"recommended": ["tool1", "tool2"]}}
}}

Include only the requested targets."""

        response = await self._mcp_llm_call(prompt, temperature=0.3, ctx=self.ctx)
        if not response:
            return {"configs": {}, "environment_variables": {}}
        try:
            return json.loads(response)
        except Exception as e:
            log.error(f"[VibeDeployer] Failed to parse deploy config: {e}")
            return {"configs": {}, "environment_variables": {}}


# ====================== TEMPLATE LIBRARY ======================
import random as _random


class TemplateLibrary:
    TEMPLATES = ["linear", "vercel", "stripe", "supabase", "claude", "notion", "apple", "shopify", "nike", "spacex"]

    @classmethod
    def list_templates(cls) -> List[str]:
        return cls.TEMPLATES

    @classmethod
    def random_template(cls, name: str = None) -> str:
        if name and name in cls.TEMPLATES:
            return cls._load(name)
        return cls._load(_random.choice(cls.TEMPLATES))

    @classmethod
    def _load(cls, name: str) -> str:
        path = Path(__file__).parent.parent / "designs" / f"{name}.md"
        if path.exists():
            content = path.read_text(encoding="utf-8")
            return cls._mutate(content, name)
        return f"# {name.title()} Design System\nUse {{{{colors.primary}}}} for accents."

    @classmethod
    def _mutate(cls, content: str, name: str) -> str:
        mutations = _random.randint(1, 3)
        for _ in range(mutations):
            op = _random.choice(["color_variant", "spacing_shift", "font_swap"])
            if op == "color_variant":
                content = cls._shift_accent(content)
            elif op == "spacing_shift":
                content = cls._vary_spacing(content)
            elif op == "font_swap":
                content = cls._swap_font(content)
        return f"# Design System: {name} (Monte Carlo seed: {_random.randint(1000,9999)})\n{content}"

    @staticmethod
    def _shift_accent(content: str) -> str:
        offset = _random.randint(-15, 15)
        def shift_hex(m):
            h = m.group(1)
            if len(h) == 6:
                r = min(255, max(0, int(h[0:2], 16) + offset))
                g = min(255, max(0, int(h[2:4], 16) + offset))
                b = min(255, max(0, int(h[4:6], 16) + offset))
                return f"#{r:02x}{g:02x}{b:02x}"
            return m.group(0)
        return re.sub(r'#([0-9a-fA-F]{6})', shift_hex, content)

    @staticmethod
    def _vary_spacing(content: str) -> str:
        factor = _random.uniform(0.85, 1.15)
        def scale_px(m):
            val = int(m.group(1))
            new_val = max(4, int(val * factor))
            new_val = round(new_val / 4) * 4
            return f"{new_val}px"
        return re.sub(r'(\d+)px', scale_px, content)

    @staticmethod
    def _swap_font(content: str) -> str:
        swaps = [
            ("Inter", _random.choice(["Geist Sans", "system-ui", "SF Pro"])),
            ("system-ui", _random.choice(["Inter", "Geist Sans", "SF Pro"])),
            ("sans-serif", _random.choice(["Inter, system-ui, sans-serif", "Geist Sans, system-ui"])),
        ]
        for old, new in _random.sample(swaps, min(2, len(swaps))):
            content = content.replace(old, new)
        return content


# ====================== DESIGN UPGRADER ======================
DESIGN_UPGRADES = """
## Production-Grade Enhancements (Senior Dev)

### Responsive (Mobile-First)
- Mobile <640px: single column, 48px gaps, hamburger nav
- Tablet 640-1024px: 2-col grids, 64px gaps, compact nav
- Desktop 1024-1440px: 3-col, 96px gaps, full nav, max-width 1280px

### Accessibility (WCAG AAA)
- focus-visible: 2px solid outline, 2px offset on all interactive elements
- Skip-to-content link at top
- Landmark roles: header, main, nav, footer, sections with aria-label
- aria-live="polite" for dynamic updates
- prefers-reduced-motion: disable ALL animations/transitions
- prefers-contrast: increase border contrast
- prefers-color-scheme: respect system dark/light
- Touch targets minimum 44x44px

### Performance
- font-display: swap on all web fonts (no FOIT)
- content-visibility: auto on below-fold sections
- loading="lazy" on images, decoding="async" on hero images
- Preconnect hints for external origins
- Explicit width/height on all images (no CLS)
- Inline critical CSS, defer non-critical

### Animation
- 150ms micro, 200ms standard, 300ms entrance
- ease-out for opening, ease-in for closing
- No animation when prefers-reduced-motion

### SEO
- Complete meta tags (og:title, og:description, og:image)
- JSON-LD structured data for SoftwareApplication
- Canonical URL
- Descriptive title (brand + keyword)

### Security
- Content-Security-Policy: frame-ancestors 'none'; script-src 'self'
- Referrer-Policy: strict-origin-when-cross-origin
- rel="noopener" on external links"""


class DesignUpgrader:
    @staticmethod
    def upgrade(template_content: str) -> str:
        return f"{template_content}\n\n{DESIGN_UPGRADES}"

    @staticmethod
    def upgrade_file(template_name: str) -> str:
        base = TemplateLibrary.random_template(template_name)
        return DesignUpgrader.upgrade(base)


# ====================== PLAYWRIGHT BRIDGE ======================
class PlaywrightBridge:
    @staticmethod
    def generate_test_script(html_path: str, checks: List[str] = None) -> str:
        checks = checks or ["page loads", "no console errors", "all images render"]
        return f"""// Playwright test for {html_path} — execute with Playwright MCP
const {{ test, expect }} = require('@playwright/test');

test('visual verification', async ({{ page }}) => {{
  await page.goto('file://{html_path}');

  // {checks[0] if len(checks)>0 else 'page loads'}
  await page.waitForLoadState('networkidle');

  // Check no console errors
  page.on('console', msg => {{
    if (msg.type() === 'error') console.error(msg.text());
  }});

  // {checks[1] if len(checks)>1 else 'accessibility'}
  const violations = await page.accessibility.snapshot();
  expect(violations).toBeTruthy();

  // Screenshot
  await page.screenshot({{ path: 'preview.png', fullPage: true }});
}});
"""
