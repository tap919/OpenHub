import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, Code, Star, GitBranch, Terminal, Cpu, Clock, Bot, 
  ChevronRight, Activity, DollarSign, Users, Briefcase, 
  BarChart3, TrendingUp, Zap, AlertTriangle 
} from 'lucide-react';
import { useStore } from '../store';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const { repositories, currentUser, registryItems } = useStore();

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-8 px-4 py-8 relative z-10">
      
      {/* Heavy Industrial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
         <div>
            <h1 className="text-white font-industrial text-4xl">OpenHub Command Console</h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-2 flex items-center">
               <span className="w-2 h-2 bg-orange-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> Site Status: Operational // Registry: OPENHUB-CORE-01
            </p>
         </div>
         <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-sm divide-x divide-[#30363d]">
            <div className="px-4 py-2 text-center">
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Active Contracts</div>
               <div className="text-xl font-display text-white">12</div>
            </div>
            <div className="px-4 py-2 text-center gauge-glow-orange border-b-2 border-orange-500">
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Utilization</div>
               <div className="text-xl font-display text-orange-500">94%</div>
            </div>
            <div className="px-4 py-2 text-center gauge-glow-green border-b-2 border-green-500">
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Cycle Time</div>
               <div className="text-xl font-display text-green-500">4.2d</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Column: Business Performance */}
        <div className="xl:col-span-1 space-y-6">
           <div className="industrial-card p-6 bg-blue-500/5 animate-warning-blink border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                 <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">AI Agent Active</div>
                 <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Co-pilot is currently indexing /src for optimization paths...</p>
           </div>
           <div className="industrial-card p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 text-gray-400 pointer-events-none">
                 <DollarSign className="w-24 h-24" />
              </div>
              <h2 className="mb-4 flex items-center text-gray-400 text-sm">
                 <TrendingUp className="w-4 h-4 mr-2" /> Financial Health
              </h2>
              <div className="space-y-4">
                 <div>
                    <div className="text-4xl font-display text-white">$142,500</div>
                    <div className="text-[10px] font-black text-green-500 uppercase flex items-center tracking-widest">
                       +12.4% vs last month <Zap className="w-2 h-2 ml-1" />
                    </div>
                 </div>
                 <div className="space-y-2 pt-4 border-t border-gray-100/5">
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500">Outstanding Invoices</span>
                       <span className="text-white font-mono text-[10px]">$12,400</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500">Projected Q3 Revenue</span>
                       <span className="text-white font-mono text-[10px]">$480k</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="industrial-card p-6">
              <h2 className="mb-4 flex items-center text-gray-400 text-sm">
                 <Users className="w-4 h-4 mr-2" /> Talent Grid
              </h2>
              <div className="space-y-3">
                 {[
                    { name: 'Architecture Team', load: 90, color: 'bg-orange-500' },
                    { name: 'Core Ops (Backend)', load: 75, color: 'bg-blue-500' },
                    { name: 'UI/UX Lab', load: 40, color: 'bg-green-500' },
                    { name: 'Infrastructure', load: 95, color: 'bg-red-500' },
                 ].map(team => (
                    <div key={team.name} className="space-y-1">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-gray-400">{team.name}</span>
                          <span className="text-white">{team.load}%</span>
                       </div>
                       <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${team.color}`} style={{ width: `${team.load}%` }}></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-orange-500 p-4 border border-orange-600 shadow-lg shadow-orange-500/10">
              <div className="flex items-start space-x-3 text-black">
                 <AlertTriangle className="w-5 h-5 shrink-0" />
                 <div>
                    <div className="text-[10px] font-black uppercase tracking-widest">Resource Alert</div>
                    <p className="text-[10px] font-bold mt-1 leading-tight">Infrastructure pod is at critical capacity. Schedule additional worker nodes or defer non-essential batch jobs.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Center: Repository Management (Operational View) */}
        <div className="xl:col-span-2 space-y-6">
           <div className="p-1 px-4 bg-[#1b2129] border border-[#30363d] inline-flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest">
              <button className="py-2 border-b-2 border-orange-500 text-white">Active Projects</button>
              <button className="py-2 text-gray-500 hover:text-gray-300 transition-colors">Client Repos</button>
              <button className="py-2 text-gray-500 hover:text-gray-300 transition-colors">Archives</button>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repo) => (
              <Link 
                key={repo.id}
                to={`/${repo.owner}/${repo.name}`}
                className="industrial-card group p-5 hover:bg-[#1c2128] transition-all relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-gray-800 border border-gray-700 text-orange-500 rounded-sm">
                        <Code className="w-5 h-5" />
                     </div>
                    <div>
                      <h3 className="text-xl font-display text-white group-hover:text-orange-500 transition-colors">
                        {repo.name}
                      </h3>
                      <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">ID: {repo.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-gray-600 fill-gray-600" />
                    <span className="text-xs font-mono text-gray-400">{repo.stars}</span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-xs mt-4 line-clamp-2 leading-relaxed">
                  {repo.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                   <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2 py-0.5 border border-blue-500/20">Enterprise</span>
                   <span className="text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 px-2 py-0.5 border border-green-500/20">Production</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100/5 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center text-gray-500 uppercase">
                    <Activity className="w-3 h-3 mr-1" /> ACTIVE NOW
                  </div>
                  <span className="text-gray-600">
                    {formatDistanceToNow(new Date(repo.updatedAt))} ago
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Registry & Tooling */}
        <div className="xl:col-span-1 space-y-6">
           <div className="industrial-card p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-400 flex items-center text-sm">
                   <BarChart3 className="w-4 h-4 mr-2" /> Toolkit Status
                </h2>
                <Link to="/registry" className="text-[10px] font-black text-blue-500 hover:underline px-2 tracking-widest">EXPLORE ALL</Link>
              </div>
              <div className="space-y-4">
                {registryItems.slice(0, 4).map((item) => (
                   <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-sm">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded bg-opacity-10 ${
                        item.type === 'agent' ? 'bg-purple-500 text-purple-500' : 
                        item.type === 'cli' ? 'bg-blue-500 text-blue-500' : 'bg-orange-500 text-orange-500'
                      }`}>
                         {item.type === 'agent' ? <Bot className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-gray-200">{item.name}</div>
                        <div className="text-[9px] text-gray-500 uppercase tracking-tighter">v{item.version}</div>
                      </div>
                    </div>
                    <div className="flex h-2 w-2 relative">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="industrial-card p-6 bg-gradient-to-br from-[#161b22] to-[#010409]">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-gray-400 text-sm flex items-center mb-0">
                    <Zap className="w-4 h-4 mr-2 text-orange-500" /> Productivity Matrix
                 </h2>
                 <Link to="/autonomous" className="text-[10px] font-black text-orange-500 hover:underline tracking-widest">ORCHESTRATE</Link>
              </div>
              <div className="font-mono text-[10px] space-y-2 overflow-hidden h-40 opacity-60">
                 <div className="text-green-500 animate-pulse">[{new Date().toLocaleTimeString()}] git-server: pushed 4 objects to web:main</div>
                 <div className="text-blue-500">[16:03:52] ci-runner: build success for commit #fa231</div>
                 <div className="text-orange-500">[16:02:44] security-bot: scanned 12 files, 0 leaks</div>
                 <div className="text-gray-500">[16:01:21] openhub-daemon: heartbeat verified</div>
                 <div className="text-gray-500">[16:00:55] audit-log: user admin authenticated</div>
                 <div className="text-gray-500">[15:58:32] auth-service: certificate renewed</div>
                 <div className="text-gray-500">[15:55:12] log-aggregator: buffer flushed</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
