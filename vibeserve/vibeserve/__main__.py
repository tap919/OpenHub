"""OpenHub MCP Server entry point."""

from __future__ import annotations
import asyncio
import json
import logging
import os
import signal
import sys
from pathlib import Path

from vibeserve.server import mcp_server
from vibeserve.handlers.resources import *
from vibeserve.handlers.prompts import *
from vibeserve.tools.file_tools import *
from vibeserve.tools.pipeline_tools import *

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("OpenHub.MCP")


def _cleanup():
    try:
        log.info("Shutting down gracefully...")
    except Exception:
        pass


signal.signal(signal.SIGINT, lambda s, f: (_cleanup(), sys.exit(0)))
signal.signal(signal.SIGTERM, lambda s, f: (_cleanup(), sys.exit(0)))


async def demo():
    """Simple demo of the architect tool."""
    print("\n[OpenHub MCP] Demo Mode")

    class MockCtx:
        async def info(self, msg):
            print(f"  [i] {msg}")

        async def report_progress(self, current, total, msg):
            print(f"  [{int(current / total * 100):3d}%] {msg}")

    ctx = MockCtx()
    result = await vibe_architect_tool(
        ctx=ctx,
        intent="Build a simple React dashboard",
        constraints=["TypeScript", "Tailwind CSS"],
        target_stack="react",
    )
    print(json.dumps({"status": result.get("status")}, indent=2))


def main():
    if "--demo" in sys.argv:
        asyncio.run(demo())
    else:
        log.info("Starting OpenHub MCP server...")
        mcp_server.build().run()


if __name__ == "__main__":
    main()
