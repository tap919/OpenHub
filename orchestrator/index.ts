import { MCPClient } from './mcp-client.js';
import { WSServer } from './ws-server.js';
import { UnifiedPipeline } from './pipeline/unifiedPipeline.js';
import { MultiModelPipeline } from './pipeline/multiModelPipeline.js';
import { createProviderRegistry } from './models/providers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startOrchestrator() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const projectRoot = path.resolve(__dirname, '..');
  const mcpClient = new MCPClient(pythonPath, projectRoot);
  const wsServer = new WSServer(parseInt(process.env.WS_PORT || '3001', 10));

  const providers = createProviderRegistry(mcpClient);
  const multiModel = new MultiModelPipeline(providers, {
    budgetLimit: 2.0,
    enableDesloppify: true,
    enableHealthCheck: true,
  });

  const pipeline = new UnifiedPipeline(mcpClient, wsServer, multiModel);

  try {
    await mcpClient.start();
    console.log('[Orchestrator] MCP client ready');

    const availableModels = await multiModel.initialize();
    console.log(`[Orchestrator] Available models: ${availableModels.join(', ')}`);

    wsServer.broadcast({
      type: 'PIPELINE_EVENT',
      phase: 'init',
      status: 'complete',
      data: { models: availableModels },
    });

    wsServer.on('RUN_PIPELINE', async (data: any) => {
      const spec = data.spec || data.repos?.join(' + ') || 'Default Spec';
      console.log(`[Orchestrator] Triggering pipeline for: ${spec}`);
      await pipeline.run(spec);

      const summary = multiModel.getSummary();
      wsServer.broadcast({
        type: 'PIPELINE_EVENT',
        phase: 'cost',
        status: 'complete',
        data: summary,
      });
    });
  } catch (error) {
    console.error('[Orchestrator] Failed to start:', error);
  }

  return { mcpClient, wsServer, pipeline, multiModel };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startOrchestrator();
}
