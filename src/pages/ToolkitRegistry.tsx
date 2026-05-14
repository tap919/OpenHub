import React, { useState } from 'react';
import { useStore, RegistryItem, RegistryItemType } from '../store';
import { 
  Terminal, Cpu, Clock, Bot, Plus, Search, Filter, ShieldCheck, 
  Play, Settings, ExternalLink, Power, AlertTriangle, Briefcase, 
  Zap, Package, Code, Activity, UploadCloud, ChevronRight 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ToolkitRegistry() {
  const { registryItems, addRegistryItem, updateRegistryItemStatus, currentUser, fetchRegistryItems } = useStore();
  const [filter, setFilter] = useState<RegistryItemType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'cli' as RegistryItemType,
    description: '',
    version: '1.0.0'
  });

  React.useEffect(() => {
    fetchRegistryItems();
  }, []);
  
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addRegistryItem({
      ...newItem,
      author: currentUser.username
    });
    setIsAdding(false);
    setNewItem({ name: '', type: 'cli', description: '', version: '1.0.0' });
  };

  const filteredItems = registryItems.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIcon = (type: RegistryItemType) => {
    switch (type) {
      case 'cli': return <Terminal className="w-5 h-5" />;
      case 'mcp': return <Cpu className="w-5 h-5" />;
      case 'cron': return <Clock className="w-5 h-5" />;
      case 'agent': return <Bot className="w-5 h-5" />;
    }
  };

  const handleToggle = (id: string, currentStatus: string) => {
    updateRegistryItemStatus(id, currentStatus === 'active' ? 'inactive' : 'active');
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-8 px-4 py-8 relative z-10">
      
      {/* Heavy Industrial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
         <div>
            <h1 className="text-white">Tooling Logistics</h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-2">Active inventory of binaries, agents, and automated hooks.</p>
         </div>
         <button 
           onClick={() => setIsAdding(true)}
           className="bg-orange-500 text-black px-6 py-3 font-display text-xl hover:bg-orange-400 transition-all flex items-center shadow-lg"
         >
            <Plus className="w-5 h-5 mr-3" /> New Resource
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="industrial-card p-6">
            <h2 className="text-gray-400 mb-4 flex items-center text-sm">
               <Filter className="w-4 h-4 mr-2" /> Sector Filter
            </h2>
            <div className="space-y-2">
               {(['all', 'cli', 'mcp', 'cron', 'agent'] as const).map((t) => (
                 <button 
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-orange-500 text-black' : 'text-gray-500 hover:text-white'}`}
                 >
                   {t}
                 </button>
               ))}
            </div>
          </div>

          <div className="industrial-card p-6 border-l-4 border-blue-500">
             <h2 className="text-gray-400 mb-4 flex items-center text-sm">
                <Search className="w-4 h-4 mr-2" /> Binary Search
             </h2>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ID or name..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-sm pl-10 pr-4 py-2 text-xs font-mono text-white outline-none focus:border-blue-500"
                />
             </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-sm">
             <div className="flex items-center space-x-2 text-blue-500 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Automation Tip</span>
             </div>
             <p className="text-[10px] text-blue-300 font-bold leading-relaxed">
                Connect your MCP skills directly to the Enterprise Terminal for autonomous resource management.
             </p>
          </div>
        </div>

        {/* Registry Content */}
        <div className="md:col-span-3 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div key={item.id} className={`industrial-card group p-5 hover:bg-[#1c2128] transition-all relative ${item.status === 'inactive' ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-start justify-between">
                     <div className={`p-2 rounded-sm border ${
                       item.type === 'agent' ? 'border-purple-500 text-purple-500 bg-purple-500/10' : 
                       item.type === 'cli' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-orange-500 text-orange-500 bg-orange-500/10'
                     }`}>
                        {getIcon(item.type)}
                     </div>
                     <div className="flex items-center space-x-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                         item.status === 'active' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'
                       }`}>
                          {item.status}
                       </span>
                       <button 
                         onClick={() => handleToggle(item.id, item.status)}
                         className="p-1 text-gray-500 hover:text-white transition-colors"
                       >
                          <Power className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>

                  <div className="mt-4">
                     <h3 className="text-lg font-display text-white group-hover:text-orange-500 transition-colors">
                        {item.name}
                     </h3>
                     <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">v{item.version}</div>
                     <p className="text-gray-400 text-[10px] mt-3 line-clamp-2 font-bold uppercase tracking-tight leading-tight">{item.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100/5 flex items-center justify-between">
                     <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center">
                        <Briefcase className="w-3 h-3 mr-1" /> {item.author}
                     </div>
                     <div className="flex space-x-1">
                        <button className="p-1 px-2 border border-gray-700 hover:border-blue-500 text-gray-500 hover:text-blue-500 rounded transition-all">
                           <Settings className="w-3 h-3" />
                        </button>
                        <button className="p-1 px-2 border border-gray-700 hover:border-green-500 text-gray-500 hover:text-green-500 rounded transition-all">
                           <Play className="w-3 h-3" />
                        </button>
                     </div>
                  </div>
                </div>
              ))}
           </div>

           {/* Live Execution feed in Registry as well */}
           <div className="bg-[#0D1117] border border-[#30363D] p-6 rounded-sm">
               <h2 className="text-gray-400 mb-6 text-sm flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-green-500" /> Resource Telemetry
               </h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-black/20 p-4 border border-white/5">
                     <div className="text-[9px] font-black tracking-widest text-gray-500 uppercase">CPU-Ticks</div>
                     <div className="text-xl font-display text-white">4.2M</div>
                  </div>
                  <div className="bg-black/20 p-4 border border-white/5">
                     <div className="text-[9px] font-black tracking-widest text-gray-500 uppercase">Heap Size</div>
                     <div className="text-xl font-display text-white">124MB</div>
                  </div>
                  <div className="bg-black/20 p-4 border border-white/5">
                     <div className="text-[9px] font-black tracking-widest text-gray-500 uppercase">Threads</div>
                     <div className="text-xl font-display text-orange-500">12 Active</div>
                  </div>
                  <div className="bg-black/20 p-4 border border-white/5">
                     <div className="text-[9px] font-black tracking-widest text-gray-500 uppercase">Status</div>
                     <div className="text-xl font-display text-green-500">SYNC</div>
                  </div>
               </div>
               <div className="font-mono text-[9px] text-gray-600 bg-black/40 p-4 rounded-sm border border-white/5 h-32 overflow-hidden">
                  <div>[OP-SEQ: 421] Initiating cron: nightly-cleanup...</div>
                  <div>[OP-SEQ: 421] Cleaning dangling docker volumes (12.4GB freed)</div>
                  <div>[OP-SEQ: 422] MCP: skill 'jira-sync' triggered by board change</div>
                  <div>[OP-SEQ: 423] AGENT: 'PR-Reviewer' analyzing src/main.ts</div>
                  <div>[OP-SEQ: 423] AGENT: No blocking issues found. Posting approval.</div>
               </div>
           </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="industrial-card bg-[#0d1117] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-orange-500 p-6 text-black">
                <h3 className="text-2xl font-display flex items-center">
                   <UploadCloud className="w-6 h-6 mr-3" />
                   Provision New Resource
                </h3>
             </div>
             <form onSubmit={handleAdd} className="p-8 space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resource Identifier</label>
                   <input 
                     required
                     value={newItem.name}
                     onChange={e => setNewItem({...newItem, name: e.target.value})}
                     className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-3 text-sm text-white font-mono outline-none focus:border-orange-500"
                     placeholder="e.g. TF-VALIDATOR-01"
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Class</label>
                      <select 
                        value={newItem.type}
                        onChange={e => setNewItem({...newItem, type: e.target.value as RegistryItemType})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                      >
                         <option value="cli">CLI Tool</option>
                         <option value="mcp">MCP Skill</option>
                         <option value="cron">Cron Job</option>
                         <option value="agent">Agent</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revision</label>
                      <input 
                        value={newItem.version}
                        onChange={e => setNewItem({...newItem, version: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-3 text-sm text-white font-mono outline-none focus:border-orange-500"
                      />
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manifest Summary</label>
                   <textarea 
                     required
                     value={newItem.description}
                     onChange={e => setNewItem({...newItem, description: e.target.value})}
                     className="w-full bg-gray-900 border border-gray-700 rounded-sm px-4 py-3 text-sm text-white font-mono outline-none focus:border-orange-500 min-h-[100px]"
                     placeholder="Operational objectives..."
                   />
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                     type="button"
                     onClick={() => setIsAdding(false)}
                     className="flex-1 px-4 py-3 border border-gray-700 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                   >
                      Abort
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 px-4 py-3 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg"
                   >
                      Register
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
