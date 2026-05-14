"""Data models, schemas, and enums for VibeServe."""

from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict, field
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class WCAGLevel(str, Enum):
    AAA = "AAA"
    AA = "AA"
    FAIL = "FAIL"


class ComponentType(str, Enum):
    BUTTON = "button"
    INPUT = "input"
    CARD = "card"
    MODAL = "modal"
    DROPDOWN = "dropdown"
    TABS = "tabs"
    BADGE = "badge"
    HERO = "hero"
    FORM = "form"
    GRID = "grid"
    TABLE = "table"
    CUSTOM = "custom"


@dataclass
class ContrastResult:
    fg: str
    bg: str
    ratio: float
    wcag_level: WCAGLevel
    passes_aa: bool
    passes_aaa: bool

    def __post_init__(self):
        self.wcag_level = WCAGLevel.AAA if self.ratio >= 7 else WCAGLevel.AA if self.ratio >= 4.5 else WCAGLevel.FAIL
        self.passes_aa = self.ratio >= 4.5
        self.passes_aaa = self.ratio >= 7


class UIComponent(BaseModel):
    id: str
    type: ComponentType
    label: str
    purpose: str
    visual: Dict[str, Any]
    accessibility: Dict[str, Any]
    interaction: Dict[str, Any] = Field(default_factory=dict)
    animation: Dict[str, Any] = Field(default_factory=dict)
    responsive: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('accessibility')
    @classmethod
    def validate_accessibility(cls, v):
        if 'aria_role' not in v:
            raise ValueError("accessibility.aria_role is required")
        if 'focus_visible' not in v:
            v['focus_visible'] = True
        return v


class DesignSystemTokens(BaseModel):
    colors: Dict[str, Dict[str, Any]]
    typography: Dict[str, Dict[str, Any]]
    spacing: Dict[str, str]
    shadows: Dict[str, str] = Field(default_factory=dict)
    border_radius: Dict[str, str] = Field(default_factory=dict)


class DesignSystemConstraints(BaseModel):
    min_wcag_level: WCAGLevel = WCAGLevel.AA
    allowed_components: List[str]
    color_whitelist: List[str]
    max_component_depth: int = 5
    required_aria_roles: List[str] = Field(default_factory=list)


class UISchema(BaseModel):
    version: str = "1.0"
    metadata: Dict[str, Any]
    design_system: Dict[str, Any]
    layouts: List[Dict[str, Any]]
    components: List[UIComponent]
    interactions: List[Dict[str, Any]] = Field(default_factory=list)
    validations: Dict[str, Any] = Field(default_factory=dict)


@dataclass
class ArchitectureDecision:
    id: str
    title: str
    context: str
    decision: str
    alternatives: List[str] = field(default_factory=list)
    rationale: str = ""
    consequences: List[str] = field(default_factory=list)
    confidence: float = 0.5


@dataclass
class VibePlan:
    intent: str
    decisions: List[ArchitectureDecision] = field(default_factory=list)
    component_tree: List[Dict[str, Any]] = field(default_factory=list)
    data_flow: Dict[str, Any] = field(default_factory=dict)
    file_structure: List[str] = field(default_factory=list)
    estimated_complexity: str = "medium"
    risks: List[str] = field(default_factory=list)
    recommended_stack: Dict[str, str] = field(default_factory=dict)


@dataclass
class CodeFile:
    path: str
    content: str
    language: str = ""
    purpose: str = ""
    accessibility_notes: List[str] = field(default_factory=list)


@dataclass
class IterationResult:
    iteration: int
    score_before: float
    score_after: float
    changes: List[str] = field(default_factory=list)
    critique: Dict[str, Any] = field(default_factory=dict)
    passed: bool = False
    files_changed: List[str] = field(default_factory=list)
