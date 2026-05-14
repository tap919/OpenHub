"""VibeServe entry point. Builds the MCP server and registers all tools."""

from __future__ import annotations
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from vibeserve.models import CodeFile, ArchitectureDecision, VibePlan
from vibeserve.core import (
    CONFIG, DEFAULT_DESIGN_SYSTEM, memory_store, cache_manager,
    store_successful_spec, get_similar_specs,
    SchemaValidator, SpecGenerator, MultiAgentCritique,
    VibeArchitect, VibeImplementer, VibeVerifier, VibeCodeReviewer,
    SystemAuditor, CritiqueLoop, VibeTester, VibeDeployer,
    TemplateLibrary, DesignUpgrader,
)
from vibeserve.utils import (
    TOON, Graphify, SentryTracker, Context7Provider,
    SupabaseConnector, VercelConnector, GitHubConnector,
    CloudflareConnector, GoogleConnector, EditorBridge,
    contrast_ratio,
)
from vibeserve.core import PlaywrightBridge

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("VibeServe")


# ====================== LAZY MCP SERVER ======================
class _LazyMCP:
    _tools: list = []
    _resources: list = []
    _prompts: list = []
    _name: str = ""

    @classmethod
    def init(cls, name: str) -> None:
        cls._name = name

    @classmethod
    def tool(cls, name: Optional[str] = None, description: Optional[str] = None):
        def decorator(func):
            cls._tools.append((name, description, func))
            return func
        return decorator

    @classmethod
    def resource(cls, uri: str):
        def decorator(func):
            cls._resources.append((uri, func))
            return func
        return decorator

    @classmethod
    def prompt(cls):
        def decorator(func):
            cls._prompts.append(func)
            return func
        return decorator

    @classmethod
    def build(cls):
        from fastmcp import FastMCP
        server = FastMCP(cls._name)
        for name, desc, func in cls._tools:
            kwargs = {}
            if name:
                kwargs["name"] = name
            if desc:
                kwargs["description"] = desc
            server.tool(**kwargs)(func)
        for uri, func in cls._resources:
            server.resource(uri)(func)
        for func in cls._prompts:
            server.prompt()(func)
        return server


mcp_server = _LazyMCP
_LazyMCP.init("VibeServe")


# ====================== CONTENT GUIDELINES ======================
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


def _clip(d, keys):
    return {k: v for k, v in d.items() if not k.startswith("_")}


# ====================== RESOURCES ======================
@mcp_server.resource("design://systems/default")
def resource_default_design_system() -> str:
    return json.dumps(DEFAULT_DESIGN_SYSTEM, indent=2)


@mcp_server.resource("design://tokens/{token_type}")
def resource_design_tokens(token_type: str) -> str:
    tokens = DEFAULT_DESIGN_SYSTEM.get("tokens", {})
    return json.dumps(tokens.get(token_type, {"error": f"Unknown: {token_type}", "available": list(tokens.keys())}), indent=2)


@mcp_server.resource("memory://stats")
def resource_memory_stats() -> str:
    return json.dumps(memory_store.stats(), indent=2)


@mcp_server.resource("aether://version")
def resource_version() -> str:
    return json.dumps({
        "version": "1.0.0", "codename": "VibeServe",
        "tools": 17, "resources": 5, "prompts": 6,
        "providers": ["openai", "deepseek", "openrouter", "local", "opencode"],
        "pipeline": ["architect->code->review->verify->iterate->test->deploy"]
    }, indent=2)


@mcp_server.resource("spec://examples/{page_type}")
def resource_spec_example(page_type: str) -> str:
    specs = get_similar_specs(page_type, limit=1)
    return json.dumps(specs[0]["spec"] if specs else {"error": f"No specs for {page_type}"}, indent=2)


# ====================== PROMPTS ======================
@mcp_server.prompt()
def prompt_architecture(intent: str = "", constraints: str = "") -> str:
    return f"""Architecture plan for: {intent}\nConstraints: {constraints}\n\nContent rules: no fake testimonials, no SaaS CTAs, relative asset paths, WCAG AAA. Use vibe_architect."""


@mcp_server.prompt()
def prompt_code_review(files: str = "", requirements: str = "") -> str:
    return f"""Review code from UX/Engineering/Accessibility perspectives.\nFiles: {files}\nRequirements: {requirements}\n\nUse vibe_review for 3-agent analysis."""


@mcp_server.prompt()
def prompt_vibe_build(intent: str = "") -> str:
    return f"""Full pipeline: architect -> code -> review -> verify -> iterate\nIntent: {intent}\n\nCRITICAL: Zero fabrication. No fake stats, no SaaS copy. Show actual product features."""


@mcp_server.prompt()
def prompt_accessibility_audit() -> str:
    return "Audit for WCAG AAA: ARIA roles, keyboard nav, contrast ratios (7:1), touch targets (44px), semantic HTML, form labels."


@mcp_server.prompt()
def prompt_test_generation(code: str = "") -> str:
    return f"Generate unit, accessibility, integration, edge case, and responsive tests.\nCode: {code}"


@mcp_server.prompt()
def prompt_deployment(target: str = "vercel") -> str:
    return f"Generate deployment config for {target}: build, env, runtime, health checks, monitoring."


# ====================== V4 TOOLS ======================
@mcp_server.tool(name="generate_ui_spec", description="Generate a production-ready UI specification with multi-agent critique, WCAG AAA validation, and design system enforcement")
async def generate_ui_spec_tool(ctx, page_type: str = "", requirements: List[str] = [],
    design_system: Optional[Dict[str, Any]] = None, target_audience: str = "general users", use_cache: bool = True) -> Dict[str, Any]:
    if ctx is None or isinstance(ctx, dict):
        class MockCtx:
            async def info(self, msg): log.info(msg)
            async def report_progress(self, current, total, msg): log.info(f"[{current}/{total}] {msg}")
        ctx = MockCtx()
    try:
        import hashlib
        ds = design_system or DEFAULT_DESIGN_SYSTEM
        ds_id = hashlib.sha256(json.dumps(ds, sort_keys=True).encode()).hexdigest()[:20]
        if use_cache:
            ck = cache_manager.get_cache_key(page_type, requirements, ds_id)
            cr = cache_manager.get(ck)
            if cr:
                await ctx.info(f"[cache] Hit for {page_type}")
                return {**cr, "_cache_hit": True}
        else:
            ck = None
        await ctx.info(f"[generate] {page_type}")
        await ctx.report_progress(10, 100, "Validating...")
        gen = SpecGenerator(ds)
        await ctx.report_progress(15, 100, "Generating variants...")
        gen.ctx = ctx
        result = await gen.generate_with_critique([*requirements, f"Target: {target_audience}", "WCAG AAA mandatory"], iterations=1)
        if not result:
            return {"error": "Failed", "status": "error"}
        await ctx.report_progress(85, 100, "Storing...")
        sel = result.get("selected", {})
        score = sel.get("_score", 0)
        if score > CONFIG.min_score_to_store:
            store_successful_spec(page_type, sel, score)
        output = {
            "status": "success", "page_type": page_type,
            "selected_specification": _clip(sel),
            "alternatives": [_clip(alt) for alt in result.get("alternatives", [])],
            "metadata": {**result.get("generation_metadata", {}), "design_system_id": ds_id, "target_audience": target_audience},
            "critique": sel.get("_critique", {})
        }
        if use_cache and ck:
            cache_manager.set(ck, output)
        await ctx.report_progress(100, 100, "Complete!")
        await ctx.info(f"[generate] Score: {score}")
        return output
    except Exception as e:
        log.error(f"Error: {e}", exc_info=True)
        return {"status": "error", "error": str(e)}


@mcp_server.tool(name="validate_ui_spec", description="Validate a UI specification against design system and WCAG standards")
async def validate_ui_spec_tool(ctx, specification: Dict[str, Any] = {}) -> Dict[str, Any]:
    await ctx.info("[validate] Checking...")
    valid, errors = SchemaValidator().validate_schema(specification)
    warnings = []
    if valid and specification.get("components"):
        ds = specification.get("design_system", {})
        bg = ds.get("tokens", {}).get("colors", {}).get("background", {}).get("hex", "#FFF")
        for c in specification.get("components", []):
            cr_key = c.get("visual", {}).get("color_role")
            if cr_key:
                cd = ds.get("tokens", {}).get("colors", {}).get(cr_key, {})
                ratio = contrast_ratio(cd.get("hex", "#000"), bg)
                if ratio < 4.5:
                    warnings.append(f"Component '{c.get('label')}' low contrast ({ratio:.1f}:1)")
    return {"valid": valid, "error_count": len(errors), "errors": errors[:10], "warnings": warnings}


@mcp_server.tool(name="list_design_systems", description="List available design systems and their characteristics")
async def list_design_systems_tool(ctx) -> Dict[str, Any]:
    return {
        "available_systems": [{
            "id": "default_grok", "name": "Grok Neon Dark",
            "colors": list(DEFAULT_DESIGN_SYSTEM["tokens"]["colors"].keys()),
            "component_count": len(DEFAULT_DESIGN_SYSTEM["constraints"]["allowed_components"]),
            "wcag_level": "AAA"
        }],
        "custom_systems": [{"id": f.stem, "path": str(f)} for f in CONFIG.memory_dir.glob("*_system.json")] if CONFIG.memory_dir.exists() else []
    }


@mcp_server.tool(name="memory_stats", description="Get statistics on learned/stored UI specifications")
async def memory_stats_tool(ctx) -> Dict[str, Any]:
    await ctx.info("[memory] Gathering stats...")
    stats = memory_store.stats()
    return stats


# ====================== V5 CORE TOOLS ======================
@mcp_server.tool(name="vibe_architect", description="Transform natural language intent into a detailed architecture plan with ADR decisions, component tree, data flow, and risk assessment.")
async def vibe_architect_tool(ctx, intent: str, constraints: Optional[List[str]] = None,
                               context: Optional[Dict[str, Any]] = None, target_stack: str = "react") -> Dict[str, Any]:
    await ctx.info(f"[architect] {intent[:80]}...")
    await ctx.report_progress(0, 100, "Analyzing intent...")
    architect = VibeArchitect(ctx=ctx)
    await ctx.report_progress(30, 100, "Generating decisions...")
    plan = await architect.plan(intent, constraints, context, target_stack)
    await ctx.report_progress(100, 100, "Complete!")
    return {
        "status": "success",
        "plan": {
            "intent": plan.intent,
            "decisions": [d.__dict__ for d in plan.decisions],
            "component_tree": plan.component_tree,
            "data_flow": plan.data_flow,
            "file_structure": plan.file_structure,
            "estimated_complexity": plan.estimated_complexity,
            "risks": plan.risks,
            "recommended_stack": plan.recommended_stack
        },
        "decision_count": len(plan.decisions),
        "risk_count": len(plan.risks)
    }


@mcp_server.tool(name="vibe_code", description="Generate production code from an architecture plan. Enforces accessibility (ARIA, WCAG) and design tokens.")
async def vibe_code_tool(ctx, intent: str, plan: Dict[str, Any], constraints: Optional[List[str]] = None,
                          design_system: Optional[Dict[str, Any]] = None, target_language: str = "typescript") -> Dict[str, Any]:
    await ctx.info(f"[code] {intent[:80]}...")
    await ctx.report_progress(0, 100, "Parsing plan...")
    decisions = [ArchitectureDecision(**d) for d in plan.get("decisions", [])]
    vibe_plan = VibePlan(intent=intent, decisions=decisions,
        component_tree=plan.get("component_tree", []), data_flow=plan.get("data_flow", {}),
        file_structure=plan.get("file_structure", []), estimated_complexity=plan.get("estimated_complexity", "medium"),
        risks=plan.get("risks", []), recommended_stack=plan.get("recommended_stack", {}))
    await ctx.report_progress(20, 100, "Generating code...")
    implementer = VibeImplementer(design_system=design_system, ctx=ctx)
    files = await implementer.implement(vibe_plan, intent, constraints, target_language)
    await ctx.report_progress(90, 100, "Quality checks...")
    quality = VibeVerifier.verify_code_quality(files)
    await ctx.report_progress(100, 100, "Complete!")
    return {"status": "success", "files": [f.__dict__ for f in files], "file_count": len(files),
            "quality": quality, "total_lines": sum(len(f.content.split("\n")) for f in files)}


@mcp_server.tool(name="vibe_review", description="Multi-agent code review from three perspectives: UX/design, code quality, and accessibility.")
async def vibe_review_tool(ctx, files: List[Dict[str, Any]], requirements: List[str]) -> Dict[str, Any]:
    await ctx.info(f"[review] {len(files)} files...")
    await ctx.report_progress(0, 100, "Initializing reviewers...")
    code_files = [CodeFile(**f) for f in files]
    reviewer = VibeCodeReviewer()
    await ctx.report_progress(30, 100, "Running parallel reviews...")
    result = await reviewer.review_code(code_files, requirements)
    await ctx.report_progress(100, 100, "Complete!")
    return {"status": "success", **result}


@mcp_server.tool(name="vibe_verify", description="Validate code/specs against accessibility (WCAG), design system compliance, and code quality standards.")
async def vibe_verify_tool(ctx, specification: Optional[Dict[str, Any]] = None,
                            files: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    await ctx.info("[verify] Running checks...")
    results = {}
    if specification:
        await ctx.report_progress(30, 100, "Validating spec...")
        results["spec_validation"] = VibeVerifier.verify_spec(specification)
    if files:
        await ctx.report_progress(60, 100, "Checking code quality...")
        results["code_quality"] = VibeVerifier.verify_code_quality([CodeFile(**f) for f in files])
    await ctx.report_progress(100, 100, "Complete!")
    return {"status": "success", "results": results, "all_passed": all(r.get("valid", r.get("passed", True)) for r in results.values())}


@mcp_server.tool(name="vibe_iterate", description="Run the continuous improvement loop: critique -> repair -> verify -> repeat.")
async def vibe_iterate_tool(ctx, specification: Dict[str, Any], requirements: List[str],
                             max_iterations: int = 3, quality_threshold: float = 0.80) -> Dict[str, Any]:
    await ctx.info(f"[iterate] max {max_iterations} iterations, threshold {quality_threshold}")
    loop = CritiqueLoop(max_iterations=max_iterations, quality_threshold=quality_threshold)
    best_output, history = await loop.improve(specification, requirements, ctx)
    final_score = history[-1].score_after if history else 0
    return {"status": "success", "final_output": best_output,
            "iterations": [h.__dict__ for h in history], "iterations_used": len(history),
            "final_score": final_score, "converged": history[-1].passed if history else False}


# ====================== EXTENDED TOOLS ======================
@mcp_server.tool(name="vibe_test", description="Generate comprehensive test files from source code. Covers unit, accessibility, integration, edge case, and responsive tests.")
async def vibe_test_tool(ctx, files: List[Dict[str, Any]], requirements: Optional[List[str]] = None,
                          test_framework: str = "vitest") -> Dict[str, Any]:
    await ctx.info(f"[test] Generating tests for {len(files)} files with {test_framework}...")
    code_files = [CodeFile(**f) for f in files]
    tester = VibeTester(ctx=ctx)
    await ctx.report_progress(30, 100, "Generating test cases...")
    test_files = await tester.generate_tests(code_files, requirements, test_framework)
    quality = VibeVerifier.verify_code_quality(test_files)
    return {"status": "success", "test_files": [f.__dict__ for f in test_files],
            "test_count": len(test_files), "quality": quality, "framework": test_framework}


@mcp_server.tool(name="vibe_deploy", description="Generate deployment configurations for Vercel, Docker, static hosting, and Node.js.")
async def vibe_deploy_tool(ctx, project_name: str, files: List[Dict[str, Any]],
                            targets: Optional[List[str]] = None) -> Dict[str, Any]:
    targets = targets or ["vercel"]
    code_files = [CodeFile(**f) for f in files]
    deployer = VibeDeployer(ctx=ctx)
    result = await deployer.generate_deploy(project_name, code_files, targets)
    return {"status": "success", "project": project_name, "targets": targets, **result}


# ====================== DESIGN TOOLS ======================
@mcp_server.tool(name="vibe_design", description="Generate a professional landing page using curated DESIGN.md templates. Monte Carlo randomization ensures every build is unique.")
async def vibe_design_tool(ctx, intent: str, template: Optional[str] = None,
                            constraints: Optional[List[str]] = None) -> Dict[str, Any]:
    constraints = constraints or ["WCAG AAA", "Single HTML file", "Zero fabrication"]
    design_tokens = TemplateLibrary.random_template(template)
    selected = template or "random"
    full_intent = f"""{intent}

USE THIS DESIGN SYSTEM EXACTLY:
{design_tokens}

CRITICAL: Apply the design system above. Use the exact colors, fonts, spacing, and component specs. No fabrication."""
    plan_result = await vibe_architect_tool(ctx=ctx, intent=full_intent, constraints=constraints, target_stack="html")
    code_constraints = list(constraints) + [f"DESIGN SYSTEM: {design_tokens}"]
    code_result = await vibe_code_tool(ctx=ctx, intent=intent, plan=plan_result.get("plan", {}),
                                        constraints=code_constraints, target_language="html")
    verify_result = await vibe_verify_tool(ctx=ctx, files=code_result.get("files", []))
    return {"status": "success", "template": selected, "design_system": design_tokens[:500],
            "plan": plan_result, "code": code_result, "verify": verify_result}


# ====================== PREVIEW ======================
@mcp_server.tool(name="vibe_preview", description="Generate a preview HTML page and Playwright test script for visual verification.")
async def vibe_preview_tool(ctx, html_content: str, filename: str = "preview.html") -> Dict[str, Any]:
    script = PlaywrightBridge.generate_test_script(filename)
    SentryTracker.track("preview_generated", {"filename": filename})
    return {"status": "success", "html_file": filename, "html_size": len(html_content),
            "playwright_test": script,
            "instructions": f"Save {filename} to disk, then run the playwright test with Playwright MCP to screenshot."}


# ====================== DOCS ======================
@mcp_server.tool(name="vibe_docs", description="Fetch up-to-date documentation for a framework or library via Context7.")
async def vibe_docs_tool(ctx, query: str, library: Optional[str] = None) -> Dict[str, Any]:
    docs = await Context7Provider.fetch_docs(query, library)
    SentryTracker.track("docs_fetched", {"query": query, "length": len(docs)})
    return {"status": "success", "query": query, "library": library or query, "docs": docs, "docs_length": len(docs)}


# ====================== HEALTH ======================
@mcp_server.tool(name="vibe_health", description="Get system health stats: tracked events, error count, provider status.")
async def vibe_health_tool(ctx) -> Dict[str, Any]:
    from vibeserve.providers import router
    errors = SentryTracker.errors()
    SentryTracker.flush()
    return {"status": "healthy", "providers_active": list(router.providers.keys()),
            "provider_count": len(router.providers), "recent_errors": len(errors),
            "memory_specs": memory_store.stats().get("total_stored_specs", 0)}


# ====================== AUDIT ======================
@mcp_server.tool(name="vibe_audit", description="Full system audit: backend code quality, security vulnerability scan, and performance review.")
async def vibe_audit_tool(ctx, files: List[Dict[str, Any]], requirements: Optional[List[str]] = None) -> Dict[str, Any]:
    requirements = requirements or ["Production-grade server", "No security vulnerabilities"]
    code_files = [CodeFile(**f) for f in files]
    auditor = SystemAuditor()
    result = await auditor.audit(code_files, requirements)
    return {"status": "success", **result}


# ====================== COMPRESS ======================
@mcp_server.tool(name="vibe_compress", description="Compress JSON output to TOON format — reduces token usage by 30-60%.")
async def vibe_compress_tool(ctx, data: Dict[str, Any]) -> Dict[str, Any]:
    original = json.dumps(data)
    compressed = TOON.compress_json(data)
    savings = TOON.savings(original, compressed)
    return {"status": "success", "compressed": compressed, "savings": savings}


# ====================== BENCHMARK ======================
@mcp_server.tool(name="vibe_benchmark", description="Run a benchmarking loop with ASCII graphs.")
async def vibe_benchmark_tool(ctx, iterations: int = 5) -> Dict[str, Any]:
    results = []
    scores = []
    for i in range(iterations):
        await ctx.report_progress(int((i / iterations) * 100), 100, f"Loop {i+1}/{iterations}")
        t0 = __import__('time').time()
        with open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'vibeserve.py'), encoding="utf-8") as f:
            code = f.read()
        mock = [{"path": "vibeserve.py", "content": code[:8000], "language": "python", "purpose": "VibeServe MCP server"}]
        auditor = SystemAuditor()
        audit = await auditor.audit([CodeFile(**m) for m in mock], ["Production-grade MCP server"])
        elapsed = (__import__('time').time() - t0) * 1000
        score = audit["consensus_score"]
        scores.append(score)
        results.append({"iteration": i + 1, "score": score, "recommendation": audit["recommendation"],
                        "issues": len(audit.get("line_level_issues", [])), "critical": audit.get("critical_issues", 0), "time_ms": round(elapsed)})
    dashboard = Graphify.benchmark_summary(results)
    return {"status": "success", "iterations": results, "dashboard": dashboard,
            "avg_score": round(sum(scores) / len(scores), 2), "best_score": max(scores), "worst_score": min(scores),
            "trend": "improving" if scores[-1] > scores[0] else "declining" if scores[-1] < scores[0] else "stable"}


# ====================== DESIGN UPGRADE ======================
@mcp_server.tool(name="vibe_upgrade_design", description="Upgrade a design template with senior-dev production patterns.")
async def vibe_upgrade_design_tool(ctx, template: Optional[str] = None) -> Dict[str, Any]:
    name = template or "random"
    upgraded = DesignUpgrader.upgrade_file(name)
    return {"status": "success", "template": name, "upgraded_design": upgraded, "enhancements": [
        "Responsive breakpoints (mobile-first)", "WCAG AAA", "Performance optimizations",
        "Animation tokens", "SEO meta tags", "Security headers"
    ]}


# ====================== PRO BUILD ======================
@mcp_server.tool(name="vibe_build_pro", description="Full professional build: upgrade design -> architect -> code -> verify.")
async def vibe_build_pro_tool(ctx, intent: str, template: Optional[str] = None,
                               constraints: Optional[List[str]] = None) -> Dict[str, Any]:
    constraints = constraints or ["WCAG AAA", "Single HTML", "Zero fabrication", "Responsive mobile-first"]
    upgraded = DesignUpgrader.upgrade_file(template or "supabase")
    full_intent = f"""{intent}
USE THIS UPGRADED DESIGN SYSTEM:
{upgraded}
CRITICAL: Apply ALL production patterns above. No fabrication. Production-grade."""
    plan = await vibe_architect_tool(ctx=ctx, intent=full_intent, constraints=constraints, target_stack="html")
    code = await vibe_code_tool(ctx=ctx, intent=intent, plan=plan.get("plan", {}),
                                 constraints=constraints + [f"DESIGN SYSTEM: {upgraded}"], target_language="html")
    verify = await vibe_verify_tool(ctx=ctx, files=code.get("files", []))
    return {"status": "success", "template": template or "random", "upgrades_applied": 6,
            "plan": plan, "code": code, "verify": verify}


# ====================== INTEGRATION TOOLS ======================
@mcp_server.tool(name="supabase_query", description="Query a Supabase table. Set SUPABASE_URL + SUPABASE_KEY env vars.")
async def supabase_query_tool(ctx, table: str, select: str = "*", filters: Optional[Dict[str, Any]] = None, limit: int = 10) -> Dict[str, Any]:
    return await SupabaseConnector.query(table, select, filters, limit)


@mcp_server.tool(name="supabase_insert", description="Insert a row into a Supabase table.")
async def supabase_insert_tool(ctx, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return await SupabaseConnector.insert(table, data)


@mcp_server.tool(name="vercel_deployments", description="List recent Vercel deployments. Set VERCEL_TOKEN env var.")
async def vercel_deployments_tool(ctx, limit: int = 5) -> Dict[str, Any]:
    return await VercelConnector.list_deployments(limit)


@mcp_server.tool(name="github_repo", description="Get GitHub repo info. Set GITHUB_TOKEN env var.")
async def github_repo_tool(ctx, owner: str, repo: str) -> Dict[str, Any]:
    return await GitHubConnector.get_repo(owner, repo)


@mcp_server.tool(name="github_issues", description="List GitHub issues. Set GITHUB_TOKEN env var.")
async def github_issues_tool(ctx, owner: str, repo: str, state: str = "open") -> Dict[str, Any]:
    return await GitHubConnector.list_issues(owner, repo, state)


@mcp_server.tool(name="cloudflare_dns", description="List Cloudflare DNS records. Set CLOUDFLARE_TOKEN + CLOUDFLARE_ZONE.")
async def cloudflare_dns_tool(ctx) -> Dict[str, Any]:
    return await CloudflareConnector.list_dns()


@mcp_server.tool(name="google_sheets", description="Read from a Google Sheet. Set GOOGLE_API_KEY env var.")
async def google_sheets_tool(ctx, spreadsheet_id: str, range_: str = "A1:Z100") -> Dict[str, Any]:
    return await GoogleConnector.sheets_read(spreadsheet_id, range_)


@mcp_server.tool(name="editor_config", description="Generate editor config files (VSCode tasks, Zed workspace, Cursor rules).")
async def editor_config_tool(ctx, editor: str = "vscode", project_name: str = "vibeserve") -> Dict[str, Any]:
    if editor == "vscode":
        config = {"tasks": EditorBridge.vscode_task_json("VibeServe: Run Server", "vibeserve"),
                  "settings": EditorBridge.vscode_settings_json(), "extensions": EditorBridge.vscode_extensions_json()}
    elif editor == "zed":
        config = json.loads(EditorBridge.zed_workspace_config(project_name))
    elif editor == "all":
        result = EditorBridge.write_all_configs(project_name)
        return {"status": "success", "editor": "all", "config": result, "files_written": len(result["files"])}
    else:
        config = {"cursor_rules": EditorBridge.cursor_rules("mcp-server")}
    return {"status": "success", "editor": editor, "project": project_name, "config": config}


@mcp_server.tool(name="editor_write", description="Write editor config files to disk.")
async def editor_write_tool(ctx, project_name: str = "vibeserve") -> Dict[str, Any]:
    result = EditorBridge.write_all_configs(project_name)
    return {"status": "success", **result}


# ====================== EXECUTION TOOLS (for OpenHub Pipeline) ======================

import os
import subprocess
from pathlib import Path

_WORKSPACE_ROOT = Path(os.getenv("VIBESERVE_WORKSPACE", ".")).resolve()


@mcp_server.tool(name="check_node_env", description="Check if Node.js is available in the environment")
async def check_node_env_tool(ctx) -> Dict[str, Any]:
    await ctx.info("[exec] Checking Node.js environment...")
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return {"status": "success", "available": True, "version": version}
        return {"status": "success", "available": False, "error": result.stderr}
    except FileNotFoundError:
        return {"status": "success", "available": False, "error": "node not found in PATH"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@mcp_server.tool(name="detect_package_manager", description="Detect the package manager used in a project (npm, yarn, pnpm, bun)")
async def detect_package_manager_tool(ctx, path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[exec] Detecting package manager in {path}...")
    search_path = Path(path).resolve()

    managers = [
        ("pnpm", "pnpm-lock.yaml"),
        ("yarn", "yarn.lock"),
        ("bun", "bun.lockb"),
        ("npm", "package-lock.json"),
    ]

    for manager, lockfile in managers:
        if (search_path / lockfile).exists():
            return {"status": "success", "manager": manager, "lockfile": lockfile}

    if (search_path / "package.json").exists():
        return {"status": "success", "manager": "npm", "lockfile": None}

    return {"status": "success", "manager": None, "error": "No package.json found"}


@mcp_server.tool(name="run_install", description="Install dependencies using the detected package manager")
async def run_install_tool(ctx, manager: str = "npm", path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[exec] Running {manager} install in {path}...")
    work_dir = Path(path).resolve()

    try:
        result = subprocess.run(
            [manager, "install"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=300,
        )
        return {
            "status": "success" if result.returncode == 0 else "error",
            "returncode": result.returncode,
            "stdout": result.stdout[:2000] if result.stdout else "",
            "stderr": result.stderr[:2000] if result.stderr else "",
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Installation timed out after 5 minutes"}
    except FileNotFoundError:
        return {"status": "error", "message": f"{manager} not found in PATH"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@mcp_server.tool(name="run_biome", description="Run Biome linter and formatter")
async def run_biome_tool(ctx, path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[exec] Running Biome in {path}...")
    work_dir = Path(path).resolve()

    biome_bin = work_dir / "node_modules" / ".bin" / "biome"
    if not biome_bin.exists():
        return {"status": "error", "message": "Biome not installed. Run 'npm install @biomejs/biome' first."}

    try:
        result = subprocess.run(
            [str(biome_bin), "check", "--write", "."],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return {
            "status": "success" if result.returncode == 0 else "warning",
            "returncode": result.returncode,
            "output": result.stdout + result.stderr,
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Biome timed out"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@mcp_server.tool(name="run_tsc", description="Run TypeScript compiler (tsc) for type checking")
async def run_tsc_tool(ctx, path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[exec] Running TypeScript in {path}...")
    work_dir = Path(path).resolve()

    tsc_path = work_dir / "node_modules" / ".bin" / "tsc"
    if not tsc_path.exists():
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )
    else:
        result = subprocess.run(
            [str(tsc_path), "--noEmit"],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=120,
        )

    return {
        "status": "success" if result.returncode == 0 else "error",
        "returncode": result.returncode,
        "output": result.stdout + result.stderr,
    }


@mcp_server.tool(name="run_build", description="Run the project's build command")
async def run_build_tool(ctx, path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[exec] Running build in {path}...")
    work_dir = Path(path).resolve()

    package_json = work_dir / "package.json"
    if package_json.exists():
        with open(package_json) as f:
            pkg = json.load(f)
            build_script = pkg.get("scripts", {}).get("build")
            if build_script:
                parts = build_script.split()
                if parts:
                    cmd = parts[0]
                    args = parts[1:] if len(parts) > 1 else []
                    try:
                        result = subprocess.run(
                            [cmd] + args,
                            cwd=work_dir,
                            capture_output=True,
                            text=True,
                            timeout=180,
                        )
                        return {
                            "status": "success" if result.returncode == 0 else "error",
                            "returncode": result.returncode,
                            "stdout": result.stdout[:2000],
                            "stderr": result.stderr[:2000],
                        }
        return {"status": "error", "message": "No build script found in package.json"}

    return {"status": "error", "message": "No package.json found"}


@mcp_server.tool(name="ingest_learning", description="Store learning from pipeline execution for future improvements")
async def ingest_learning_tool(ctx, data: Dict[str, Any]) -> Dict[str, Any]:
    await ctx.info("[learn] Storing pipeline learning...")

    learning_dir = _WORKSPACE_ROOT / ".openhub" / "learnings"
    learning_dir.mkdir(parents=True, exist_ok=True)

    import time
    filename = f"learning_{int(time.time())}.json"
    filepath = learning_dir / filename

    try:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
        return {"status": "success", "saved_to": str(filepath)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ====================== DEMO FUNCTIONS ======================
async def demo():
    print("\n" + "=" * 70 + "\n[v4] VibeServe Legacy -- Direct Execution Demo\n" + "=" * 70)
    class MockCtx:
        async def info(self, msg): print(f"  [i] {msg}")
        async def report_progress(self, current, total, msg): print(f"  [{int(current/total*100):3d}%] {msg}")
    ctx = MockCtx()
    result = await generate_ui_spec_tool(ctx=ctx, page_type="product_dashboard",
        requirements=["SaaS dashboard", "KPI metrics", "Dark mode", "Mobile responsive"],
        design_system=None, target_audience="product managers", use_cache=False)
    print(json.dumps({"status": result.get("status"), "score": result.get("critique", {}).get("consensus_score"),
                      "components": len(result.get("selected_specification", {}).get("components", []))}, indent=2))


async def vibe_demo():
    print("\n" + "=" * 70 + "\n[v5] VibeServe Agentic Coding Demo\n" + "=" * 70)
    class MockCtx:
        async def info(self, msg): print(f"  [i] {msg}")
        async def report_progress(self, current, total, msg): print(f"  [{int(current/total*100):3d}%] {msg}")
    ctx = MockCtx()
    print("\n[Step 1] vibe_architect")
    plan_result = await vibe_architect_tool(ctx=ctx, intent="Build a SaaS analytics dashboard with KPI cards, charts, and dark mode",
        constraints=["WCAG AAA", "React + TypeScript", "Mobile responsive"], target_stack="react")
    if plan_result.get("status") == "success":
        print(f"  Plan: {plan_result['decision_count']} decisions, {plan_result['plan']['estimated_complexity']}")
    print("\n[Step 2] vibe_review")
    result = await vibe_review_tool(ctx=ctx, files=[{"path": "/src/KpiCard.tsx", "content": '<div role="region" aria-label="KPI">KPI</div>', "language": "tsx", "purpose": "KPI card"}], requirements=["Dark mode", "WCAG AAA"])
    if result.get("status") == "success":
        print(f"  Score: {result['consensus_score']}, {result['recommendation']}")


def main():
    import sys
    if "--vibe-demo" in sys.argv:
        asyncio.run(vibe_demo())
    elif "--demo" in sys.argv:
        asyncio.run(demo())
    elif "--interactive" in sys.argv:
        run_interactive()
    else:
        server = _LazyMCP.build()
        server.run()


# ====================== INTERACTIVE MODE ======================
def run_interactive():
    asyncio.run(_interactive_loop())


async def _interactive_loop():
    import sys, random
    print("\n" + "=" * 60 + "\n  VibeServe v1.3 — Interactive Mode\n  Type 'help' for commands | 'exit' to quit\n" + "=" * 60)

    class MockCtx:
        async def info(self, msg): print(f"  [i] {msg}")
        async def report_progress(self, current, total, msg):
            pct = int(current / max(1, total) * 100)
            bar = "#" * (pct // 5) + "-" * (20 - pct // 5)
            print(f"\r  [{bar}] {pct:3d}% {msg}", end="", flush=True)
            if pct >= 100: print()

    ctx = MockCtx()
    session = {"plan": None, "files": None, "last_intent": ""}

    def show_help():
        print("""\n  COMMANDS\n  architect <intent>     Generate architecture plan\n  code <intent>          Generate code from plan\n  design <intent>        Build landing page\n  review                 Run 3-agent code review\n  verify                 Validate spec/files\n  iterate                Improvement loop\n  test                   Generate tests\n  deploy <project>       Deployment configs\n  audit                  Security/perf audit\n  upgrade [tmpl]         Upgrade design template\n  pro <intent>           Full professional build\n  benchmark [N]          Self-benchmarking\n  health                 System health check\n  memory                 Show memory stats\n  providers              List LLM providers\n  session                Show session state\n  clear                  Reset session\n  help                   Show this help\n  exit                   Quit""")

    while True:
        try:
            raw = input("\n\033[1;36mvibeserve>\033[0m ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break
        if not raw: continue
        parts = raw.split(maxsplit=1)
        cmd = parts[0].lower()
        rest = parts[1] if len(parts) > 1 else ""
        try:
            if cmd in ("exit", "quit", "q"):
                print("Goodbye!"); break
            elif cmd in ("h", "help"):
                show_help()
            elif cmd == "architect":
                intent = rest or "A modern web application with dark mode"
                result = await vibe_architect_tool(ctx, intent)
                if result.get("status") == "success":
                    session["plan"] = result["plan"]; session["last_intent"] = intent
                    print(f"\n  \033[1;32m{result['decision_count']} decisions\033[0m, {result['plan']['estimated_complexity']} complexity")
                else:
                    print(f"\n  \033[1;31mFailed: {result.get('error', 'unknown')}\033[0m")
            elif cmd == "code":
                intent = rest or session.get("last_intent", "A web app")
                if not session.get("plan"):
                    arch = await vibe_architect_tool(ctx, intent)
                    if arch.get("status") == "success": session["plan"] = arch["plan"]
                    else: print("  Architect failed"); continue
                result = await vibe_code_tool(ctx, intent, session["plan"])
                if result.get("status") == "success":
                    session["files"] = result["files"]
                    print(f"\n  \033[1;32m{result['file_count']} files\033[0m, quality: {'PASS' if result['quality']['passed'] else 'ISSUES'}")
            elif cmd == "design":
                intent = rest or session.get("last_intent", "A landing page")
                tmpl = random.choice(TemplateLibrary.list_templates())
                print(f"  Template: \033[1;35m{tmpl}\033[0m")
                result = await vibe_design_tool(ctx, intent, tmpl)
                if result.get("status") == "success":
                    session["plan"] = result.get("plan", {}).get("plan", {})
                    session["files"] = result.get("code", {}).get("files", [])
            elif cmd == "review":
                if not session.get("files"): print("  No files in session."); continue
                result = await vibe_review_tool(ctx, session["files"], ["WCAG AAA", "Responsive"])
                score = result.get("consensus_score", 0)
                color = "\033[1;32m" if score > 0.8 else "\033[1;33m" if score > 0.6 else "\033[1;31m"
                print(f"\n  Score: {color}{score}\033[0m, {result.get('recommendation', '?')}")
            elif cmd == "verify":
                result = await vibe_verify_tool(ctx, session.get("plan"), session.get("files")[:3] if session.get("files") else None)
                print(f"\n  \033[1;32m{'ALL PASS' if result.get('all_passed') else 'ISSUES FOUND'}\033[0m")
            elif cmd == "iterate":
                if not session.get("plan"): print("  No spec in session."); continue
                result = await vibe_iterate_tool(ctx, session["plan"], ["WCAG AAA", "Responsive"])
                print(f"\n  Iterations: {result.get('iterations_used', 0)}, final score: {result.get('final_score', 0):.2f}")
            elif cmd == "test":
                if not session.get("files"): print("  No files in session."); continue
                result = await vibe_test_tool(ctx, session["files"])
                print(f"\n  \033[1;32m{result.get('test_count', 0)} test files\033[0m")
            elif cmd == "deploy":
                if not session.get("files"): print("  No files in session."); continue
                result = await vibe_deploy_tool(ctx, rest or "vibeserve-project", session["files"])
                print(f"\n  \033[1;32m{len(result.get('configs', {}))} configs\033[0m")
            elif cmd == "benchmark":
                n = int(rest) if rest.isdigit() else 3
                result = await vibe_benchmark_tool(ctx, n)
                print(f"\n  Avg: {result.get('avg_score', 0):.2f}, best: {result.get('best_score', 0):.2f}")
            elif cmd == "audit":
                p = Path(__file__).parent.parent / "vibeserve.py"
                if not p.exists():
                    # Fallback: use __main__.py
                    p = Path(__file__)
                with open(p, encoding="utf-8") as f:
                    source = f.read()
                mock = [{"path": p.name, "content": source[:8000], "language": "python", "purpose": "MCP server"}]
                result = await vibe_audit_tool(ctx, mock)
                score = result.get("consensus_score", 0)
                print(f"\n  Score: {score:.2f}, {result.get('recommendation', '?')}, {result.get('critical_issues', 0)} critical")
            elif cmd == "upgrade":
                result = await vibe_upgrade_design_tool(ctx)
                print(f"\n  Template: {result.get('template', '?')}")
                for e in result.get("enhancements", []): print(f"    + {e}")
            elif cmd == "pro":
                intent = rest or "A SaaS landing page"
                result = await vibe_build_pro_tool(ctx, intent)
                if result.get("status") == "success":
                    print(f"\n  \033[1;32m{result['code'].get('file_count', 0)} files\033[0m, verify: {'PASS' if result.get('verify', {}).get('all_passed') else 'ISSUES'}")
            elif cmd == "health":
                result = await vibe_health_tool(ctx)
                print(f"\n  Status: \033[1;32m{result.get('status', '?')}\033[0m")
                print(f"  Providers: {', '.join(result.get('providers_active', []))}")
            elif cmd == "memory":
                result = memory_store.stats()
                for pt, info in result.get("by_page_type", {}).items():
                    print(f"  \033[1;36m{pt}\033[0m: {info['count']} specs, best: {info['highest_score']:.2f}")
            elif cmd == "providers":
                from vibeserve.providers import router
                router._ensure_init()
                for name, prov in router.providers.items():
                    print(f"  \033[1;36m{name}\033[0m: {prov.name}")
            elif cmd == "session":
                print(f"  intent: {session.get('last_intent', '(none)')}")
                print(f"  plan decisions: {len(session.get('plan', {}).get('decisions', []))}")
                print(f"  files: {len(session.get('files', []))}")
            elif cmd == "clear":
                session = {"plan": None, "files": None, "last_intent": ""}
                print("  Session cleared.")
            else:
                print(f"  Unknown command: '{cmd}'. Type 'help'.")
        except Exception as e:
            print(f"  \033[1;31mError: {e}\033[0m")
            log.error(f"Interactive mode error: {e}", exc_info=True)


if __name__ == "__main__":
    main()
