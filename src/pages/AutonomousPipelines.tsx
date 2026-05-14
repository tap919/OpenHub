import React, { useState, useEffect } from 'react';
import { 
  Zap, Bot, Cpu, Activity, Clock, Terminal, ShieldCheck, 
  Play, Pause, RefreshCw, Layers, GitBranch, Terminal as TerminalIcon,
  CheckCircle2, AlertCircle, Loader2, ChevronRight, Share2, Target, BarChart3,
  Plus, Settings, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PipelineTask {
  id: string;
  name: string;
  status: 'running' | 'queued' | 'success' | 'failed';
  type: 'refactor' | 'security' | 'deploy' | 'test';
  progress: number;
  runtime: string;
  agent: string;
}

export function AutonomousPipelines() {
  const [tasks, setTasks] = useState<PipelineTask[]>([
    { id: 't1', name: 'Legacy Code Refactor (OpenHub-v2)', status: 'running', type: 'refactor', progress: 65, runtime: '12m 4s', agent: 'RefactorBot-Alpha' },
    { id: 't2', name: 'Universal Security Scan (Global)', status: 'success', type: 'security', progress: 100, runtime: '4m 32s', agent: 'GuardAgent-9' },
    { id: 't3', name: 'Auto-Dependency Alignment', status: 'running', type: 'refactor', progress: 28, runtime: '2m 15s', agent: 'RefactorBot-Alpha' },
    { id: 't4', name: 'E2E Productivity Benchmarking', status: 'failed', type: 'test', progress: 82, runtime: '15m 1s', agent: 'Bench-Agent' },
    { id: 't5', name: 'Zero-Downtime Hotfix Propagator', status: 'queued', type: 'deploy', progress: 0, runtime: '0s', agent: 'Deploy-Commander' },
  ]);

  const [activeMetrics, setActiveMetrics] = useState({
    autonomyLevel: 82,
    humanIntervention: 4,
    cycleTimeReduction: 35,
    agentHealth: 98
  });

  // Simulated live progress
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.status === 'running') {
          const nextProgress = task.progress + Math.random() * 2;
          if (nextProgress >= 100) {
            return { ...task, progress: 100, status: 'success' };
          }
          return { ...task, progress: nextProgress };
        }
        return task;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-8 px-4 py-8 relative z-10">
      
      {/* Dev Excellence Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
         <div>
            <h1 className="text-white font-industrial text-4xl">Autonomous Orchestration</h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-2 flex items-center">
               <Zap className="w-3 h-3 mr-2 text-orange-500" /> Human Autonomy Index: 0.82 // Mode: FULL-AUTO
            </p>
         </div>
         <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-sm">
            <button className="bg-orange-500 text-black px-4 py-2 font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center">
               <Plus className="w-3.5 h-3.5 mr-2" /> Launch Agent
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Metric Grid */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Autonomy Level', val: `${activeMetrics.autonomyLevel}%`, icon: Bot, color: 'text-orange-500' },
            { label: 'Human Overrides', val: activeMetrics.humanIntervention, icon: ShieldCheck, color: 'text-blue-500' },
            { label: 'Speed Boost', val: `+${activeMetrics.cycleTimeReduction}%`, icon: Zap, color: 'text-green-500' },
            { label: 'Worker Sync', val: `${activeMetrics.agentHealth}%`, icon: Activity, color: 'text-purple-500' },
          ].map((m, i) => (
            <div key={i} className="industrial-card p-6 flex flex-col items-center text-center">
              <m.icon className={`w-8 h-8 mb-4 ${m.color}`} />
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{m.label}</div>
              <div className="text-3xl font-display text-white">{m.val}</div>
            </div>
          ))}
        </div>

        {/* Task Control Center */}
        <div className="lg:col-span-3 space-y-6">
          <div className="industrial-card overflow-hidden">
             <div className="p-6 border-b border-white/5 bg-[#1c2128]/50 flex justify-between items-center">
                <h2 className="text-white text-sm flex items-center mb-0">
                   <Layers className="w-4 h-4 mr-3 text-orange-500" /> Active Autonomous Flows
                </h2>
                <div className="flex space-x-2">
                   <button className="p-1 px-3 border border-gray-700 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest">Filter: Running</button>
                   <button className="p-1 px-3 border border-gray-700 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest text-orange-500 border-orange-500/20">Clear History</button>
                </div>
             </div>
             <div className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <div key={task.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                     <div className="flex items-center space-x-6">
                        <div className={`p-3 rounded-sm border ${
                          task.status === 'running' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' :
                          task.status === 'success' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                          task.status === 'failed' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                          'border-gray-500/30 text-gray-500 bg-gray-500/10'
                        }`}>
                           {task.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                            task.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                            task.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                            <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                           <div className="flex items-center space-x-3">
                              <h4 className="text-white font-industrial text-xl leading-none">{task.name}</h4>
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-800 text-gray-400 border border-white/10 rounded-full">
                                 {task.type}
                              </span>
                           </div>
                           <div className="flex items-center space-x-4 mt-2">
                              <span className="text-[10px] font-mono text-gray-500 flex items-center">
                                 <Bot className="w-3 h-3 mr-1" /> {task.agent}
                              </span>
                              <span className="text-[10px] font-mono text-gray-500 flex items-center">
                                 <Clock className="w-3 h-3 mr-1" /> RUNTIME: {task.runtime}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center space-x-8">
                        <div className="w-32">
                           <div className="flex justify-between text-[10px] font-black mb-1">
                              <span className="text-gray-500 uppercase">Analysis</span>
                              <span className="text-white">{Math.round(task.progress)}%</span>
                           </div>
                           <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                className={`h-full ${
                                  task.status === 'success' ? 'bg-green-500' :
                                  task.status === 'failed' ? 'bg-red-500' :
                                  'bg-orange-500'
                                }`}
                              />
                           </div>
                        </div>
                        <button className="p-2 border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                           <Settings className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="industrial-card h-64 bg-black/80 p-6 flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                   <Terminal className="w-4 h-4 text-green-500" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Intelligence Stream</span>
                </div>
                <div className="flex space-x-1">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                   <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
             </div>
             <div className="flex-1 font-mono text-[10px] space-y-1 overflow-hidden opacity-80">
                <div className="text-gray-500">[SYSTEM] Initializing Agent Fleet Alpha...</div>
                <div className="text-green-500">[REFACTOR-BOT] Scanning legacy structures in /src/deprecated...</div>
                <div className="text-blue-500">[GUARD-AGENT] Global security patch v4.2 applied successfully.</div>
                <div className="text-orange-500">[DEPLOY-CMD] Hotfix propagation started for cluster-west-1a.</div>
                <div className="text-gray-500">[SYSTEM] Worker Sync at 98% efficiency.</div>
                <div className="text-green-500">[REFACTOR-BOT] Identified 12 redundant dependencies. Proactive pruning queued.</div>
                <div className="text-red-500">[BENCH-AGENT] E2E productivity bottleneck detected in Auth service. Analyzing...</div>
                <div className="text-blue-500">[GUARD-AGENT] Firewall rules synchronized across all edge nodes.</div>
                <div className="text-gray-500 animate-pulse">_</div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="industrial-card p-8">
                <h3 className="text-white font-industrial text-xl mb-6 border-l-4 border-blue-500 pl-4">Developer Shadow Mode</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-tight leading-relaxed mb-8">
                   OpenHub agents observe your local dev patterns to preemptively cache dependencies, run relevant unit tests, and provision isolated staging ephemeral environments.
                </p>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-sm">
                      <div className="flex items-center space-x-3">
                         <TerminalIcon className="w-4 h-4 text-blue-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white">Pre-emptive CI</span>
                      </div>
                      <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">ACTIVE</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-sm">
                      <div className="flex items-center space-x-3">
                         <RefreshCw className="w-4 h-4 text-purple-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white">Dynamic Hotloading</span>
                      </div>
                      <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">ACTIVE</span>
                   </div>
                </div>
             </div>
             <div className="industrial-card p-8 bg-black/40">
                <h3 className="text-white font-industrial text-xl mb-6 border-l-4 border-orange-500 pl-4">Optimization Recommendations</h3>
                <div className="space-y-6">
                   <div className="flex space-x-4">
                      <Target className="w-6 h-6 text-orange-500 shrink-0" />
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Redundant Docker Layers</div>
                         <p className="text-[9px] text-gray-500 leading-normal uppercase font-bold">Identified 4 shared base images. Merging could save 1.2GB per build node.</p>
                      </div>
                   </div>
                   <div className="flex space-x-4">
                      <Share2 className="w-6 h-6 text-blue-500 shrink-0" />
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">Distributed Cache Hit-Rate</div>
                         <p className="text-[9px] text-gray-500 leading-normal uppercase font-bold">Local redis instance is under-utilized. Mirroring to cluster-0-east recommended.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar: Agent Fleet */}
        <div className="lg:col-span-1 space-y-6">
           <div className="industrial-card p-6">
              <h2 className="text-gray-400 mb-6 text-sm flex items-center">
                 <Bot className="w-4 h-4 mr-3" /> Fleet Intelligence
              </h2>
              <div className="space-y-6">
                 {[
                    { name: 'RefactorBot-Alpha', load: 12, health: 100, label: 'Optimization' },
                    { name: 'GuardAgent-9', load: 0, health: 98, label: 'Security' },
                    { name: 'Deploy-Commander', load: 85, health: 100, label: 'Logistics' },
                    { name: 'Bench-Agent', load: 42, health: 85, label: 'Performance' },
                 ].map(agent => (
                    <div key={agent.name} className="space-y-2">
                       <div className="flex justify-between items-end">
                          <div>
                             <div className="text-white font-mono text-[11px]">{agent.name}</div>
                             <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{agent.label}</div>
                          </div>
                          <div className={`text-[10px] font-mono ${agent.health < 90 ? 'text-orange-500' : 'text-green-500'}`}>
                             {agent.health}%
                          </div>
                       </div>
                       <div className="w-full bg-gray-800 h-1 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${agent.load}%` }}></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="industrial-card p-6 border-t-4 border-orange-500">
              <h2 className="text-gray-400 mb-4 text-sm flex items-center">
                 <BarChart3 className="w-4 h-4 mr-3" /> Efficiency Gains
              </h2>
              <div className="h-32 flex items-end space-x-1 mb-4">
                 {[20, 35, 45, 30, 55, 70, 85, 60, 75, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-orange-500/20 border-t border-orange-500" style={{ height: `${h}%` }}></div>
                 ))}
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                 Autonomous intervention has saved <span className="text-white">42 engineering hours</span> in the last 72-hour cycle.
              </p>
           </div>
        </div>

      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 industrial-card p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-white font-industrial text-xl mb-0 border-l-4 border-green-500 pl-4">Developer Activity Heatmap</h3>
               <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Zone: Global-01</div>
            </div>
            <div className="grid grid-cols-12 md:grid-cols-24 gap-1">
               {Array.from({ length: 24 * 7 }).map((_, i) => (
                  <div 
                     key={i} 
                     className={`h-4 rounded-sm transition-all hover:scale-125 cursor-help ${
                        Math.random() > 0.8 ? 'bg-orange-500 shadow-[0_0_8px_rgba(215,96,39,0.5)]' :
                        Math.random() > 0.5 ? 'bg-orange-500/40' :
                        Math.random() > 0.3 ? 'bg-orange-500/10' :
                        'bg-gray-800/20'
                     }`}
                  ></div>
               ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
               <div className="flex items-center space-x-2 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                  <span>Less</span>
                  <div className="flex space-x-1">
                     <div className="w-2 h-2 bg-gray-800/20 rounded-xs"></div>
                     <div className="w-2 h-2 bg-orange-500/10 rounded-xs"></div>
                     <div className="w-2 h-2 bg-orange-500/40 rounded-xs"></div>
                     <div className="w-2 h-2 bg-orange-500 rounded-xs"></div>
                  </div>
                  <span>More</span>
               </div>
               <p className="text-[9px] text-gray-500 font-bold uppercase italic">Peak velocity detected during UTC 14:00 - 18:00</p>
            </div>
         </div>

         <div className="md:col-span-1 industrial-card p-8 bg-orange-500/5">
            <h3 className="text-white font-industrial text-xl mb-6 flex items-center">
               <Search className="w-5 h-5 mr-3 text-orange-500" /> Hot Research Feed
            </h3>
            <div className="space-y-6">
               {[
                  { title: 'Rust-based WASM runtimes', trend: '+45%' },
                  { title: 'Deno 2.x breaking changes', trend: '+112%' },
                  { title: 'Vector DB sharding patterns', trend: '+18%' },
                  { title: 'LLM context window limits', trend: '+95%' },
               ].map((item, i) => (
                  <div key={i} className="flex justify-between items-start group cursor-pointer">
                     <div className="flex-1">
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-orange-500 transition-colors">{item.title}</div>
                        <div className="text-[8px] text-gray-500 uppercase mt-1">Trending Topics</div>
                     </div>
                     <div className="text-[10px] font-mono text-green-500">{item.trend}</div>
                  </div>
               ))}
            </div>
            <button className="w-full mt-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 transition-all">
               Open Knowledge Base
            </button>
         </div>
      </div>
    </div>
  );
}
