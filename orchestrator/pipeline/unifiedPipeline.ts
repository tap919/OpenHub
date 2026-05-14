import { MCPClient } from '../mcp-client.js';
import { WSServer } from '../ws-server.js';
import { PlannerAgent } from '../agents/plannerAgent.js';
import { CodingAgentService } from '../agents/codingAgentService.js';
import { AutoFixLoop } from './autoFixLoop.js';
import { ReviewAgent } from '../codenexus/reviewAgent.js';
import { SecurityAudit } from '../codenexus/securityAudit.js';
import { E2ERunner } from '../codenexus/e2eRunner.js';
import { DebtScorer } from '../codenexus/debtScorer.js';
import { EdgeCaseAgent } from '../codenexus/edgeCaseAgent.js';
import type { MultiModelPipeline } from './multiModelPipeline.js';
import type { ProviderMessage } from '../models/router.js';

export class UnifiedPipeline {
  private planner: PlannerAgent;
  private coder: CodingAgentService;
  private autoFix: AutoFixLoop;
  private reviewAgent: ReviewAgent;
  private security: SecurityAudit;
  private e2e: E2ERunner;
  private debtScorer: DebtScorer;
  private edgeCase: EdgeCaseAgent;
  private multiModel: MultiModelPipeline | undefined;

  constructor(
    private mcpClient: MCPClient,
    private wsServer: WSServer,
    multiModel?: MultiModelPipeline
  ) {
    this.multiModel = multiModel;
    this.planner = new PlannerAgent(mcpClient, multiModel);
    this.coder = new CodingAgentService(mcpClient, multiModel);
    this.autoFix = new AutoFixLoop(mcpClient);
    this.reviewAgent = new ReviewAgent(mcpClient);
    this.security = new SecurityAudit(mcpClient);
    this.e2e = new E2ERunner(mcpClient);
    this.debtScorer = new DebtScorer();
    this.edgeCase = new EdgeCaseAgent(mcpClient);
  }

  private broadcast(phase: string, status: 'started' | 'streaming' | 'complete' | 'failed', data?: any) {
    this.wsServer.broadcast({
      type: 'PIPELINE_EVENT',
      phase,
      status,
      data,
    });
  }

  async run(spec: string) {
    console.log(`[Pipeline] Starting execution for: ${spec}`);

    try {
      // Phase 1: Planning (architect model)
      this.broadcast('planning', 'started');
      const context = await this.mcpClient.callTool('retrieve_context', { query: spec });
      const plan = await this.planner.createPlan(spec, {
        existingFiles: context.results?.map((r: any) => r.file) || [],
      });
      this.broadcast('planning', 'complete', { plan });

      // Phase 2: Code Generation (code model per file)
      this.broadcast('codegen', 'started');
      const generatedFiles: string[] = [];
      for (const step of plan.steps) {
        this.broadcast('codegen', 'streaming', { currentFile: step.file });
        const result = await this.coder.generateCode(step.purpose, `Target File: ${step.file}`);
        generatedFiles.push(...result.files);
      }
      this.broadcast('codegen', 'complete', { files: generatedFiles });

      // Phase 3: Environment + Dependency Setup
      this.broadcast('environment', 'started');
      await this.mcpClient.callTool('check_node_env', {});
      const pm = await this.mcpClient.callTool('detect_package_manager', { path: '.' });
      await this.mcpClient.callTool('run_install', { manager: pm.manager, path: '.' });
      this.broadcast('environment', 'complete');

      // Phase 4: Static Analysis
      this.broadcast('analysis', 'started');
      const biome = await this.mcpClient.callTool('run_biome', { path: '.' });
      const tsc = await this.mcpClient.callTool('run_tsc', { path: '.' });
      this.broadcast('analysis', 'complete', { diagnostics: { biome, tsc } });

      // Phase 5: Build + Auto-Fix Loop
      this.broadcast('build', 'started');
      const runBuild = async () => {
        const res = await this.mcpClient.callTool('run_build', { path: '.' });
        if (res.status === 'error') throw new Error(res.stdout || res.message);
        return res;
      };

      try {
        const buildResult = await runBuild();
        this.broadcast('build', 'complete', { output: buildResult.stdout });
      } catch (err: any) {
        this.broadcast('build', 'streaming', { message: 'Build failed, starting auto-fix...' });
        const fixed = await this.autoFix.run({
          phase: 'build',
          error: { stderr: err.message, command: 'npm run build' },
          retryFn: runBuild,
        });
        if (!fixed) throw new Error('Auto-fix failed to resolve build errors');
        this.broadcast('build', 'complete', { status: 'fixed' });
      }

      // Phase 6: Review (reasoning model)
      this.broadcast('review', 'started');

      const reviewIssues = await this.reviewAgent.review(
        generatedFiles.map(f => ({ path: f }))
      );
      const securityResult = await this.security.run('.');

      if (this.multiModel) {
        const messages: ProviderMessage[] = [
          { role: 'system', content: 'You are a senior code reviewer. Identify edge cases and potential bugs.' },
          { role: 'user', content: `Review this codebase for edge cases. Spec: ${spec}\nFiles: ${generatedFiles.join(', ')}` },
        ];
        await this.multiModel.runTask('review', messages, { phase: 'review' });
      }

      const edgeCases = await this.edgeCase.generate(spec, `Generated ${generatedFiles.length} files`);
      const testResult = await this.e2e.runTests('.');
      const debt = this.debtScorer.compute({ reviewIssues, securityResult, testResult });

      const passed = securityResult.passed && testResult.success && debt.score > 70;

      this.broadcast('review', 'complete', {
        passed,
        debt,
        issues: reviewIssues,
        edgeCases,
      });

      if (!passed) {
        this.wsServer.broadcast({
          type: 'PIPELINE_EVENT',
          phase: 'review',
          status: 'failed',
          data: { reason: 'CodeNexus gate rejected the build' },
        });
        return;
      }

      // Phase 7: De-sloppify cleanup
      if (this.multiModel) {
        this.broadcast('cleanup', 'started');
        const cleanupResult = await this.multiModel.runDesloppify('.');
        this.broadcast('cleanup', 'complete', cleanupResult);
      }

      // Phase 8: Optimization and Wiki Ingest
      this.broadcast('finalize', 'started');
      await this.mcpClient.callTool('ingest_learning', {
        topic: `Pipeline Run ${Date.now()}`,
        content: `Successfully executed pipeline for: ${spec}\nDebt Score: ${debt.score}`,
      });

      if (this.multiModel) {
        const summary = this.multiModel.getSummary();
        this.broadcast('finalize', 'complete', { costSummary: summary });
      } else {
        this.broadcast('finalize', 'complete');
      }

      console.log('[Pipeline] Execution finished successfully');
    } catch (error: any) {
      console.error('[Pipeline] Execution failed:', error);
      this.wsServer.broadcast({
        type: 'PIPELINE_EVENT',
        phase: 'global',
        status: 'failed',
        data: { error: error.message },
      });
    }
  }
}