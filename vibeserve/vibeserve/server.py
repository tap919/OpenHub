"""FastMCP server setup for OpenHub."""

from typing import Optional
import logging

log = logging.getLogger("OpenHub.MCP")


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
_LazyMCP.init("OpenHub")
