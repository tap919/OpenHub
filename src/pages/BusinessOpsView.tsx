import React from 'react';
import { 
  DollarSign, PieChart, Users, Receipt, ArrowUpRight, 
  ArrowDownRight, Calendar, Download, Filter, Search, 
  CheckCircle2, Clock, AlertTriangle, MoreVertical, Briefcase
} from 'lucide-react';

export function BusinessOpsView() {
  const invoices = [
    { id: 'OH-7721', client: 'Cyberdyne Systems', amount: '$12,400', status: 'paid', date: '2026-05-10', project: 'Quantum Core' },
    { id: 'OH-7722', client: 'Initech Corp', amount: '$8,200', status: 'pending', date: '2026-05-12', project: 'Legacy Matrix' },
    { id: 'OH-7723', client: 'Weyland-Yutani', amount: '$45,000', status: 'overdue', date: '2026-04-28', project: 'Terraforming Hub' },
    { id: 'OH-7724', client: 'Stark Ind.', amount: '$3,150', status: 'paid', date: '2026-05-05', project: 'Arc Reactor UI' },
    { id: 'OH-7725', client: 'Tyrell Corp', amount: '$19,800', status: 'pending', date: '2026-05-15', project: 'Nexus-9 API' },
  ];

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-8 px-4 py-8 relative z-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
         <div>
            <h1 className="text-white">Business Intelligence</h1>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-2 flex items-center">
               Financial and Operational Analytics Manager
            </p>
         </div>
         <div className="flex gap-4">
           <button className="bg-gray-800 border border-gray-700 text-gray-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
              Export quarterly
           </button>
           <button className="bg-orange-500 text-black px-6 py-2 font-display text-lg hover:bg-orange-400 transition-all flex items-center shadow-lg">
              <Receipt className="w-4 h-4 mr-2" /> New Invoice
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Summary Stats */}
         <div className="industrial-card p-6">
            <div className="flex items-center justify-between mb-2">
               <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Revenue (MTD)</div>
               <div className="p-1 px-2 bg-green-500/10 text-green-500 text-[10px] font-bold">+14%</div>
            </div>
            <div className="text-4xl font-display text-white">$84,200.00</div>
         </div>
         <div className="industrial-card p-6">
            <div className="flex items-center justify-between mb-2">
               <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Burn</div>
               <div className="p-1 px-2 bg-blue-500/10 text-blue-500 text-[10px] font-bold">In Target</div>
            </div>
            <div className="text-4xl font-display text-white">$12,150.00 <span className="text-xs font-mono text-gray-600">/ mo</span></div>
         </div>
         <div className="industrial-card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
               <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg Margin</div>
               <div className="text-[10px] text-gray-400 font-bold">Standard</div>
            </div>
            <div className="text-4xl font-display text-white">68.4%</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Invoice Ledger */}
         <div className="lg:col-span-2 space-y-6">
            <div className="industrial-card overflow-hidden">
               <div className="px-6 py-4 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between">
                  <h2 className="text-gray-400 flex items-center text-sm mb-0 uppercase">
                     <Receipt className="w-4 h-4 mr-2" /> Billing Ledger
                  </h2>
                  <div className="flex items-center bg-black/30 border border-gray-700 px-2 py-1 rounded-sm">
                     <Search className="w-3.5 h-3.5 text-gray-600 mr-2" />
                     <input type="text" placeholder="Filter invoices..." className="bg-transparent text-[10px] font-bold text-gray-400 outline-none w-32 uppercase" />
                  </div>
               </div>

               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-[#30363D] bg-[#0D1117]">
                        <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Invoice</th>
                        <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Client / Project</th>
                        <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                        <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-3"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D]">
                     {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="text-xs font-mono text-white">{inv.id}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase">{inv.date}</div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="text-xs font-bold text-gray-300">{inv.client}</div>
                              <div className="text-[10px] text-blue-500/80 font-black uppercase tracking-widest flex items-center">
                                 <Briefcase className="w-2.5 h-2.5 mr-1" /> {inv.project}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="text-xs font-mono font-bold text-white">{inv.amount}</div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex justify-center">
                                 <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                    inv.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                    inv.status === 'overdue' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 
                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                 }`}>
                                    {inv.status}
                                 </span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button className="text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                 <MoreVertical className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               
               <div className="px-6 py-4 bg-[#0D1117] flex items-center justify-between">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Showing 5 of 42 invoices</div>
                  <div className="flex space-x-2">
                     <button className="p-1 px-2 bg-gray-800 border border-gray-700 text-xs text-gray-500 rounded disabled:opacity-30" disabled>PREV</button>
                     <button className="p-1 px-2 bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded">NEXT</button>
                  </div>
               </div>
            </div>
         </div>

         {/* Side: Project Profitability */}
         <div className="space-y-6">
            <div className="industrial-card p-6 border-l-4 border-green-500">
               <h2 className="text-gray-400 mb-6 flex items-center text-sm uppercase">
                  <PieChart className="w-4 h-4 mr-2 text-green-500" /> Margin Analysis
               </h2>
               <div className="space-y-6">
                  {[
                     { name: 'Quantum Core', revenue: '$42k', cost: '$12k', margin: 71 },
                     { name: 'Legacy Matrix', revenue: '$18k', cost: '$4k', margin: 77 },
                     { name: 'Nexus-9 API', revenue: '$31k', cost: '$22k', margin: 29 },
                  ].map(proj => (
                     <div key={proj.name} className="space-y-2">
                        <div className="flex justify-between items-end">
                           <div>
                              <div className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Project</div>
                              <div className="text-xs font-bold text-white uppercase tracking-widest">{proj.name}</div>
                           </div>
                           <div className="text-right">
                              <div className="text-[10px] font-black uppercase tracking-widest text-green-500">{proj.margin}% MARGIN</div>
                              <div className="text-[10px] font-mono text-gray-500">{proj.revenue} REV / {proj.cost} COST</div>
                           </div>
                        </div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${proj.margin}%` }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="industrial-card p-6 bg-gradient-to-br from-blue-500/10 to-transparent">
               <h2 className="text-gray-400 mb-4 flex items-center text-sm uppercase">
                  <Users className="w-4 h-4 mr-2" /> Client Sat (NPS)
               </h2>
               <div className="text-5xl font-display text-blue-500">8.9</div>
               <p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Aggregate cross-contract feedback score.</p>
               <div className="mt-6 flex space-x-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                     <div key={i} className={`flex-1 h-8 ${i <= 9 ? 'bg-blue-500' : 'bg-gray-800'} transition-all`}></div>
                  ))}
               </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-sm">
               <div className="flex items-center space-x-2 text-red-500 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest tracking-tighter">Collection Alert</span>
               </div>
               <p className="text-[10px] text-red-400 font-bold leading-relaxed">
                  Weyland-Yutani (Invoice OH-7723) is 14 days overdue. Manual followup recommended to maintain liquidity.
               </p>
               <button className="mt-4 w-full bg-red-600 text-white text-[10px] font-black uppercase py-2 hover:bg-red-500 transition-colors">
                  Send Notice
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
