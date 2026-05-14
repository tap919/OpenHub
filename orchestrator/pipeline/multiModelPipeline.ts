import { ModelRouter, type TaskType, type Provider, type ProviderMessage, createCostRecord } from '../models/router.js';
import { CostTracker } from '../models/costTracker.js';
import { Desloppify } from '../models/desloppify.js';
import type { CostRecord } from '../models/costTracker.js';

export interface PipelineConfig {
  budgetLimit?: number;
  enableDesloppify?: boolean;
  enableHealthCheck?: boolean;
  maxRetries?: number;
}

export interface PipelineRunResult {
  success: boolean;
  costTracker: CostTracker;
  results: Record<string, any>;
  errors: string[];
  totalTimeMs: number;
}

interface TaskResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export class MultiModelPipeline {
  private router: ModelRouter;
  private tracker: CostTracker;
  private config: Required<PipelineConfig>;
  private desloppify: Desloppify;

  constructor(providers: Provider[], config: PipelineConfig = {}) {
    this.router = new ModelRouter(providers);
    this.tracker = new CostTracker(config.budgetLimit ?? 1.0);
    this.config = {
      budgetLimit: config.budgetLimit ?? 1.0,
      enableDesloppify: config.enableDesloppify ?? true,
      enableHealthCheck: config.enableHealthCheck ?? true,
      maxRetries: config.maxRetries ?? 3,
    };
    this.desloppify = new Desloppify();
  }

  async initialize(): Promise<string[]> {
    if (this.config.enableHealthCheck) {
      const available = await this.router.discover();
      console.log(`[Pipeline] Discovered ${available.size} models`);
      return Array.from(available);
    }
    return this.router.getAvailable();
  }

  async runTask(
    task: TaskType,
    messages: ProviderMessage[],
    options: { 
      phase?: string; 
      file?: string;
      requireReasoning?: boolean;
    } = {}
  ): Promise<{ result: TaskResult; record: CostRecord }> {
    const chain = this.router.getChain(task, options.requireReasoning ?? false);
    
    if (chain.length === 0) {
      throw new Error(`No available models for task: ${task}`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < Math.min(chain.length, this.config.maxRetries); attempt++) {
      const provider = chain[attempt];
      
      if (this.tracker.overBudget) {
        throw new Error(`Budget exceeded: $${this.tracker.totalCost.toFixed(2)}`);
      }

      try {
        console.log(`[Pipeline] ${task}: trying ${provider.name} (attempt ${attempt + 1})`);
        
        const result = await provider.call(messages);
        
        const record = createCostRecord(
          provider.name,
          result,
          options.phase || task,
          options.file
        );
        
        this.tracker = this.tracker.add(record);
        
        console.log(`[Pipeline] ${task}: ${provider.name} succeeded (${result.latencyMs}ms, $${record.costUsd.toFixed(4)})`);
        
        return { result, record };
        
      } catch (error) {
        lastError = error as Error;
        console.log(`[Pipeline] ${task}: ${provider.name} failed (${lastError.message})`);
        
        if (attempt === chain.length - 1) {
          break;
        }
      }
    }

    throw new Error(`All providers failed for ${task}: ${lastError?.message}`);
  }

  async runBatch(
    task: TaskType,
    items: { messages: ProviderMessage[]; file?: string }[],
    options: { phase?: string; requireReasoning?: boolean } = {}
  ): Promise<{ results: Record<string, TaskResult>; records: CostRecord[] }> {
    const resultsDict: Record<string, TaskResult> = {};
    const records: CostRecord[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const { result, record } = await this.runTask(task, item.messages, {
          ...options,
          file: item.file,
        });
        
        resultsDict[item.file || `item_${i}`] = result;
        records.push(record);
        
      } catch (error) {
        console.error(`[Pipeline] Batch item ${i} failed: ${(error as Error).message}`);
        throw error;
      }
    }

    return { results: resultsDict, records };
  }

  async runDesloppify(rootDir: string): Promise<{ filesProcessed: number; changesMade: any }> {
    if (!this.config.enableDesloppify) {
      return { filesProcessed: 0, changesMade: {} };
    }
    
    const result = await this.desloppify.run(rootDir);
    console.log(`[Pipeline] Desloppify: ${result.filesProcessed} files cleaned`);
    return { filesProcessed: result.filesProcessed, changesMade: result.changes };
  }

  getTracker(): CostTracker {
    return this.tracker;
  }

  getSummary() {
    return this.tracker.toSummary();
  }
}

export function createPipeline(config: PipelineConfig = {}): MultiModelPipeline {
  return new MultiModelPipeline([], config);
}