export interface CostRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  phase?: string;
  file?: string;
}

export class CostTracker {
  readonly budgetLimit: number;
  readonly records: readonly CostRecord[];
  readonly startTime: number;

  constructor(budgetLimit: number = 1.0, records: CostRecord[] = []) {
    this.budgetLimit = budgetLimit;
    this.records = records;
    this.startTime = Date.now();
  }

  add(record: CostRecord): CostTracker {
    return new CostTracker(this.budgetLimit, [...this.records, record]);
  }

  addBatch(records: CostRecord[]): CostTracker {
    return new CostTracker(this.budgetLimit, [...this.records, ...records]);
  }

  get totalCost(): number {
    return this.records.reduce((sum, r) => sum + r.costUsd, 0);
  }

  get totalInputTokens(): number {
    return this.records.reduce((sum, r) => sum + r.inputTokens, 0);
  }

  get totalOutputTokens(): number {
    return this.records.reduce((sum, r) => sum + r.outputTokens, 0);
  }

  get totalLatencyMs(): number {
    return this.records.reduce((sum, r) => sum + r.latencyMs, 0);
  }

  get overBudget(): boolean {
    return this.totalCost > this.budgetLimit;
  }

  get modelCosts(): Record<string, number> {
    return this.records.reduce((acc, r) => {
      acc[r.model] = (acc[r.model] || 0) + r.costUsd;
      return acc;
    }, {} as Record<string, number>);
  }

  toSummary(): {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalLatencySec: number;
    modelCosts: Record<string, number>;
    recordCount: number;
  } {
    return {
      totalCost: this.totalCost,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalLatencySec: this.totalLatencyMs / 1000,
      modelCosts: this.modelCosts,
      recordCount: this.records.length,
    };
  }
}

export const PRICING: Record<string, { input: number; output: number }> = {
  'mimo-v2-pro': { input: 0.40, output: 2.00 },
  'mimo-v2-omni': { input: 0.40, output: 2.00 },
  'mimo-v2.5': { input: 0.60, output: 3.00 },
  'deepseek-v4-pro': { input: 2.00, output: 8.00 },
  'deepseek-v4-flash': { input: 0.10, output: 0.50 },
  'claude-sonnet-4-0': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] || PRICING['mimo-v2-pro'];
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}