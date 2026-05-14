export interface CallConfig {
  model: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface CallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const RETRYABLE_CODES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 3;

export class ModelCaller {
  constructor(
    private apiUrl: string,
    private apiKey: string,
    private baseHeaders: Record<string, string> = {}
  ) {}

  async call(config: CallConfig, maxRetries = MAX_RETRIES): Promise<CallResult> {
    const startTime = Date.now();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...this.baseHeaders,
          },
          body: JSON.stringify({
            model: config.model,
            messages: config.messages,
            max_tokens: config.maxTokens || 4096,
            temperature: config.temperature ?? 0.7,
          }),
        });

        if (!response.ok) {
          if (RETRYABLE_CODES.includes(response.status) && attempt < maxRetries - 1) {
            await this.exponentialBackoff(attempt);
            continue;
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const inputTokens = data.usage?.prompt_tokens || this.estimateTokens(config.messages);
        const outputTokens = data.usage?.completion_tokens || this.estimateTokens(data.choices?.[0]?.message?.content || '');
        const content = data.choices?.[0]?.message?.content || '';
        const latencyMs = Date.now() - startTime;

        return { content, inputTokens, outputTokens, latencyMs };
        
      } catch (error: any) {
        if (RETRYABLE_CODES.includes(error.status) && attempt < maxRetries - 1) {
          await this.exponentialBackoff(attempt);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private exponentialBackoff(attempt: number) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(r => setTimeout(r, delay));
  }

  private estimateTokens(text: string | { role: string; content: string }[]): number {
    if (Array.isArray(text)) {
      text = text.map(m => m.content).join(' ');
    }
    return Math.ceil(text.length / 4);
  }
}