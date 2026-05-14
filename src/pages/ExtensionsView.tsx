import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Puzzle, ExternalLink, Shield, Zap, Package, Globe } from 'lucide-react';

export function ExtensionsView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => state.repositories.find(r => r.owner === owner && r.name === repoName));

  if (!repo) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
           <h2 className="text-2xl font-bold flex items-center text-gray-900">
             <Puzzle className="w-6 h-6 mr-2 text-purple-600" /> Repository Extensions
           </h2>
           <p className="text-gray-500 text-sm mt-1">Enhance your repository with custom UI panels and integrated 3rd party tools.</p>
        </div>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors">
          Browse Marketplace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Installed Extensions */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-sm text-gray-700 flex items-center justify-between">
                 <span>Active UI Extensions</span>
                 <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-widest">v2 API</span>
              </div>
              <div className="divide-y divide-gray-200">
                 {/* Extension 1 */}
                 <div className="p-6">
                    <div className="flex items-start justify-between">
                       <div className="flex items-start space-x-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                             <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900 flex items-center">
                                Dependency Graph <span className="ml-2 text-[10px] font-bold text-blue-600 border border-blue-200 px-1.5 rounded uppercase">Experimental</span>
                             </h4>
                             <p className="text-sm text-gray-500 mt-1">Surfaces a visual map of all internal and external dependencies. Injects into the 'Code' and 'Insights' tabs.</p>
                             <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                                <span className="flex items-center"><Shield className="w-3 h-3 mr-1" /> Full read access</span>
                                <span className="flex items-center"><Globe className="w-3 h-3 mr-1" /> No network access</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex flex-col items-end">
                          <div className="text-[10px] text-green-500 font-bold uppercase mb-2">Enabled</div>
                          <button className="text-xs font-bold text-blue-600 hover:underline">Config</button>
                       </div>
                    </div>
                 </div>

                 {/* Extension 2 */}
                 <div className="p-6">
                    <div className="flex items-start justify-between">
                       <div className="flex items-start space-x-4">
                          <div className="p-2 bg-orange-50 rounded-lg">
                             <Zap className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900">Linear Workspace Sync</h4>
                             <p className="text-sm text-gray-500 mt-1">Adds a sidebar to Pull Requests showing related Linear issues and their sub-tasks.</p>
                             <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                                <span className="flex items-center"><Shield className="w-3 h-3 mr-1" /> Partial read access</span>
                                <span className="flex items-center"><Globe className="w-3 h-3 mr-1" /> External Domain: linear.app</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex flex-col items-end">
                          <div className="text-[10px] text-green-500 font-bold uppercase mb-2">Enabled</div>
                          <button className="text-xs font-bold text-blue-600 hover:underline">Config</button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* API Documentation Preview */}
           <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 text-gray-300">
              <h3 className="font-bold text-white mb-2 flex items-center">
                 <Zap className="w-4 h-4 mr-2 text-yellow-500" /> Extensions API (SDK)
              </h3>
              <p className="text-sm text-gray-400 mb-4">Build your own UI panels using our React-based extension SDK. Register custom routes, sidebar widgets, and tab panels.</p>
              <div className="bg-black/50 p-4 rounded-md font-mono text-xs text-blue-400">
                 <pre>{`// Example: Registering a tab extension
LocalHub.registerExtension({
  id: 'my-custom-tab',
  type: 'TAB_PANEL',
  label: 'Architecture',
  icon: 'Network',
  render: () => <ArchitectureMap />
});`}</pre>
              </div>
           </div>
        </div>

        {/* Right Column: Suggested Extensions */}
        <div className="space-y-6">
           <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-500 mb-4">Recommended for you</h4>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors group cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="flex items-center">
                       <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold mr-3">T</div>
                       <div>
                          <p className="text-xs font-bold text-gray-900">Tailwind Previewer</p>
                          <p className="text-[10px] text-gray-500">Render components in PRs</p>
                       </div>
                    </div>
                    <button className="text-[10px] font-bold text-blue-600 underline opacity-0 group-hover:opacity-100">Add</button>
                 </div>
                 <div className="flex items-center justify-between p-2 hover:bg-white rounded transition-colors group cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="flex items-center">
                       <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold mr-3 text-xs">AI</div>
                       <div>
                          <p className="text-xs font-bold text-gray-900">Copilot Explain</p>
                          <p className="text-[10px] text-gray-500">Contextual code explanation</p>
                       </div>
                    </div>
                    <button className="text-[10px] font-bold text-blue-600 underline opacity-0 group-hover:opacity-100">Add</button>
                 </div>
              </div>
              <button className="w-full mt-6 text-xs font-bold text-purple-600 hover:bg-purple-50 py-2 rounded-md transition-colors">View All Marketplace Apps</button>
           </div>

           <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-800 leading-relaxed">
                 <span className="font-bold">OAuth-ready:</span> All extensions are sandboxed and require explicit permission to access repository content via OAuth2 tokens.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
