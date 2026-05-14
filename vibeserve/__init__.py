"""VibeServe — Agentic UI Coding Orchestrator for the Model Context Protocol."""

import time  # exposed for test patching: patch("vibeserve.time.time")

from vibeserve import providers as _providers

from vibeserve.models import (
    ArchitectureDecision, CodeFile, ComponentType, ContrastResult,
    DesignSystemConstraints, DesignSystemTokens, IterationResult,
    UIComponent, UISchema, VibePlan, WCAGLevel,
)
from vibeserve.providers import (
    LLMProvider, LLMRouter, OpenAIProvider, DeepSeekProvider,
    OpenRouterProvider, LocalProvider, OpenCodeProvider,
    SamplingProvider, router, mcp_llm_call,
)
from vibeserve.utils import (
    AsyncProfiler, ProfilerProvider, StructuredLogger,
    TOON, Graphify, SentryTracker, Context7Provider,
    hex_to_rgb, relative_luminance, contrast_ratio,
    SupabaseConnector, VercelConnector, GitHubConnector,
    CloudflareConnector, GoogleConnector, EditorBridge,
)
from vibeserve.core import PlaywrightBridge, CacheManager
from vibeserve.core import (
    CONFIG, CONTENT_GUIDELINES, DESIGN_UPGRADES,
    DEFAULT_DESIGN_SYSTEM, memory_store, cache_manager,
    store_successful_spec, get_similar_specs, validate_wcag_contrast,
    SchemaValidator, MultiAgentCritique, DesignAgent, SpecGenerator,
    VibeArchitect, VibeImplementer, VibeVerifier, VibeCodeReviewer,
    SystemAuditor, CritiqueLoop, VibeTester, VibeDeployer,
    TemplateLibrary, DesignUpgrader, Config,
)
from vibeserve.__main__ import (
    demo, vibe_demo, main,
    vibe_architect_tool, vibe_code_tool, generate_ui_spec_tool,
    validate_ui_spec_tool, list_design_systems_tool, memory_stats_tool,
    vibe_design_tool, vibe_preview_tool, vibe_docs_tool,
    vibe_health_tool, vibe_audit_tool, vibe_compress_tool,
    vibe_benchmark_tool, vibe_upgrade_design_tool, vibe_build_pro_tool,
    resource_default_design_system, resource_design_tokens, resource_version,
    resource_memory_stats, resource_spec_example,
)

sampling = _providers.sampling_instance

__all__ = [
    "ArchitectureDecision", "CodeFile", "ComponentType", "ContrastResult",
    "DesignSystemConstraints", "DesignSystemTokens", "IterationResult",
    "UIComponent", "UISchema", "VibePlan", "WCAGLevel",
    "LLMProvider", "LLMRouter", "SamplingProvider", "router", "sampling", "mcp_llm_call",
    "AsyncProfiler", "ProfilerProvider", "StructuredLogger",
    "TOON", "Graphify", "SentryTracker", "Context7Provider",
    "hex_to_rgb", "relative_luminance", "contrast_ratio",
    "SupabaseConnector", "VercelConnector", "GitHubConnector",
    "CloudflareConnector", "GoogleConnector", "EditorBridge",
    "CONFIG", "CONTENT_GUIDELINES", "DESIGN_UPGRADES",
    "DEFAULT_DESIGN_SYSTEM", "memory_store", "cache_manager",
    "store_successful_spec", "get_similar_specs", "validate_wcag_contrast",
    "SchemaValidator", "MultiAgentCritique", "DesignAgent", "SpecGenerator",
    "PlaywrightBridge", "CacheManager",
    "VibeArchitect", "VibeImplementer", "VibeVerifier", "VibeCodeReviewer",
    "SystemAuditor", "CritiqueLoop", "VibeTester", "VibeDeployer",
    "TemplateLibrary", "DesignUpgrader", "Config",
    "demo", "vibe_demo", "main",
    "vibe_architect_tool", "vibe_code_tool", "generate_ui_spec_tool",
    "validate_ui_spec_tool", "list_design_systems_tool", "memory_stats_tool",
    "vibe_design_tool", "vibe_preview_tool", "vibe_docs_tool",
    "vibe_health_tool", "vibe_audit_tool", "vibe_compress_tool",
    "vibe_benchmark_tool", "vibe_upgrade_design_tool", "vibe_build_pro_tool",
    "resource_default_design_system", "resource_design_tokens", "resource_version",
    "resource_memory_stats", "resource_spec_example",
]
