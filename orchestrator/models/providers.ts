import type { Provider, ProviderMessage, ProviderResult } from './router.js';

export class OpenCodeGoProvider implements Provider {
  readonly name: string;
  readonly tier: 'premium' | 'standard' | 'fast' | 'local';
  readonly supportsReasoning: boolean;

  private host: string;
  private apiKey: string;

  constructor(
    name: string,
    config: {
      tier: 'premium' | 'standard' | 'fast' | 'local';
      supportsReasoning?: boolean;
      host?: string;
      apiKey?: string;
    }
  ) {
    this.name = name;
    this.tier = config.tier;
    this.supportsReasoning = config.supportsReasoning ?? false;
    this.host = config.host || 'https://api.opencode.com';
    this.apiKey = config.apiKey || process.env.OPENCODE_API_KEY || '';
  }

  async call(messages: ProviderMessage[]): Promise<ProviderResult> {
    const startTime = Date.now();
    
    const response = await fetch(`${this.host}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.name,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenCode Go API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      content,
      inputTokens: data.usage?.prompt_tokens || this.estimateTokens(messages),
      outputTokens: data.usage?.completion_tokens || this.estimateTokens(content),
      latencyMs,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private estimateTokens(text: string | ProviderMessage[]): number {
    if (Array.isArray(text)) {
      text = text.map(m => m.content).join(' ');
    }
    return Math.ceil(text.length / 4);
  }
}

export class MCPCodeProvider implements Provider {
  readonly name: string;
  readonly tier: 'premium' | 'standard' | 'fast' | 'local';
  readonly supportsReasoning: boolean;

  private mcpClient: any;

  constructor(mcpClient: any, name: string = 'mcp-code') {
    this.name = name;
    this.tier = 'standard';
    this.supportsReasoning = false;
    this.mcpClient = mcpClient;
  }

  async call(messages: ProviderMessage[]): Promise<ProviderResult> {
    const startTime = Date.now();
    
    const userMessage = messages[messages.length - 1]?.content || '';
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';

    const result = await this.mcpClient.callTool('generate_code', {
      systemPrompt: systemMessage,
      userPrompt: userMessage,
    });

    const latencyMs = Date.now() - startTime;

    return {
      content: result?.code || result?.content || '',
      inputTokens: this.estimateTokens(systemMessage + userMessage),
      outputTokens: this.estimateTokens(result?.code || ''),
      latencyMs,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.mcpClient.callTool('health_check', {});
      return true;
    } catch {
      return false;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export function createProviderRegistry(mcpClient?: any): Provider[] {
  const providers: Provider[] = [
    new OpenCodeGoProvider('mimo-v2-pro', { 
      tier: 'standard', 
      supportsReasoning: false 
    }),
    new OpenCodeGoProvider('mimo-v2-omni', { 
      tier: 'standard', 
      supportsReasoning: false 
    }),
    new OpenCodeGoProvider('deepseek-v4-pro', { 
      tier: 'premium', 
      supportsReasoning: true 
    }),
    new OpenCodeGoProvider('deepseek-v4-flash', { 
      tier: 'fast', 
      supportsReasoning: true 
    }),
  ];

  if (mcpClient) {
    providers.push(new MCPCodeProvider(mcpClient));
  }

  return providers;
}