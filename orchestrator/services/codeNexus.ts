// CodeNexus Bridge for Orchestrator
import { MCPClient } from '../mcp-client.js';

export interface ReviewResult {
  score: number;
  status: 'pass' | 'fail' | 'warn';
  issues: string[];
  debtScore: number;
}

export class CodeNexusService {
  constructor(private mcpClient: MCPClient) {}

  async runReview(context: any): Promise<ReviewResult> {
    console.log('[CodeNexus] Running comprehensive system audit...');

    // Call the vibe_audit tool from MCP
    const auditResult = await this.mcpClient.callTool('vibe_audit', {
      files: context.files || [],
      requirements: ['Production-ready', 'High performance', 'Security hardened']
    });

    const issues = auditResult.line_level_issues?.map((i: any) => `[${i.agent}] ${i.issue}`) || [];
    const score = auditResult.consensus_score * 100 || 0;

    return {
      score,
      status: auditResult.recommendation === 'approve' ? 'pass' : auditResult.recommendation === 'revise' ? 'warn' : 'fail',
      issues,
      debtScore: auditResult.critical_issues * 10
    };
  }
}
