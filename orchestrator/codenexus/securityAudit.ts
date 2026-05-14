import { MCPClient } from '../mcp-client.js';

export interface SecurityResult {
  vulnerabilities: any[];
  auditSummary: any;
  passed: boolean;
}

export class SecurityAudit {
  constructor(private mcpClient: MCPClient) {}

  async run(projectPath: string = '.'): Promise<SecurityResult> {
    console.log('[SecurityAudit] Running SAST and dependency audit...');
    
    const semgrepTask = this.mcpClient.callTool('run_semgrep', { path: projectPath });
    const npmAuditTask = this.mcpClient.callTool('run_npm_audit', { path: projectPath });
    
    const [semgrepResult, npmAuditResult] = await Promise.all([semgrepTask, npmAuditTask]);
    
    const vulnerabilities = semgrepResult.results?.results || [];
    const auditSummary = npmAuditResult.audit?.metadata?.vulnerabilities || {};
    
    // Simple logic for passing
    const passed = vulnerabilities.length === 0 && (!auditSummary.high || auditSummary.high === 0);
    
    return {
      vulnerabilities,
      auditSummary,
      passed
    };
  }
}
