"""Utility functions: WCAG, TOON, Graphify, logging, connectors."""

from __future__ import annotations
import hashlib
import json
import logging
import os
import random
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from pathlib import Path

import httpx

log = logging.getLogger("VibeServe")


# ====================== STRUCTURED LOGGING ======================
class StructuredLogger:
    _SECRET_PATTERNS = [
        (r'sk-[a-zA-Z0-9]{20,}', 'sk-***REDACTED***'),
        (r'Bearer [a-zA-Z0-9_\-]{20,}', 'Bearer ***REDACTED***'),
        (r'github_pat_[a-zA-Z0-9_]{20,}', 'github_pat_***REDACTED***'),
        (r'ghp_[a-zA-Z0-9]{36}', 'ghp_***REDACTED***'),
        (r'gho_[a-zA-Z0-9]{36}', 'gho_***REDACTED***'),
        (r'xox[baprs]-[a-zA-Z0-9\-]{10,}', 'xox*-***REDACTED***'),
        (r'password[\s:=]+[^\s,}]+', 'password=***REDACTED***'),
        (r'AIza[0-9A-Za-z\-_]{35}', 'AIza***REDACTED***'),
        (r'x-api-key[\s:=]+[^\s,}]+', 'x-api-key=***REDACTED***'),
    ]

    @classmethod
    def _redact(cls, text: str) -> str:
        for pattern, replacement in cls._SECRET_PATTERNS:
            text = re.sub(pattern, replacement, text)
        return text

    @staticmethod
    def event(name: str, **kwargs):
        from datetime import datetime, timezone
        data = StructuredLogger._redact(json.dumps({"event": name, "timestamp": datetime.now(timezone.utc).isoformat(), **kwargs}))
        log.info(f"[Structured] {data}")

    @staticmethod
    def error(name: str, error: str = "", **kwargs):
        from datetime import datetime, timezone
        data = StructuredLogger._redact(json.dumps({"event": name, "error": error, "timestamp": datetime.now(timezone.utc).isoformat(), "severity": "error", **kwargs}))
        log.error(f"[Structured] {data}")

    @staticmethod
    def warn(name: str, detail: str = "", **kwargs):
        from datetime import datetime, timezone
        data = StructuredLogger._redact(json.dumps({"event": name, "detail": detail, "timestamp": datetime.now(timezone.utc).isoformat(), "severity": "warning", **kwargs}))
        log.warning(f"[Structured] {data}")


# ====================== WCAG VALIDATION ======================
def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    elif len(hex_color) >= 6:
        hex_color = hex_color[:6]
    else:
        raise ValueError(f"Invalid hex color: {hex_color!r}")
    return (int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16))


def relative_luminance(rgb: Tuple[int, int, int]) -> float:
    r, g, b = [x / 255.0 for x in rgb]
    r = r / 12.92 if r <= 0.03928 else pow((r + 0.055) / 1.055, 2.4)
    g = g / 12.92 if g <= 0.03928 else pow((g + 0.055) / 1.055, 2.4)
    b = b / 12.92 if b <= 0.03928 else pow((b + 0.055) / 1.055, 2.4)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg: str, bg: str) -> float:
    try:
        l1 = relative_luminance(hex_to_rgb(fg))
        l2 = relative_luminance(hex_to_rgb(bg))
        lighter = max(l1, l2)
        darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    except (ValueError, IndexError) as e:
        log.warning(f"contrast_ratio failed for fg={fg!r} bg={bg!r}: {e}")
        return 0.0


# ====================== ASYNC PROFILER ======================
class AsyncProfiler:
    _traces: Dict[str, List[float]] = {}

    @classmethod
    def start(cls, name: str): return time.time()

    @classmethod
    def stop(cls, name: str, t0: float):
        elapsed = time.time() - t0
        cls._traces.setdefault(name, []).append(elapsed)
        if elapsed > 1.0:
            log.warning(f"[Profiler] Slow operation: {name} took {elapsed:.1f}s")

    @classmethod
    def stats(cls) -> Dict[str, Any]:
        return {name: {"count": len(times), "avg": round(sum(times)/len(times), 3) if times else 0,
                       "min": round(min(times), 3) if times else 0, "max": round(max(times), 3) if times else 0}
                for name, times in cls._traces.items()}

    @classmethod
    def clear(cls): cls._traces.clear()


# pyinstrument integration (optional)
try:
    from pyinstrument import Profiler as PyInstrument
    PYINSTRUMENT_AVAILABLE = True
except ImportError:
    PYINSTRUMENT_AVAILABLE = False


class ProfilerProvider:
    @staticmethod
    def profile_async(func):
        if not PYINSTRUMENT_AVAILABLE:
            return func
        import functools
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            profiler = PyInstrument()
            profiler.start()
            try:
                return await func(*args, **kwargs)
            finally:
                profiler.stop()
        return wrapper

    @staticmethod
    def profile_sync(func):
        if not PYINSTRUMENT_AVAILABLE:
            return func
        import functools
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            profiler = PyInstrument()
            profiler.start()
            try:
                return func(*args, **kwargs)
            finally:
                profiler.stop()
        return wrapper


# ====================== TOON (Token-Optimized Object Notation) ======================
class TOON:
    @staticmethod
    def encode(data: Any, depth: int = 0) -> str:
        indent = "  " * depth
        if isinstance(data, dict):
            items = []
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    inner = TOON.encode(v, depth + 1)
                    items.append(f"{indent}{k}:\n{inner}")
                elif isinstance(v, str) and len(v) > 80:
                    items.append(f"{indent}{k}: {v[:80]}...")
                else:
                    items.append(f"{indent}{k}: {v}")
            return "\n".join(items)
        elif isinstance(data, list):
            if not data:
                return f"{indent}[]"
            if all(isinstance(x, dict) for x in data[:3]):
                items = [f"{indent}-"] + [TOON.encode(d, depth + 1) for d in data]
                return "\n".join(items)
            return f"{indent}{', '.join(str(x)[:60] for x in data[:10])}" + (f"... (+{len(data)-10})" if len(data) > 10 else "")
        return str(data)[:200]

    @staticmethod
    def compress_json(json_str: str) -> str:
        try:
            data = json.loads(json_str) if isinstance(json_str, str) else json_str
            return TOON.encode(data)
        except Exception:
            return json_str[:500] if isinstance(json_str, str) else str(json_str)[:500]

    @staticmethod
    def savings(original: str, compressed: str = None) -> dict:
        if compressed is None:
            compressed = TOON.compress_json(original)
        orig_tokens = len(original) // 4
        comp_tokens = len(compressed) // 4
        saved = orig_tokens - comp_tokens
        pct = round((saved / max(1, orig_tokens)) * 100, 1)
        return {"original_tokens": orig_tokens, "compressed_tokens": comp_tokens, "saved": saved, "percent": pct}


# ====================== GRAPHIFY ======================
class Graphify:
    @staticmethod
    def bar_chart(data: dict, width: int = 50, title: str = "") -> str:
        lines = [title, "=" * width] if title else ["=" * width]
        max_val = max(data.values()) if data else 1
        max_label = max(len(str(k)) for k in data) if data else 5
        for label, value in data.items():
            bar_len = int((value / max_val) * (width - max_label - 10))
            bar = "#" * bar_len
            lines.append(f"  {str(label):<{max_label}} |{bar:<{width-max_label-10}} {value}")
        lines.append("=" * width)
        return "\n".join(lines)

    @staticmethod
    def trend_line(points: List[float], width: int = 50, height: int = 10, title: str = "") -> str:
        lines = [title] if title else []
        if not points:
            return "No data"
        mn, mx = min(points), max(points)
        rng = max(mx - mn, 0.01)
        for row in range(height - 1, -1, -1):
            line = ""
            for i, val in enumerate(points):
                y = int(((val - mn) / rng) * (height - 1))
                if row == 0:
                    line += "_"
                elif y >= row:
                    line += "#"
                else:
                    line += " "
            lines.append(f"  {mx - (mx-mn)*row/(height-1):.1f} |{line}")
        lines.append(f"  {' ' * 4}{'-' * len(points)}")
        return "\n".join(lines)

    @staticmethod
    def benchmark_summary(iterations: List[dict]) -> str:
        lines = ["", "=" * 60, "  VibeServe Self-Improvement Dashboard", "=" * 60]
        if not iterations:
            return "\n".join(lines + ["  No data yet."])

        scores = [i.get("score", 0) for i in iterations]
        lines.append("")
        lines.append(Graphify.bar_chart(
            {f"Loop {j+1}": s for j, s in enumerate(scores)},
            width=50, title="  Scores per iteration"
        ))
        lines.append("")
        lines.append(Graphify.trend_line(scores, title="  Score trend"))
        avg_s = sum(scores) / len(scores) if scores else 0
        lines.append(f"\n  Avg score: {avg_s:.2f}  |  "
                     f"Best: {max(scores):.2f}  |  "
                     f"Worst: {min(scores):.2f}  |  "
                     f"Delta: {max(scores)-min(scores):.2f}")

        times = [i.get("time_ms", 0) / 1000 for i in iterations if i.get("time_ms")]
        if times:
            lines.append(f"  Total time: {sum(times):.1f}s  |  Avg/loop: {sum(times)/len(times):.1f}s")

        lines.append("=" * 60)
        return "\n".join(lines)


# ====================== SENTRY TRACKER ======================
class SentryTracker:
    _events: List[Dict[str, Any]] = []

    @classmethod
    def track(cls, event: str, data: Dict[str, Any] = None):
        from datetime import datetime, timezone
        entry = {
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data or {}
        }
        cls._events.append(entry)
        log.info(f"[Sentry] {event}: {json.dumps(data)[:200]}" if data else f"[Sentry] {event}")

    @classmethod
    def flush(cls) -> List[Dict[str, Any]]:
        events = cls._events.copy()
        cls._events.clear()
        return events

    @classmethod
    def errors(cls) -> List[Dict[str, Any]]:
        return [e for e in cls._events if "error" in e["event"].lower()]


# ====================== CONTEXT 7 ======================
class Context7Provider:
    BASE = "https://mcp.context7.com/mcp"

    @staticmethod
    async def fetch_docs(query: str, library: str = None) -> str:
        try:
            api_key = os.getenv("CONTEXT7_API_KEY", "")
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["CONTEXT7_API_KEY"] = api_key
            async with httpx.AsyncClient(timeout=15) as c:
                resp = await c.post(
                    Context7Provider.BASE,
                    json={"method": "tools/call", "params": {
                        "name": "get-library-docs",
                        "arguments": {"topic": query, "library": library or query}
                    }},
                    headers=headers
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("result", {}).get("content", [{}])[0].get("text", "")[:3000]
        except Exception:
            pass
        return ""


# ====================== CONNECTORS ======================
class SupabaseConnector:
    @staticmethod
    def _headers() -> dict:
        return {
            "apikey": os.getenv("SUPABASE_KEY", ""),
            "Authorization": f"Bearer {os.getenv('SUPABASE_KEY', '')}",
            "Content-Type": "application/json"
        }

    @staticmethod
    async def query(table: str, select: str = "*", filters: dict = None, limit: int = 10) -> dict:
        url = f"{os.getenv('SUPABASE_URL', '')}/rest/v1/{table}?select={select}&limit={limit}"
        if filters:
            for k, v in filters.items():
                url += f"&{k}=eq.{v}"
        async with httpx.AsyncClient(timeout=15) as c:
            resp = await c.get(url, headers=SupabaseConnector._headers())
            return {"status": resp.status_code, "data": resp.json() if resp.status_code == 200 else None}

    @staticmethod
    async def insert(table: str, data: dict) -> dict:
        url = f"{os.getenv('SUPABASE_URL', '')}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=15) as c:
            resp = await c.post(url, headers=SupabaseConnector._headers(), json=data)
            return {"status": resp.status_code, "data": resp.json() if resp.status_code in (200, 201) else None}

    @staticmethod
    async def rpc(function: str, params: dict = None) -> dict:
        url = f"{os.getenv('SUPABASE_URL', '')}/rest/v1/rpc/{function}"
        async with httpx.AsyncClient(timeout=15) as c:
            resp = await c.post(url, headers=SupabaseConnector._headers(), json=params or {})
            return {"status": resp.status_code, "data": resp.json() if resp.status_code == 200 else None}


class VercelConnector:
    @staticmethod
    def _headers() -> dict:
        return {"Authorization": f"Bearer {os.getenv('VERCEL_TOKEN', '')}", "Content-Type": "application/json"}

    @staticmethod
    async def list_deployments(limit: int = 5) -> dict:
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://api.vercel.com/v6/deployments?limit={limit}",
            headers=VercelConnector._headers()
        )
        return {"status": resp.status_code, "deployments": resp.json().get("deployments", []) if resp.status_code == 200 else []}

    @staticmethod
    async def list_projects() -> dict:
        resp = await httpx.AsyncClient(timeout=15).get(
            "https://api.vercel.com/v9/projects",
            headers=VercelConnector._headers()
        )
        return {"status": resp.status_code, "projects": resp.json().get("projects", []) if resp.status_code == 200 else []}

    @staticmethod
    async def get_env(project_id: str) -> dict:
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://api.vercel.com/v9/projects/{project_id}/env",
            headers=VercelConnector._headers()
        )
        return {"status": resp.status_code, "envs": resp.json().get("envs", []) if resp.status_code == 200 else []}


class GitHubConnector:
    @staticmethod
    def _headers() -> dict:
        return {"Authorization": f"Bearer {os.getenv('GITHUB_TOKEN', '')}", "Accept": "application/vnd.github+json"}

    @staticmethod
    async def get_repo(owner: str, repo: str) -> dict:
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=GitHubConnector._headers()
        )
        return {"status": resp.status_code, "repo": resp.json() if resp.status_code == 200 else None}

    @staticmethod
    async def list_issues(owner: str, repo: str, state: str = "open") -> dict:
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://api.github.com/repos/{owner}/{repo}/issues?state={state}&per_page=10",
            headers=GitHubConnector._headers()
        )
        return {"status": resp.status_code, "issues": resp.json() if resp.status_code == 200 else []}

    @staticmethod
    async def trigger_action(owner: str, repo: str, workflow: str, ref: str = "main") -> dict:
        resp = await httpx.AsyncClient(timeout=15).post(
            f"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches",
            headers=GitHubConnector._headers(),
            json={"ref": ref}
        )
        return {"status": resp.status_code, "triggered": resp.status_code == 204}


class CloudflareConnector:
    @staticmethod
    def _headers() -> dict:
        return {"Authorization": f"Bearer {os.getenv('CLOUDFLARE_TOKEN', '')}", "Content-Type": "application/json"}

    @staticmethod
    async def list_dns() -> dict:
        zone = os.getenv("CLOUDFLARE_ZONE", "")
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://api.cloudflare.com/client/v4/zones/{zone}/dns_records?per_page=20",
            headers=CloudflareConnector._headers()
        )
        return {"status": resp.status_code, "records": resp.json().get("result", []) if resp.status_code == 200 else []}

    @staticmethod
    async def purge_cache() -> dict:
        zone = os.getenv("CLOUDFLARE_ZONE", "")
        resp = await httpx.AsyncClient(timeout=15).post(
            f"https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache",
            headers=CloudflareConnector._headers(),
            json={"purge_everything": True}
        )
        return {"status": resp.status_code, "purged": resp.status_code == 200}


class GoogleConnector:
    @staticmethod
    async def sheets_read(spreadsheet_id: str, range_: str = "A1:Z100") -> dict:
        key = os.getenv("GOOGLE_API_KEY", "")
        resp = await httpx.AsyncClient(timeout=15).get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_}?key={key}"
        )
        return {"status": resp.status_code, "values": resp.json().get("values", []) if resp.status_code == 200 else []}

    @staticmethod
    async def sheets_write(spreadsheet_id: str, range_: str, values: list) -> dict:
        key = os.getenv("GOOGLE_API_KEY", "")
        resp = await httpx.AsyncClient(timeout=15).post(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_}:append?valueInputOption=RAW&key={key}",
            json={"values": values}
        )
        return {"status": resp.status_code, "updated": resp.status_code == 200}


class EditorBridge:
    @staticmethod
    def vscode_task_json(label: str, command: str) -> dict:
        return {"version": "2.0.0", "tasks": [{"label": label, "type": "shell", "command": command, "group": "build", "problemMatcher": []}]}

    @staticmethod
    def vscode_settings_json() -> dict:
        return {
            "python.defaultInterpreterPath": "python",
            "python.linting.ruffEnabled": True,
            "python.testing.pytestEnabled": True,
            "python.testing.pytestArgs": ["test_aether_nexus.py", "test_integration_v5.py"],
            "[python]": {"editor.formatOnSave": True, "editor.defaultFormatter": "charliermarsh.ruff"}
        }

    @staticmethod
    def vscode_extensions_json() -> dict:
        return {"recommendations": ["charliermarsh.ruff", "ms-python.python", "ms-python.mypy-type-checker"]}

    @staticmethod
    def zed_workspace_config(name: str, python_path: str = ".") -> str:
        return json.dumps({
            "name": name,
            "settings": {
                "lsp": {"pyright": {"settings": {"python": {"pythonPath": python_path}}}},
                "languages": {"Python": {"format_on_save": "on", "formatter": {"external": {"command": "ruff", "arguments": ["format", "-"]}}}}
            }
        }, indent=2)

    @staticmethod
    def cursor_rules(project_type: str = "mcp-server") -> str:
        return f"""You are building a {project_type}.
- Use type hints everywhere
- Async/await for I/O operations
- Environment variables for secrets, never hardcode keys
- WCAG AAA compliance for any UI output
- Test coverage: unit + integration + edge cases
- Follow PEP 8 and ruff linting rules
- Use Pydantic v2 for data validation"""

    @staticmethod
    def write_all_configs(project_name: str = "vibeserve"):
        base = Path.cwd()
        vscode_dir = base / ".vscode"
        vscode_dir.mkdir(exist_ok=True)
        with open(vscode_dir / "tasks.json", "w") as f:
            json.dump(EditorBridge.vscode_task_json(f"{project_name}: Serve", f"python {project_name}.py"), f, indent=2)
        with open(vscode_dir / "settings.json", "w") as f:
            json.dump(EditorBridge.vscode_settings_json(), f, indent=2)
        with open(vscode_dir / "extensions.json", "w") as f:
            json.dump(EditorBridge.vscode_extensions_json(), f, indent=2)
        zed_dir = base / ".zed"
        zed_dir.mkdir(exist_ok=True)
        with open(zed_dir / "settings.json", "w") as f:
            f.write(EditorBridge.zed_workspace_config(project_name))
        return {"vscode": str(vscode_dir), "zed": str(zed_dir), "files": ["tasks.json", "settings.json", "extensions.json", ".zed/settings.json"]}



