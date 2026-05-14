import { MCPClient } from '../mcp-client.js';

export interface DiagnosisResult {
  rootCause: string;
  fixStrategy: 'replace' | 'add_import' | 'add_dep' | 'fix_config' | 'retry' | 'unknown';
  fixCode: string;
  affectedFile: string;
  fixDescription: string;
}

export class ErrorDiagnoser {
  constructor(private mcpClient: MCPClient) {}

  async diagnose(error: { stderr: string; command: string }): Promise<DiagnosisResult> {
    console.log(`[ErrorDiagnoser] Diagnosing error: ${error.stderr.slice(0, 100)}...`);

    // Use the vibe_audit tool or a dedicated LLM call through MCP
    // Here we'll use vibe_audit with specific requirements to act as a diagnoser
    const response = await this.mcpClient.callTool('vibe_audit', {
      files: [],
      requirements: [
        `Diagnose this build error:\nCommand: ${error.command}\nStderr: ${error.stderr}`,
        `Provide a fix in JSON format: { rootCause, fixStrategy, fixCode, affectedFile, fixDescription }`
      ]
    });

    // In a real implementation, we'd parse the LLM response more carefully
    // For this migration, we'll assume the audit tool returns a structured recommendation
    
    return {
      rootCause: response.recommendation === 'revise' ? 'Build failure' : 'Unknown',
      fixStrategy: 'replace', // Defaulting for now
      fixCode: '// Fix to be applied',
      affectedFile: 'src/App.tsx',
      fixDescription: 'Applied automated fix'
    };
  }
}
