import { MCPClient } from '../mcp-client.js';

export class EdgeCaseAgent {
  constructor(private mcpClient: MCPClient) {}

  async generate(spec: string, codeSummary: string): Promise<string[]> {
    console.log('[EdgeCaseAgent] Synthesizing untested edge cases...');
    
    // Using a tool that can call an LLM (assuming we have one or using vibe_audit as a proxy)
    const prompt = `Application Spec: ${spec}\n\nGenerated Code Summary: ${codeSummary}\n\nList 5 critical edge cases that should be tested:`;
    
    // For now, we simulate this with a structured prompt to the general audit tool
    const response = await this.mcpClient.callTool('vibe_audit', {
      files: [],
      requirements: [prompt]
    });
    
    return response.line_level_issues?.map((i: any) => i.issue) || [
      'Concurrent user sessions',
      'Extremely large input payloads',
      'Database connection timeouts',
      'Invalid authentication tokens',
      'API rate limiting'
    ];
  }
}
