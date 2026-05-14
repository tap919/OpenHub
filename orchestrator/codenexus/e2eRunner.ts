import { MCPClient } from '../mcp-client.js';

export class E2ERunner {
  constructor(private mcpClient: MCPClient) {}

  async runTests(projectPath: string = '.'): Promise<{ success: boolean; output: string }> {
    console.log('[E2ERunner] Running Playwright test suite...');
    
    const result = await this.mcpClient.callTool('run_playwright', { path: projectPath });
    
    return {
      success: result.status === 'success',
      output: result.stdout || result.message || 'No output'
    };
  }
}
