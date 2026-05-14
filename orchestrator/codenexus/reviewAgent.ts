import { MCPClient } from '../mcp-client.js';

export interface ReviewIssue {
  file: string;
  line?: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export class ReviewAgent {
  constructor(private mcpClient: MCPClient) {}

  async review(files: { path: string; content?: string }[]): Promise<ReviewIssue[]> {
    console.log(`[ReviewAgent] Analyzing ${files.length} files...`);
    
    // We'll use an LLM via MCP to perform the AST-level analysis
    // In a real scenario, we might use a specific tool that runs an AST parser
    // but here we leverage the general reasoning capability of the agent.
    
    const issues: ReviewIssue[] = [];
    
    for (const file of files) {
      const response = await this.mcpClient.callTool('vibe_audit', {
        files: [file.path],
        requirements: ['Check for anti-patterns', 'Check for complexity', 'Karpathy simplest possible thing heuristics']
      });
      
      if (response.line_level_issues) {
        for (const issue of response.line_level_issues) {
          issues.push({
            file: file.path,
            line: issue.line,
            message: issue.issue,
            severity: issue.severity || 'medium'
          });
        }
      }
    }
    
    return issues;
  }
}
