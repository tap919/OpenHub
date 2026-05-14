"""MCP Prompts — reusable prompt templates."""

from vibeserve.server import mcp_server as _mcp

mcp_server = _mcp
del _mcp


@mcp_server.prompt()
def code_review_prompt():
    return {
        "name": "Code Review",
        "description": "Prompt template for thorough code review",
        "template": "Review the following code for bugs, security issues, and performance problems:\n\n{code}",
    }


@mcp_server.prompt()
def architecture_plan_prompt():
    return {
        "name": "Architecture Plan",
        "description": "Prompt template for architecture planning",
        "template": "Plan the architecture for: {intent}\nTarget stack: {stack}\nConstraints: {constraints}",
    }
