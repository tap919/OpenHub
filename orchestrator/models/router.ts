import { calculateCost, type CostRecord } from './costTracker.js';

export interface Provider {
  name: string;
  tier: 'premium' | 'standard' | 'fast' | 'local';
  supportsReasoning: boolean;
  call(messages: ProviderMessage[]): Promise<ProviderResult>;
  healthCheck(): Promise<boolean>;
}

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export type TaskType = 'architect' | 'code' | 'review' | 'verify' | 'iterate' | 'deploy';

const TASK_MODEL_CHAINS: Record<TaskType, { model: string; reasoning: boolean }[]> = {
  architect: [
    { model: 'deepseek-v4-pro', reasoning: true },
    { model: 'claude-sonnet-4-0', reasoning: false },
    { model: 'mimo-v2-pro', reasoning: false },
  ],
  code: [
    { model: 'mimo-v2-pro', reasoning: false },
    { model: 'mimo-v2-omni', reasoning: false },
    { model: 'deepseek-v4-flash', reasoning: false },
  ],
  review: [
    { model: 'deepseek-v4-pro', reasoning: true },
    { model: 'claude-sonnet-4-0', reasoning: false },
  ],
  verify: [
    { model: 'deepseek-v4-pro', reasoning: true },
    { model: 'mimo-v2-pro', reasoning: false },
  ],
  iterate: [
    { model: 'mimo-v2-pro', reasoning: false },
    { model: 'mimo-v2-omni', reasoning: false },
  ],
  deploy: [
    { model: 'mimo-v2-pro', reasoning: false },
    { model: 'deepseek-v4-flash', reasoning: false },
  ],
};

export class ModelRouter {
  private providers: Map<string, Provider> = new Map();
  private available: Set<string> = new Set();

  constructor(providers: Provider[]) {
    for (const p of providers) {
      this.providers.set(p.name, p);
    }
  }

  async discover(): Promise<Set<string>> {
    console.log('[Router] Discovering available models...');
    const available: string[] = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const ok = await provider.healthCheck();
        if (ok) {
          this.available.add(name);
          available.push(name);
          console.log(`[Router] ${name}: available`);
        } else {
          console.log(`[Router] ${name}: unavailable`);
        }
      } catch (e) {
        console.log(`[Router] ${name}: unavailable (${(e as Error).message})`);
      }
    }
    
    return this.available;
  }

  getChain(task: TaskType, requiredReasoning = false): Provider[] {
    const chainSpec = TASK_MODEL_CHAINS[task];
    if (!chainSpec) return [];

    return chainSpec
      .filter(spec => {
        const has = this.available.has(spec.model);
        if (requiredReasoning) return has && this.hasReasoningModel(spec.model);
        return has;
      })
      .map(spec => this.providers.get(spec.model))
      .filter((p): p is Provider => p !== undefined);
  }

  private hasReasoningModel(model: string): boolean {
    const p = this.providers.get(model);
    return p?.supportsReasoning ?? false;
  }

  getAvailable(): string[] {
    return Array.from(this.available);
  }

  hasModel(model: string): boolean {
    return this.available.has(model);
  }
}

export function createCostRecord(
  model: string,
  result: ProviderResult,
  phase?: string,
  file?: string
): CostRecord {
  return {
    model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: calculateCost(model, result.inputTokens, result.outputTokens),
    latencyMs: result.latencyMs,
    phase,
    file,
  };
}