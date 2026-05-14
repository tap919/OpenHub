"""File I/O tools — read, write, list files in the workspace."""

import os
from pathlib import Path
from typing import Any, Dict, Optional

from vibeserve.server import mcp_server as _mcp

mcp_server = _mcp
del _mcp

_WORKSPACE_ROOT = Path(os.getenv("VIBESERVE_WORKSPACE", ".")).resolve()


def _resolve_path(path: str) -> Path:
    raw = Path(path)
    if not raw.is_absolute():
        raw = _WORKSPACE_ROOT / raw
    resolved = raw.resolve()
    try:
        resolved.relative_to(_WORKSPACE_ROOT)
    except ValueError:
        raise ValueError(f"Path traversal denied: {path}")
    return resolved


@mcp_server.tool(name="read_file", description="Read content from a file in the workspace")
async def read_file_tool(ctx, path: str) -> Dict[str, Any]:
    await ctx.info(f"[fs] Reading {path}")
    try:
        p = _resolve_path(path)
        if not p.exists():
            return {"status": "error", "message": f"File not found: {path}"}
        if not p.is_file():
            return {"status": "error", "message": f"Not a file: {path}"}
        content = p.read_text(encoding="utf-8", errors="replace")
        return {"status": "success", "path": str(p), "content": content, "size": len(content)}
    except ValueError as e:
        return {"status": "error", "message": str(e)}


@mcp_server.tool(name="write_file", description="Write content to a file in the workspace")
async def write_file_tool(ctx, path: str, content: str) -> Dict[str, Any]:
    await ctx.info(f"[fs] Writing {path}")
    try:
        p = _resolve_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return {"status": "success", "path": str(p), "size": len(content)}
    except ValueError as e:
        return {"status": "error", "message": str(e)}


@mcp_server.tool(name="list_files", description="List files and directories at a path")
async def list_files_tool(ctx, path: str = ".") -> Dict[str, Any]:
    await ctx.info(f"[fs] Listing {path}")
    try:
        p = _resolve_path(path)
        if not p.exists():
            return {"status": "error", "message": f"Path not found: {path}"}
        items = []
        for entry in sorted(p.iterdir()):
            info = {
                "name": entry.name,
                "type": "directory" if entry.is_dir() else "file",
            }
            if entry.is_file():
                info["size"] = entry.stat().st_size
            items.append(info)
        return {"status": "success", "path": str(p), "entries": items}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
