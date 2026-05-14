"""MCP Resources — static data endpoints."""

from vibeserve.server import mcp_server as _mcp

mcp_server = _mcp
del _mcp


@mcp_server.resource("openhub://version")
def resource_version():
    return {"version": "2.0.0", "name": "OpenHub MCP", "stack": "FastMCP + Python"}


@mcp_server.resource("openhub://health")
def resource_health():
    import os
    return {"ollama_host": os.getenv("OLLAMA_HOST", "unset"), "workspace": os.getenv("VIBESERVE_WORKSPACE", ".")}
