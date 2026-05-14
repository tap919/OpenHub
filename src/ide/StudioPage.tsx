import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, Cpu, Play, Pause, CheckCircle2, AlertCircle, Loader2,
  Clock, Settings, Zap, ChevronRight, RefreshCw, Plus, Trash2,
  ArrowRight, Save, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getCsrfToken(): string {
  const get = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? '';
  return get('__Host-csrf-token') || get('__Secure-csrf-token') || get('csrf-token');
}

type StepStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
type LLMChoice = 'ollama' | 'gemini' | 'anthropic' | 'deepseek' | 'openrouter';

interface PipelineStep {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  llm: LLMChoice;
  status: StepStatus;
  config: Record<string, string>;
}

const DEFAULT_STEPS: PipelineStep[] = [
  { id: '1', key: 'architect', name: 'Architect', description: 'Plan architecture from natural language intent', enabled: true, llm: 'ollama', status: 'idle', config: {} },
  { id: '2', key: 'code', name: 'Code', description: 'Generate implementation code', enabled: true, llm: 'gemini', status: 'idle', config: {} },
  { id: '3', key: 'review', name: 'Review', description: 'Multi-agent code review with WCAG checks', enabled: true, llm: 'anthropic', status: 'idle', config: {} },
  { id: '4', key: 'verify', name: 'Verify', description: 'Validate against design system and standards', enabled: true, llm: 'gemini', status: 'idle', config: {} },
  { id: '5', key: 'iterate', name: 'Iterate', description: 'Auto-fix loop for review findings', enabled: true, llm: 'ollama', status: 'idle', config: { maxRetries: '3' } },
  { id: '6', key: 'test', name: 'Test', description: 'Generate comprehensive tests', enabled: true, llm: 'deepseek', status: 'idle', config: {} },
  { id: '7', key: 'deploy', name: 'Deploy', description: 'Generate deployment configurations', enabled: false, llm: 'ollama', status: 'idle', config: {} },
];

const PRESETS: { name: string; steps: string[] }[] = [
  { name: 'Quick Scaffold', steps: ['architect', 'code'] },
  { name: 'Full Production', steps: ['architect', 'code', 'review', 'verify', 'iterate', 'test', 'deploy'] },
  { name: 'Code Review Only', steps: ['review', 'verify', 'iterate'] },
  { name: 'Test Generation', steps: ['test'] },
  { name: 'Security Audit', steps: ['review', 'verify'] },
];

const LLM_LABELS: Record<LLMChoice, string> = {
  ollama: 'Ollama (Local)',
  gemini: 'Gemini API',
  anthropic: 'Anthropic API',
  deepseek: 'DeepSeek API',
  openrouter: 'OpenRouter API',
};

const LLM_COLORS: Record<LLMChoice, string> = {
  ollama: 'text-green-400 bg-green-500/10 border-green-500/30',
  gemini: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  anthropic: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  deepseek: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  openrouter: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
};

export function StudioPage() {
  const [steps, setSteps] = useState<PipelineStep[]>(() => {
    const saved = localStorage.getItem('openhub_pipeline_steps');
    return saved ? JSON.parse(saved) : DEFAULT_STEPS;
  });
  const [intent, setIntent] = useState('');
  const [targetStack, setTargetStack] = useState('react');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState('');

  useEffect(() => {
    localStorage.setItem('openhub_pipeline_steps', JSON.stringify(steps));
  }, [steps]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const toggleStep = (id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const setStepLLM = (id: string, llm: LLMChoice) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, llm } : s)));
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        enabled: preset.steps.includes(s.key),
      }))
    );
  };

  const resetSteps = () => {
    setSteps(DEFAULT_STEPS);
    setLogs([]);
    setActivePreset('');
  };

  const MCP_TOOLS: Record<string, string> = {
    architect: 'vibe_architect',
    code: 'vibe_code',
    review: 'vibe_review',
    verify: 'vibe_review',
    iterate: 'vibe_architect',
    test: 'vibe_test',
    deploy: 'vibe_architect',
  };

  const runPipeline = async () => {
    if (!intent.trim()) return;
    setIsRunning(true);
    setLogs([]);
    addLog(`Pipeline started with intent: "${intent}"`);

    const enabledSteps = steps.filter((s) => s.enabled);
    let context = intent;

    for (const step of enabledSteps) {
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: 'running' } : s)));
      addLog(`[${step.name}] Running with ${LLM_LABELS[step.llm]}...`);

      const tool = MCP_TOOLS[step.key] || 'vibe_architect';

      try {
        const res = await fetch(`/api/mcp/${tool}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({
            intent: context,
            constraints: [step.key],
            target_stack: targetStack,
            code: context,
            language: targetStack === 'python' || targetStack === 'rust' || targetStack === 'go' ? targetStack : 'typescript',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: 'success' } : s)));
          addLog(`[${step.name}] Completed successfully`);
          if (data?.plan?.architecture) context += ` | Architecture: ${data.plan.architecture}`;
        } else {
          setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: 'failed' } : s)));
          addLog(`[${step.name}] Failed: ${res.statusText} (code ${res.status})`);
        }
      } catch (err: any) {
        setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: 'failed' } : s)));
        addLog(`[${step.name}] Error: ${err.message}`);
      }
    }

    setIsRunning(false);
    addLog('Pipeline finished.');
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'skipped': return <Pause className="w-4 h-4 text-gray-600" />;
      default: return <div className="w-4 h-4 rounded-full border border-[#30363d]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0C10' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Studio Pipeline</h1>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Autonomous Agentic Workflow</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button onClick={resetSteps} className="flex items-center gap-1 px-3 py-1.5 bg-[#161b22] hover:bg-[#30363d] rounded text-gray-300 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <Link to="/workspace" className="flex items-center gap-1 px-3 py-1.5 bg-[#161b22] hover:bg-[#30363d] rounded text-gray-300 text-xs">
            <ArrowRight className="w-3.5 h-3.5" /> Workspace
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6">
          {/* Intent Input */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              What do you want to build?
            </label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Build a SaaS analytics dashboard with dark mode, user auth, and Stripe billing integration..."
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-4 text-sm text-white placeholder-gray-600 resize-none focus:border-purple-500 focus:outline-none"
              rows={3}
            />
            <div className="flex items-center gap-4">
              <select
                value={targetStack}
                onChange={(e) => setTargetStack(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-gray-300"
              >
                <option value="react">React + TypeScript</option>
                <option value="nextjs">Next.js</option>
                <option value="vue">Vue 3</option>
                <option value="python">Python / FastAPI</option>
                <option value="node">Node.js / Express</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
              </select>
              <button
                onClick={runPipeline}
                disabled={isRunning || !intent.trim()}
                className="flex items-center gap-2 px-5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-white text-xs font-bold transition-colors"
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? 'Running...' : 'Run Pipeline'}
              </button>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pipeline Steps</h2>
              <div className="flex items-center gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                      activePreset === p.name
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-[#161b22] border border-[#30363d] text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <AnimatePresence>
                {steps.map((step, idx) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      step.status === 'running' ? 'border-blue-500/50 bg-blue-500/5' :
                      step.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                      step.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                      step.enabled ? 'border-[#30363d] bg-[#161b22]' :
                      'border-[#21262d] bg-[#0D1117] opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center w-5">{statusIcon(step.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${step.enabled ? 'text-gray-200' : 'text-gray-600'}`}>
                          {step.name}
                        </span>
                        {step.status === 'success' && (
                          <span className="text-[10px] text-green-400 font-bold">DONE</span>
                        )}
                        {step.status === 'running' && (
                          <span className="text-[10px] text-blue-400 font-bold animate-pulse">RUNNING</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">{step.description}</p>
                    </div>

                    <select
                      value={step.llm}
                      onChange={(e) => setStepLLM(step.id, e.target.value as LLMChoice)}
                      disabled={!step.enabled || isRunning}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${LLM_COLORS[step.llm]} cursor-pointer disabled:opacity-50`}
                    >
                      {Object.entries(LLM_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => toggleStep(step.id)}
                      disabled={isRunning}
                      className={`w-9 h-5 rounded-full relative transition-colors ${
                        step.enabled ? 'bg-purple-600' : 'bg-[#30363d]'
                      } disabled:opacity-50`}
                    >
                      <div
                        className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                          step.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>

                    {/* Arrow between steps */}
                    {idx < steps.length - 1 && (
                      <div className="absolute left-7 bottom-[-18px] w-px h-4 bg-[#30363d]" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pipeline Log</h2>
              <div className="bg-[#0D1117] border border-[#30363d] rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                {logs.map((line, i) => (
                  <div
                    key={i}
                    className={`${
                      line.includes('Failed') || line.includes('Error') ? 'text-red-400' :
                      line.includes('successfully') || line.includes('Completed') ? 'text-green-400' :
                      'text-gray-500'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Settings */}
        <div className="w-72 border-l border-[#30363d] p-4 space-y-4 overflow-y-auto" style={{ background: '#0D1117' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pipeline Configuration</h3>

          <div className="space-y-3">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Model Routing</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">Local Tasks (Ollama)</span>
                  <span className="text-green-400 font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">API Providers</span>
                  <span className="text-yellow-400 font-bold">Config Required</span>
                </div>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Quality Gates</div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-[10px] text-gray-500">
                  <input type="checkbox" defaultChecked className="rounded" />
                  WCAG AAA Accessibility
                </label>
                <label className="flex items-center gap-2 text-[10px] text-gray-500">
                  <input type="checkbox" defaultChecked className="rounded" />
                  80% Test Coverage
                </label>
                <label className="flex items-center gap-2 text-[10px] text-gray-500">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Security Scan (SAST/SCA)
                </label>
                <label className="flex items-center gap-2 text-[10px] text-gray-500">
                  <input type="checkbox" className="rounded" />
                  Bundle Size &lt; 1MB
                </label>
              </div>
            </div>

            <Link
              to="/models"
              className="flex items-center justify-between w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                LLM Configuration
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
