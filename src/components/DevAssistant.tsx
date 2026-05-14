import React, { useState } from 'react';
import { 
  Bot, Terminal, Zap, Shield, Search, BookOpen, 
  ExternalLink, ChevronRight, X, MessageSquare, 
  Database, Cloud, GitCommit, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DevAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'research' | 'deploy'>('assistant');

  const researchTopics = [
    { title: 'K8s Sidecar Optimization', source: 'Internal Wiki', time: '2m ago' },
    { title: 'Drizzle ORM v4 Migration', source: 'DocsHub', time: '15m ago' },
    { title: 'Postgres Index Sharding', source: 'RFC-402', time: '1h ago' },
  ];

  return (
    <>
      {/* Floating Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-[60] bg-orange-500 text-black p-4 rounded-sm shadow-[0_0_20px_rgba(215,96,39,0.5)] hover:scale-110 transition-all flex items-center group overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
        <Bot className="w-6 h-6 mr-3" />
        <span className="font-display text-xl tracking-wider">Dev_CO-PILOT</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed inset-y-0 right-0 w-[450px] z-[70] bg-[#0d1117] border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.8)] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-[#161b22] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 rounded-sm">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div>
                   <h2 className="text-white text-xl mb-0 leading-none">OpenHub Co-Pilot</h2>
                   <div className="text-[10px] text-gray-400 font-mono flex items-center mt-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span> SYSTEM READY // GPT-4o-ENABLED
                   </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Nav */}
            <div className="flex divide-x divide-white/5 border-b border-white/10">
              {[
                { id: 'assistant', label: 'AI_ASSIST', icon: MessageSquare },
                { id: 'research', label: 'RESEARCH', icon: BookOpen },
                { id: 'deploy', label: '3RD_PARTY', icon: Cloud },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 flex flex-col items-center justify-center transition-all ${
                    activeTab === tab.id ? 'bg-orange-500 text-black' : 'text-gray-500 hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mb-2" />
                  <span className="text-[10px] font-black tracking-widest uppercase">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activeTab === 'assistant' && (
                <div className="space-y-6">
                  <div className="bg-white/5 p-4 border border-white/5 rounded-sm">
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      "I've analyzed your local cluster. You're currently seeing high memory pressure in the Redis container. Would you like me to suggest some key eviction strategies?"
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button className="industrial-card p-4 text-left hover:bg-white/5 transition-all">
                       <Sparkles className="w-4 h-4 text-orange-500 mb-2" />
                       <div className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">Review Commit Policy</div>
                    </button>
                    <button className="industrial-card p-4 text-left hover:bg-white/5 transition-all">
                       <Database className="w-4 h-4 text-blue-500 mb-2" />
                       <div className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">Database Health Check</div>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                     <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Live Suggestions</div>
                     <div className="space-y-3">
                        <div className="flex items-start space-x-3 group cursor-pointer">
                           <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5"></div>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                              Update .env.production to include new CDN endpoints.
                           </p>
                        </div>
                        <div className="flex items-start space-x-3 group cursor-pointer">
                           <div className="w-1 h-1 bg-green-500 rounded-full mt-1.5"></div>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight group-hover:text-green-500 transition-colors">
                              Legacy module detected in /src/lib/old_utils.ts. Auto-refactor available.
                           </p>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'research' && (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search Internal & External Docs..."
                      className="w-full bg-[#161b22] border border-white/10 py-3 pl-12 pr-4 text-sm text-white focus:border-orange-500 outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Research Sessions</div>
                    {researchTopics.map((topic, i) => (
                      <div key={i} className="p-4 border border-white/5 bg-black/20 hover:border-orange-500/50 transition-all group flex justify-between items-center cursor-pointer">
                         <div>
                            <div className="text-white text-sm font-bold">{topic.title}</div>
                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1 flex items-center">
                               {topic.source} <span className="mx-2">•</span> {topic.time}
                            </div>
                         </div>
                         <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-orange-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'deploy' && (
                <div className="space-y-6">
                   <div className="industrial-card p-6 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center space-x-3">
                            <Database className="w-5 h-5 text-blue-500" />
                            <h4 className="text-white text-sm font-black uppercase tracking-widest mb-0">Supabase (3rd Party)</h4>
                         </div>
                         <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 border border-green-500/20">CONNECTED</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mb-4">DB_INSTANCE: prod-cluster-east-1</div>
                      <button className="w-full py-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                         SYNC SCHEMA
                      </button>
                   </div>

                   <div className="industrial-card p-6 border-l-4 border-orange-500">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center space-x-3">
                            <Cloud className="w-5 h-5 text-orange-500" />
                            <h4 className="text-white text-sm font-black uppercase tracking-widest mb-0">Vercel Edge</h4>
                         </div>
                         <span className="text-[9px] bg-blue-500/10 text-blue-500 px-2 py-0.5 border border-blue-500/20">MIGRATING</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mb-4">DEPLOYMENT_URL: openhub-edge-72fac.vercel.app</div>
                      <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mb-4">
                         <div className="h-full bg-orange-500 w-[65%]"></div>
                      </div>
                      <button className="w-full py-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-black transition-all">
                         TERMINATE TASK
                      </button>
                   </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#161b22] border-t border-white/10 flex items-center space-x-2">
               <input 
                type="text" 
                placeholder="Talk to OpenHub AI..."
                className="flex-1 bg-black/40 border border-white/10 p-3 text-xs text-white outline-none focus:border-orange-500"
               />
               <button className="p-3 bg-orange-500 text-black hover:bg-white transition-colors">
                  <Zap className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
