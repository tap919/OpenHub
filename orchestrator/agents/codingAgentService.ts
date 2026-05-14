import { MCPClient } from '../mcp-client.js';
import type { MultiModelPipeline } from '../pipeline/multiModelPipeline.js';
import type { ProviderMessage } from '../models/router.js';

export interface CodingResult {
  success: boolean;
  files: string[];
  message: string;
}

export class CodingAgentService {
  constructor(
    private mcpClient: MCPClient,
    private multiModel?: MultiModelPipeline
  ) {}

  async generateCode(task: string, context: string): Promise<CodingResult> {
    console.log(`[CodingAgent] Generating code for task: ${task}`);

    const messages: ProviderMessage[] = [
      { role: 'system', content: 'You are an expert TypeScript developer. Generate production-quality code. Respond ONLY with the code content, no explanations.' },
      { role: 'user', content: `Task: ${task}\nContext: ${context}\n\nGenerate the source code for this task.` },
    ];

    let codeContent: string;

    if (this.multiModel) {
      const { result } = await this.multiModel.runTask('code', messages, {
        phase: 'codegen',
        file: task,
      });
      codeContent = result.content;
    } else {
      const response = await this.mcpClient.callTool('generate_code', {
        task,
        context,
      });
      codeContent = response.code || response.content || '';
    }

    const filePath = `src/generated/${Date.now()}.ts`;

    await this.mcpClient.callTool('write_file', {
      path: filePath,
      content: codeContent,
    });

    return {
      success: true,
      files: [filePath],
      message: `Successfully generated ${filePath}`,
    };
  }
}