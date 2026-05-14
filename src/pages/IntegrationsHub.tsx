import React, { useState, useEffect } from 'react';
import { 
  Database, Cloud, Globe, Shield, Zap, 
  ExternalLink, Plus, RefreshCw, Server, 
  Layers, Lock, Activity, Link as LinkIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export function IntegrationsHub() {
  const [integrations, setIntegrations] = useState([
    { 
      id: 'supabase', 
      name: 'Supabase DB', 
      type: 'database', 
      status: 'connected', 
      latency: 24, 
      region: 'us-east-1',
      lastSync: '3m ago'
    },
    { 
      id: 'vercel', 
      name: 'Vercel Edge', 
      type: 'deployment', 
      status: 'syncing', 
      latency: 45, 
      region: 'global',
      lastSync: 'now'
    },
    { 
      id: 'redis', 
      name: 'Upstash Redis', 
      type: 'cache', 
      status: 'connected', 
      latency: 12, 
      region: 'us-west-2',
      lastSync: '15m ago'
    },
    { 
      id: 'aws', 
      name: 'AWS S3 Assets', 
      type: 'storage', 
      status: 'idle', 
      latency: 0, 
      region: 'eu-central-1',
      lastSync: '2h ago'
    }
  ]);

  // Simulate jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setIntegrations(prev => prev.map(item => {
        if (item.status === 'idle') return item;
        const jitter = Math.floor(Math.random() * 5) - 2;
        return { ...item, latency: Math.max(8, item.latency + jitter) };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-8 px-4 py-8 relative z-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
         <div>
            <h1 className="text-white font-industrial text-4xl">Cloud Integrations Hub</h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-2 flex items-center">
               <Shield className="w-3 h-3 mr-2 text-blue-500" /> Secure Tunnel Active // Tunnel: OH-TUNNEL-X9
            </p>
         </div>
         <div className="flex space-x-4">
            <button className="bg-[#161b22] border border-[#30363d] text-white px-4 py-2 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all flex items-center">
               <RefreshCw className="w-3.5 h-3.5 mr-2" /> Global Re-Sync
            </button>
            <button className="bg-orange-500 text-black px-4 py-2 font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center">
               <Plus className="w-3.5 h-3.5 mr-2" /> Add Provider
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Live Connectivity Map Placeholder */}
         <div className="lg:col-span-2 industrial-card p-1 relative overflow-hidden bg-black/40 min-h-[400px]">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
               <div className="grid grid-cols-12 h-full">
                  {Array.from({ length: 12 }).map((_, i) => (
                     <div key={i} className="border-r border-white/5 h-full"></div>
                  ))}
               </div>
            </div>
            <div className="relative p-10 h-full flex flex-col justify-center items-center">
               <div className="w-64 h-64 border-2 border-dashed border-gray-800 rounded-full flex items-center justify-center animate-spin-slow">
                  <div className="w-48 h-48 border border-blue-500/20 rounded-full flex items-center justify-center">
                     <div className="w-32 h-32 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center">
                        <Globe className="w-12 h-12 text-orange-500 animate-pulse" />
                     </div>
                  </div>
               </div>
               <div className="mt-12 text-center">
                  <div className="text-xl font-display text-white tracking-widest">Global Edge Network</div>
                  <div className="text-[10px] font-mono text-gray-500 mt-2 uppercase">Tracing 4 active nodes across 3 continents</div>
               </div>
               
               {/* Floating Data Points */}
               <motion.div 
                  animate={{ y: [0, -10, 0] }} 
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-1/4 left-1/4 p-3 bg-[#161b22] border border-blue-500/30 font-mono text-[8px] text-blue-500"
               >
                  US-EAST-1: OK (24ms)
               </motion.div>
               <motion.div 
                  animate={{ y: [0, 10, 0] }} 
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute bottom-1/4 right-1/4 p-3 bg-[#161b22] border border-orange-500/30 font-mono text-[8px] text-orange-500"
               >
                  EU-CENTRAL-1: IDLE
               </motion.div>
            </div>
         </div>

         {/* Integration List */}
         <div className="lg:col-span-1 space-y-4">
            <h2 className="text-gray-400 text-sm mb-4 flex items-center tracking-widest">
               <LinkIcon className="w-4 h-4 mr-3" /> Active Connectors
            </h2>
            {integrations.map((item) => (
               <div key={item.id} className="industrial-card p-5 group hover:bg-[#1c2128] transition-all">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-sm ${
                           item.type === 'database' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                           item.type === 'deployment' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                           'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}>
                           {item.type === 'database' ? <Database className="w-5 h-5" /> : 
                            item.type === 'deployment' ? <Server className="w-5 h-5" /> :
                            <Layers className="w-5 h-5" />}
                        </div>
                        <div>
                           <h4 className="text-white font-industrial text-xl mb-0">{item.name}</h4>
                           <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-[8px] font-black uppercase tracking-widest ${
                                 item.status === 'connected' ? 'text-green-500' : 
                                 item.status === 'syncing' ? 'text-blue-500' : 'text-gray-500'
                              }`}>
                                 {item.status}
                              </span>
                              <span className="text-[8px] text-gray-500 font-mono tracking-tighter uppercase">
                                 LATENCY: {item.latency > 0 ? `${item.latency}ms` : 'N/A'}
                              </span>
                           </div>
                        </div>
                     </div>
                     <button className="p-2 border border-white/5 text-gray-600 hover:text-white transition-colors group-hover:border-white/10">
                        <ExternalLink className="w-4 h-4" />
                     </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                     <div>
                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Region</div>
                        <div className="text-[10px] text-white font-mono uppercase">{item.region}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Last Sync</div>
                        <div className="text-[10px] text-white font-mono uppercase">{item.lastSync}</div>
                     </div>
                  </div>
               </div>
            ))}

            <div className="p-6 bg-blue-500/5 border border-blue-500/20 border-l-4 border-blue-500 mt-8">
               <div className="flex items-center space-x-3 mb-3">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Security Protocol</span>
               </div>
               <p className="text-[9px] text-gray-500 leading-relaxed font-bold uppercase">
                  All 3rd party traffic is routed through encrypted gRPC tunnels. Credentials are rotated every 24 hours automatically by OpenHub Vault.
               </p>
            </div>
         </div>

      </div>
    </div>
  );
}
