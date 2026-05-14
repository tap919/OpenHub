"""LLM providers with auto-fallback routing."""

from __future__ import annotations
import asyncio
import json
import logging
import os
import shutil
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

import httpx

log = logging.getLogger("VibeServe")


class LLMProvider(ABC):
    @abstractmethod
    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    async def _api_call(self, base_url: str, api_key: str, model: str,
                        prompt: str, temperature: float, response_format: str,
                        extra_headers: Optional[Dict[str, str]] = None,
                        max_retries: int = 4) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        if extra_headers:
            headers.update(extra_headers)

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=180.0)) as client:
            for attempt in range(max_retries):
                try:
                    resp = await client.post(
                        f"{base_url}/chat/completions",
                        json=payload, headers=headers
                    )
                    if resp.status_code == 429:
                        wait = (2 ** attempt) * 1.2
                        log.warning(f"[{self.name}] Rate limited. Waiting {wait}s...")
                        await asyncio.sleep(wait)
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                except Exception as e:
                    log.warning(f"[{self.name}] LLM call failed (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
        return None


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None,
                 model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

    @property
    def name(self) -> str:
        return "OpenAI"

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        return await self._api_call(
            self.base_url, self.api_key, self.model,
            prompt, temperature, response_format
        )


class DeepSeekProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        self.base_url = "https://api.deepseek.com/v1"
        self.model = model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    @property
    def name(self) -> str:
        return "DeepSeek"

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        return await self._api_call(
            self.base_url, self.api_key, self.model,
            prompt, temperature, response_format
        )


class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
        self.model = model or os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")

    @property
    def name(self) -> str:
        return "OpenRouter"

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        return await self._api_call(
            self.base_url, self.api_key, self.model,
            prompt, temperature, response_format,
            extra_headers={
                "HTTP-Referer": "https://vibeserve.dev",
                "X-Title": "VibeServe"
            }
        )


class LocalProvider(LLMProvider):
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = base_url or os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
        self.model = model or os.getenv("LOCAL_LLM_MODEL", "llama3.2")
        self.api_key = "not-needed"

    @property
    def name(self) -> str:
        return "Local"

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        headers = {"Content-Type": "application/json"}
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": False
        }
        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, read=300.0)) as client:
            for attempt in range(4):
                try:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload, headers=headers
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                except Exception as e:
                    log.warning(f"[{self.name}] LLM call failed (attempt {attempt + 1}): {e}")
                    if attempt < 3:
                        await asyncio.sleep(2 ** attempt)
        return None


class OpenCodeProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None):
        self.model = model or os.getenv("OPENCODE_MODEL", "opencode/hy3-preview-free")
        self._available = False
        self._binary = "opencode"
        candidates = ["opencode.cmd", "opencode.exe", "opencode.ps1", "opencode"]
        for name in candidates:
            found = shutil.which(name)
            if found:
                self._available = True
                self._binary = found
                break
        if not self._available:
            for bin_dir in [
                os.path.expandvars(r"%APPDATA%\npm"),
                os.path.expandvars(r"%LOCALAPPDATA%\npm"),
                "/usr/local/bin",
                os.path.expanduser("~/.npm-global/bin"),
            ]:
                for name in candidates:
                    full = os.path.join(bin_dir, name)
                    if os.path.exists(full):
                        self._available = True
                        self._binary = full
                        break
                if self._available:
                    break
        if not self._available:
            log.warning("OpenCode CLI not found. Install: npm install -g opencode-ai")

    @property
    def name(self) -> str:
        return "OpenCode"

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        if not self._available:
            log.error("OpenCode CLI not installed -- provider disabled")
            return None

        try:
            cmd = [self._binary, "run", "--model", self.model, "--format", "json", prompt]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300.0)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                log.warning(f"[{self.name}] CLI timeout after 300s")
                return None

            if proc.returncode != 0:
                stderr_msg = stderr.decode() if stderr else "unknown error"
                log.warning(f"[{self.name}] CLI failed (exit {proc.returncode}): {stderr_msg[:200]}")
                return None

            return self._parse_output(stdout.decode())
        except Exception as e:
            log.warning(f"[{self.name}] Provider error: {e}")
            return None

    def _parse_output(self, output: str) -> Optional[str]:
        try:
            lines = [l.strip() for l in output.strip().split('\n') if l.strip()]
            last_content: Optional[str] = None
            for line in lines:
                try:
                    data = json.loads(line)
                    if isinstance(data, dict):
                        if 'content' in data:
                            last_content = data['content']
                        elif 'message' in data and isinstance(data['message'], dict):
                            last_content = data['message'].get('content')
                        elif 'response' in data:
                            last_content = data['response']
                except json.JSONDecodeError:
                    if line and not line.startswith('{'):
                        last_content = line
            return last_content
        except Exception as e:
            log.warning(f"[{self.name}] Failed to parse output: {e}")
            return None


class SamplingProvider(LLMProvider):
    def __init__(self, ctx: Any = None):
        self._ctx = ctx
        self._active = ctx is not None and hasattr(ctx, 'sample')

    @property
    def name(self) -> str:
        return "MCP-Sampling"

    def bind(self, ctx: Any):
        self._ctx = ctx
        self._active = ctx is not None and hasattr(ctx, 'sample')

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json") -> Optional[str]:
        if not self._active or not self._ctx:
            return None
        try:
            result = await self._ctx.sample(
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=4096
            )
            if hasattr(result, 'text'):
                return result.text
            if hasattr(result, 'content'):
                return str(result.content)
            return str(result) if result else None
        except Exception as e:
            log.warning(f"[MCP-Sampling] Sample call failed: {e}")
            return None


class LLMRouter:
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self._initialized = False

    def _ensure_init(self):
        if self._initialized:
            return
        self._initialized = True
        self._init_providers()

    def _init_providers(self):
        if os.getenv("OPENAI_API_KEY"):
            self.providers["openai"] = OpenAIProvider()
            log.info("LLMRouter: OpenAI provider registered")
        if os.getenv("DEEPSEEK_API_KEY"):
            self.providers["deepseek"] = DeepSeekProvider()
            log.info("LLMRouter: DeepSeek provider registered")
        if os.getenv("OPENROUTER_API_KEY"):
            self.providers["openrouter"] = OpenRouterProvider()
            log.info("LLMRouter: OpenRouter provider registered")
        self.providers["local"] = LocalProvider()
        log.info(f"LLMRouter: Local provider registered ({self.providers['local'].model})")
        if shutil.which("opencode"):
            self.providers["opencode"] = OpenCodeProvider()
            log.info("LLMRouter: OpenCode CLI provider registered")
        else:
            log.info("LLMRouter: OpenCode CLI not found -- provider disabled")

    @property
    def default_name(self) -> str:
        return os.getenv("DEFAULT_LLM_PROVIDER", "openai")

    def get(self, name: Optional[str] = None) -> LLMProvider:
        self._ensure_init()
        if name and name in self.providers:
            return self.providers[name]
        default = self.default_name
        if default in self.providers:
            return self.providers[default]
        if self.providers:
            return list(self.providers.values())[0]
        raise RuntimeError("No LLM providers configured. Set an API key or install a local model.")

    async def call(self, prompt: str, temperature: float = 0.7,
                   response_format: str = "json",
                   provider: Optional[str] = None) -> Optional[str]:
        primary = self.get(provider)
        result = await primary.call(prompt, temperature, response_format)
        if result:
            return result
        log.warning(f"[LLMRouter] {primary.name} failed, trying fallback providers...")
        for name, prov in self.providers.items():
            if prov is primary:
                continue
            log.info(f"[LLMRouter] Trying fallback: {prov.name}...")
            result = await prov.call(prompt, temperature, response_format)
            if result:
                return result
        log.error(f"[LLMRouter] All {len(self.providers)} providers failed.")
        return None


# Global instances (defined after all classes)
router = LLMRouter()
sampling_instance = SamplingProvider()


async def mcp_llm_call(prompt: str, temperature: float = 0.7,
                       response_format: str = "json",
                       ctx: Any = None) -> Optional[str]:
    if ctx:
        sampling_instance.bind(ctx)
        result = await sampling_instance.call(prompt, temperature, response_format)
        if result:
            return result
    return await router.call(prompt, temperature, response_format)
