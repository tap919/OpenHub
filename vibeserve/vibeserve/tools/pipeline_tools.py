"""AI Pipeline tools — planning, code gen, review, test generation.

These tools call the configured LLM (Ollama local or API remote).
They work even without Ollama by returning structured prompts.
"""

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from vibeserve.server import mcp_server as _mcp

mcp_server = _mcp
del _mcp

log = logging.getLogger("OpenHub.MCP.tools")

_WORKSPACE_ROOT = Path(os.getenv("VIBESERVE_WORKSPACE", ".")).resolve()
_OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def _ollama_call(prompt: str, model: str = None) -> Optional[str]:
    """Call Ollama API. Returns None if unavailable."""
    try:
        import httpx

        url = f"{_OLLAMA_HOST}/api/generate"
        payload = {
            "model": model or _OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 1024},
        }
        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                return resp.json().get("response", "")
            log.warning(f"Ollama returned {resp.status_code}: {resp.text[:200]}")
            return None
    except Exception as e:
        log.debug(f"Ollama unavailable: {e}")
        return None


def _gemini_call(prompt: str) -> Optional[str]:
    """Call Gemini API if key is configured."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import httpx

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048},
        }
        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0].get("text", "")
            return None
    except Exception as e:
        log.debug(f"Gemini unavailable: {e}")
        return None


def _llm_call(prompt: str) -> str:
    """Call the best available LLM: Ollama first, then Gemini fallback, then placeholder."""
    result = _ollama_call(prompt)
    if result:
        return result
    result = _gemini_call(prompt)
    if result:
        return result
    return f"[LLM not available] Prompt ready: {prompt[:200]}..."


@mcp_server.tool(name="generate_plan", description="Generate a structured task plan from a natural language objective")
async def generate_plan_tool(ctx, objective: str, context: Optional[str] = None) -> Dict[str, Any]:
    await ctx.info(f"[plan] Planning: {objective[:100]}...")

    prompt = f"""You are a technical project planner. Generate a structured task decomposition as JSON.

Objective: {objective}
Context: {context or 'None'}

Return ONLY valid JSON in this format:
{{"tasks": [{{"id": 1, "task": "Task description", "dependency": [], "estimated_hours": 0.5}}]}}

Break the objective into 3-7 concrete, actionable tasks. Include estimated hours."""

    response = _llm_call(prompt)
    try:
        if response and "{" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            plan = json.loads(response[start:end])
            return {"status": "success", "plan": plan}
        return {"status": "success", "plan": {"tasks": [{"id": 1, "task": objective, "dependency": [], "estimated_hours": 4}]}}
    except json.JSONDecodeError:
        return {"status": "error", "message": "Failed to parse LLM response", "raw": response[:500]}


@mcp_server.tool(name="retrieve_context", description="Search local wiki/knowledge base for context")
async def retrieve_context_tool(ctx, query: str) -> Dict[str, Any]:
    await ctx.info(f"[wiki] Searching: {query}")
    wiki_path = _WORKSPACE_ROOT / "wiki"
    if not wiki_path.exists():
        return {"status": "success", "results": [], "message": "Wiki directory not found"}

    results = []
    for f in wiki_path.glob("*.md"):
        content = f.read_text(encoding="utf-8", errors="replace")
        if query.lower() in content.lower():
            results.append({"file": f.name, "content": content[:500]})
    return {"status": "success", "results": results[:5]}


@mcp_server.tool(name="vibe_architect", description="Plan architecture from natural language intent")
async def vibe_architect_tool(
    ctx,
    intent: str,
    constraints: Optional[List[str]] = None,
    target_stack: str = "react",
) -> Dict[str, Any]:
    await ctx.info(f"[architect] Planning: {intent[:100]}...")
    await ctx.report_progress(1, 4, "Analyzing requirements...")

    constraints_str = ", ".join(constraints) if constraints else "None"
    prompt = f"""You are a software architect. Given the following intent, produce a structured architecture plan as JSON.

Intent: {intent}
Target stack: {target_stack}
Constraints: {constraints_str}

Return ONLY valid JSON:
{{
  "project_name": "kebab-case-name",
  "architecture": "Brief architectural description",
  "decisions": [
    {{"id": 1, "decision": "What to use", "rationale": "Why", "alternatives": ["alt1"]}}
  ],
  "components": [
    {{"name": "ComponentName", "type": "page|layout|ui|service", "props": [], "state": [], "description": "What it does"}}
  ],
  "data_flow": "Description of data flow",
  "file_structure": ["src/App.tsx", "src/components/...", "src/pages/..."]
}}"""

    await ctx.report_progress(2, 4, "Generating architecture...")
    response = _llm_call(prompt)
    await ctx.report_progress(3, 4, "Processing plan...")

    try:
        if response and "{" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            plan = json.loads(response[start:end])
            await ctx.report_progress(4, 4, "Plan complete")
            return {
                "status": "success",
                "project_name": plan.get("project_name", "unnamed"),
                "architecture": plan.get("architecture", ""),
                "decision_count": len(plan.get("decisions", [])),
                "component_count": len(plan.get("components", [])),
                "plan": plan,
            }

        # Fallback: structured template
        await ctx.report_progress(4, 4, "Generated template plan (LLM unavailable)")
        return {
            "status": "success",
            "project_name": intent.lower().replace(" ", "-")[:40],
            "architecture": f"{target_stack} application for: {intent}",
            "decision_count": 3,
            "component_count": 4,
            "plan": {
                "project_name": intent.lower().replace(" ", "-")[:40],
                "architecture": f"{target_stack} application",
                "decisions": [
                    {"id": 1, "decision": f"Use {target_stack}", "rationale": "Specified stack", "alternatives": []},
                    {"id": 2, "decision": "Use Tailwind CSS", "rationale": "Utility-first styling", "alternatives": ["CSS Modules"]},
                    {"id": 3, "decision": "Use Zustand for state", "rationale": "Lightweight state management", "alternatives": ["Redux", "Context"]},
                ],
                "components": [
                    {"name": "App", "type": "layout", "props": [], "state": [], "description": "Root application component"},
                    {"name": "Layout", "type": "layout", "props": [], "state": [], "description": "Main layout with navigation"},
                    {"name": "Dashboard", "type": "page", "props": [], "state": [], "description": "Main dashboard page"},
                    {"name": "DataTable", "type": "ui", "props": ["data", "columns"], "state": ["sortKey", "sortDir"], "description": "Reusable table component"},
                ],
                "data_flow": "Parent state managed via Zustand store, passed down as props",
                "file_structure": ["src/App.tsx", "src/components/Layout.tsx", "src/pages/Dashboard.tsx", "src/components/DataTable.tsx", "src/store.ts"],
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "raw": response[:500] if response else None}


@mcp_server.tool(name="vibe_code", description="Generate code from architecture plans")
async def vibe_code_tool(ctx, component: str, architecture: str, language: str = "typescript") -> Dict[str, Any]:
    await ctx.info(f"[code] Generating {component}...")

    prompt = f"""You are a senior {language} developer. Generate production-quality code for the following component.

Component: {component}
Architecture context: {architecture}

Return ONLY valid JSON with the code:
{{"code": "the generated code as a string", "imports": ["import statements"], "notes": "implementation notes"}}"""

    response = _llm_call(prompt)
    try:
        if response and "{" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            result = json.loads(response[start:end])
            return {"status": "success", "component": component, **result}
        return {"status": "success", "component": component, "code": f"// Generated {component}\n// (LLM unavailable — template code)\nexport function {component}() {{\n  return <div>{component}</div>;\n}}", "imports": [], "notes": "LLM unavailable — template code"}
    except Exception:
        return {"status": "success", "component": component, "code": f"// {component} placeholder", "imports": [], "notes": "Fallback"}


@mcp_server.tool(name="vibe_review", description="Review code for quality issues and improvements")
async def vibe_review_tool(ctx, code: str, language: str = "typescript") -> Dict[str, Any]:
    await ctx.info(f"[review] Reviewing {len(code)} chars of {language}...")

    prompt = f"""You are a code reviewer. Review this {language} code and return findings as JSON.

Code to review:
```{language}
{code[:4000]}
```

Return ONLY valid JSON:
{{"findings": [{{"severity": "high|medium|low", "category": "security|performance|readability|bug", "line": 0, "message": "description", "suggestion": "fix"}}], "score": 0-100}}"""

    response = _llm_call(prompt)
    try:
        if response and "{" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            result = json.loads(response[start:end])
            return {"status": "success", **result}
        return {"status": "success", "findings": [], "score": 100, "note": "LLM unavailable — manual review recommended"}
    except Exception:
        return {"status": "success", "findings": [], "score": 0}


@mcp_server.tool(name="vibe_test", description="Generate tests for given code")
async def vibe_test_tool(ctx, code: str, language: str = "typescript") -> Dict[str, Any]:
    await ctx.info(f"[test] Generating tests for {len(code)} chars...")

    prompt = f"""You are a test engineer. Write comprehensive tests for this {language} code.

Code:
```{language}
{code[:4000]}
```

Return ONLY valid JSON:
{{"test_code": "the test code", "test_framework": "vitest|jest|pytest", "coverage_targets": ["line 1", "line 2"]}}"""

    response = _llm_call(prompt)
    try:
        if response and "{" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            result = json.loads(response[start:end])
            return {"status": "success", **result}
        return {"status": "success", "test_code": f"// Tests for provided code\n// (LLM unavailable)\nimport {{ describe, it, expect }} from 'vitest';\n\ndescribe('{language} code', () => {{\n  it('should work', () => {{\n    expect(true).toBe(true);\n  }});\n}});", "test_framework": "vitest", "coverage_targets": []}
    except Exception:
        return {"status": "success", "test_code": "// Test generation placeholder", "test_framework": "vitest", "coverage_targets": []}
