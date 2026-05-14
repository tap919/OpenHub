import { MCPClient } from '../mcp-client.js';
import type { MultiModelPipeline } from '../pipeline/multiModelPipeline.js';
import type { ProviderMessage } from '../models/router.js';

export interface PlanStep {
  id: string;
  file: string;
  action: 'create' | 'modify' | 'delete';
  purpose: string;
  status: 'pending' | 'complete' | 'failed';
}

export interface MultiFilePlan {
  id: string;
  title: string;
  summary: string;
  steps: PlanStep[];
}

export class PlannerAgent {
  constructor(
    private mcpClient: MCPClient,
    private multiModel?: MultiModelPipeline
  ) {}

  async createPlan(prompt: string, context: { existingFiles: string[] }): Promise<MultiFilePlan> {
    console.log(`[PlannerAgent] Creating plan for: ${prompt}`);

    if (this.multiModel) {
      return this.createPlanWithModel(prompt, context);
    }

    return this.createPlanWithMCP(prompt, context);
  }

  private async createPlanWithModel(prompt: string, context: { existingFiles: string[] }): Promise<MultiFilePlan> {
    const messages: ProviderMessage[] = [
      { role: 'system', content: 'You are an expert software architect. Create a detailed implementation plan as JSON. Include id, file, action (create/modify/delete), and purpose for each step.' },
      { role: 'user', content: `Objective: ${prompt}\nExisting files: ${context.existingFiles.join(', ')}\n\nCreate an implementation plan with specific file targets.` },
    ];

    const { result } = await this.multiModel!.runTask('architect', messages, {
      phase: 'planning',
    });

    try {
      const planData = JSON.parse(result.content);
      return {
        id: `plan_${Date.now()}`,
        title: planData.title || 'Implementation Plan',
        summary: planData.summary || 'Strategizing implementation',
        steps: (planData.steps || planData.tasks || []).map((t: any, i: number) => ({
          id: t.id?.toString() || `step_${i}`,
          file: t.file || 'unknown.ts',
          action: t.action || 'create',
          purpose: t.purpose || t.task || t.description || '',
          status: 'pending' as const,
        })),
      };
    } catch {
      return {
        id: `plan_${Date.now()}`,
        title: 'Implementation Plan',
        summary: result.content.slice(0, 200),
        steps: [{ id: 'step_0', file: 'src/index.ts', action: 'create', purpose: prompt, status: 'pending' }],
      };
    }
  }

  private async createPlanWithMCP(prompt: string, context: { existingFiles: string[] }): Promise<MultiFilePlan> {
    const response = await this.mcpClient.callTool('generate_plan', {
      objective: prompt,
      context: JSON.stringify(context),
    });

    if (response.status === 'error') {
      throw new Error(`Planning tool failed: ${response.message}`);
    }

    const planData = response.plan;
    return {
      id: `plan_${Date.now()}`,
      title: planData.title || 'Implementation Plan',
      summary: planData.summary || 'Strategizing implementation',
      steps: (planData.tasks || []).map((t: any) => ({
        id: t.id.toString(),
        file: t.file || 'unknown.ts',
        action: t.action || 'create',
        purpose: t.task || t.purpose,
        status: 'pending' as const,
      })),
    };
  }
}