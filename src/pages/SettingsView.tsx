import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Settings, Shield, Bell, HardDrive, AlertTriangle, ExternalLink, RefreshCw, Lock, FileLock2, ClipboardList, CheckCircle2, ShieldCheck, Fingerprint, Eye, Server, Activity, Database, Cpu, Globe, BarChart3, ListTree, Key, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SettingsView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => state.repositories.find(r => r.owner === owner && r.name === repoName));
  const auditLogs = useStore((state) => state.auditLogs.filter(log => log.repoId === repo?.id));
  const protectionRules = useStore((state) => state.branchProtection.filter(rule => rule.repoId === repo?.id));
  
  const [activeTab, setActiveTab] = React.useState('general');
  
  if (!repo) return null;

  return (
    <div className="flex flex-col md:flex-row gap-8 relative z-10">
      {/* Sidebar navigation */}
      <div className="w-full md:w-1/4">
        <div className="industrial-card overflow-hidden">
          <div className="bg-[#1c2128] px-4 py-3 border-b border-[#30363d]">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-0 flex items-center">
               <Settings className="w-3.5 h-3.5 mr-2" /> Repository Config
            </h3>
          </div>
          <ul className="divide-y divide-[#30363d]">
            {[
              { id: 'general', label: 'General', icon: Settings },
              { id: 'security', label: 'Security & Analysis', icon: Shield },
              { id: 'branches', label: 'Branch Protection', icon: FileLock2 },
              { id: 'collaborators', label: 'Collaborators & RBAC', icon: ClipboardList },
              { id: 'infrastructure', label: 'Infrastructure', icon: Server },
              { id: 'observability', label: 'Observability', icon: Activity },
              { id: 'features', label: 'Deep Customizations', icon: HardDrive },
              { id: 'ai', label: 'AI Models', icon: Cpu },
              { id: 'integrations', label: 'Integrations', icon: RefreshCw },
              { id: 'webhooks', label: 'Webhooks', icon: Globe },
              { id: 'keys', label: 'Deploy Keys', icon: Key },
              { id: 'audit', label: 'Audit Log', icon: Eye },
            ].map(item => (
              <li key={item.id}>
                <button 
                  onClick={() => setActiveTab(item.id)} 
                  className={`w-full flex items-center px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === item.id 
                    ? 'bg-orange-500 text-black border-l-4 border-black' 
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3 opacity-70" /> {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main settings content */}
      <div className="w-full md:w-3/4 flex flex-col space-y-12">
        {activeTab === 'general' && (
          <div className="animate-in fade-in duration-300">
            <div className="industrial-card p-8 mb-8">
               <h2 className="text-white mb-8">Base Configuration</h2>
               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Repository Name</label>
                   <input 
                     type="text" 
                     defaultValue={repo.name} 
                     className="w-full max-w-md px-4 py-3 bg-gray-900 border border-gray-700 rounded-sm text-sm font-mono text-white outline-none focus:border-orange-500 transition-colors" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
                   <input 
                     type="text" 
                     defaultValue={repo.description} 
                     className="w-full max-w-xl px-4 py-3 bg-gray-900 border border-gray-700 rounded-sm text-sm font-mono text-white outline-none focus:border-orange-500 transition-colors" 
                   />
                 </div>
                 <button className="bg-white text-black font-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg mt-4">
                    Update Manifest
                 </button>
               </div>
            </div>

            <div className="border border-red-500/50 rounded-sm overflow-hidden shadow-lg shadow-red-500/5">
               <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/50 flex items-center">
                 <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
                 <h3 className="text-red-500 font-industrial text-xl mb-0">Decommission Zone</h3>
               </div>
               <div className="p-8 bg-[#0D1117] flex flex-col space-y-8">
                 <div className="flex justify-between items-center pb-8 border-b border-white/5">
                   <div className="pr-4">
                     <div className="font-bold text-white mb-1 uppercase tracking-tight">Security Protocol Update</div>
                     <div className="text-xs text-gray-500">Transition repository visibility to {repo.isPrivate ? 'Public' : 'Private'}.</div>
                   </div>
                   <button className="shrink-0 bg-transparent text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-black px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all">
                      Toggle Visibility
                   </button>
                 </div>
                 <div className="flex justify-between items-center">
                   <div className="pr-4">
                     <div className="font-bold text-white mb-1 uppercase tracking-tight">Data Scrutiny / Wipe</div>
                     <div className="text-xs text-gray-500">Irreversible deletion of all historical commits, artifacts, and binaries.</div>
                   </div>
                   <button className="shrink-0 bg-red-600 text-white hover:bg-red-500 px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg">
                      Execute Deletion
                   </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="animate-in fade-in duration-300">
             <div className="industrial-card p-8">
                <h2 className="text-white mb-8">Defensive Posture</h2>
                
                <div className="space-y-12">
                   {/* Secret Scanning */}
                   <div className="flex justify-between items-start">
                      <div className="max-w-xl">
                         <h3 className="text-white font-industrial text-xl mb-1 flex items-center">
                            <ShieldCheck className="w-5 h-5 mr-2 text-green-500" /> Secret Scanning
                         </h3>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Scan incoming commits for API keys, tokens, and credentials using OpenHub's gitleaks engine.</p>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="bg-green-500 text-black px-4 py-1 font-black text-[10px] uppercase tracking-widest mb-2">Active</span>
                         <button className="text-[10px] font-black text-blue-500 hover:underline uppercase tracking-widest">Config patterns</button>
                      </div>
                   </div>

                   <div className="h-px bg-white/5 w-full"></div>

                   {/* Signed Commits */}
                   <div className="flex justify-between items-start">
                      <div className="max-w-xl">
                         <h3 className="text-white font-industrial text-xl mb-1 flex items-center">
                            <Fingerprint className="w-5 h-5 mr-2 text-blue-500" /> Signature Verification
                         </h3>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Enforce GPG/SSH verification on all incoming objects. Block unsigned deliveries.</p>
                      </div>
                      <button className="bg-gray-800 text-gray-400 border border-gray-700 hover:text-white px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all">
                         Enable Guard
                      </button>
                   </div>

                   <div className="h-px bg-white/5 w-full"></div>

                   {/* 2FA Enforcement */}
                   <div className="flex justify-between items-start">
                      <div className="max-w-xl">
                         <h3 className="text-white font-industrial text-xl mb-1 flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-orange-500" /> Identity Lockdown
                         </h3>
                         <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Require 2FA for all writers. Revoke access if security hardware is missing.</p>
                      </div>
                      <button className="bg-gray-800 text-gray-400 border border-gray-700 hover:text-white px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all">
                         Lockdown
                      </button>
                   </div>

                   <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-sm flex items-start space-x-4">
                      <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                      <div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest leading-loose">
                         <span className="text-white">Security Advisory:</span> Regularly audit your repository access logs. Identity spoofing is the primary vector for internal leaks.
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'branches' && (
           <>
             <div>
                <h2 className="mb-2 border-b border-gray-300 pb-2">Branch Protection Rules</h2>
                <p className="text-sm text-gray-500 mb-6">Define rules to protect branches from accidental deletion or unverified merges.</p>
                
                <div className="space-y-4">
                   {protectionRules.map(rule => (
                      <div key={rule.id} className="border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm">
                         <div className="bg-gray-50 px-4 py-3 border-b border-gray-300 flex items-center justify-between">
                            <div className="flex items-center">
                               <FileLock2 className="w-4 h-4 mr-2 text-gray-600" />
                               <span className="font-mono text-sm bg-gray-200 px-1.5 rounded font-bold">{rule.pattern}</span>
                            </div>
                            <div className="flex space-x-2">
                               <button className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                               <button className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                            </div>
                         </div>
                         <div className="p-4 grid grid-cols-2 gap-4">
                            <div className="flex items-center text-xs text-gray-600">
                               <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${rule.requireReviews ? 'text-green-500' : 'text-gray-300'}`} />
                               Require pull request reviews
                            </div>
                            <div className="flex items-center text-xs text-gray-600">
                               <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${rule.requireCI ? 'text-green-500' : 'text-gray-300'}`} />
                               Require CI checks to pass
                            </div>
                            <div className="flex items-center text-xs text-gray-600">
                               <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${rule.signedCommits ? 'text-green-500' : 'text-gray-300'}`} />
                               Require signed commits
                            </div>
                            <div className="flex items-center text-xs text-gray-600">
                               <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${rule.enforceAdmins ? 'text-green-500' : 'text-gray-300'}`} />
                               Enforce for admins
                            </div>
                         </div>
                      </div>
                   ))}
                   
                   <button className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all font-bold flex items-center justify-center">
                      + Add branch protection rule
                   </button>
                </div>
             </div>
           </>
        )}

        {activeTab === 'features' && (
          <>
            <div>
               <h2 className="mb-6 border-b border-gray-300 pb-2">Deep Customizations</h2>
               <p className="text-sm text-gray-600 mb-6">Toggle components and sub-features on or off. LocalHub adapts fully to what your team needs.</p>
               
               <div className="space-y-6">
                 <div className="flex items-start">
                   <input type="checkbox" defaultChecked className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Wikis</div>
                      <div className="text-sm text-gray-500">Enable wikis for this repository to host documentation.</div>
                   </div>
                 </div>
                 <div className="flex items-start">
                   <input type="checkbox" defaultChecked className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Issues</div>
                      <div className="text-sm text-gray-500">Enable issues for tracker, bug reports, and features.</div>
                   </div>
                 </div>
                 <div className="flex items-start">
                   <input type="checkbox" defaultChecked className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Projects</div>
                      <div className="text-sm text-gray-500">Enable project boards for organizing and tracking work.</div>
                   </div>
                 </div>
                 <div className="flex items-start">
                   <input type="checkbox" defaultChecked className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Visual Desktop Hub</div>
                      <div className="text-sm text-gray-500">Enable the desktop node proxy features and integrated terminal layout.</div>
                   </div>
                 </div>
                 <div className="flex items-start">
                   <input type="checkbox" defaultChecked className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Actions / CI/CD</div>
                      <div className="text-sm text-gray-500">Enable continuous integration pipelines running on the local daemon.</div>
                   </div>
                 </div>
                 <div className="flex items-start">
                   <input type="checkbox" className="mt-1 mr-3 rounded text-blue-500 focus:ring-blue-500 bg-gray-50 border-gray-300" />
                   <div>
                      <div className="font-bold text-gray-800">Packages / Artifacts</div>
                      <div className="text-sm text-gray-500">Host npm, docker, or Maven packages locally directly from this repo.</div>
                   </div>
                 </div>
               </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <>
            <div>
               <h2 className="mb-6 border-b border-gray-300 pb-2">AI Models & Providers</h2>
               <p className="text-sm text-gray-600 mb-6">Configure local or remote AI models for code assistance, auto-review, and autocomplete.</p>

               <div className="space-y-8">
                 {/* Local Models */}
                 <div>
                   <h3 className="font-bold text-gray-800 mb-3 text-lg">Local Models</h3>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                     <HardDrive className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                     <h4 className="font-bold text-gray-800 mb-1">Upload Local Custom Model</h4>
                     <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">Drop a .gguf, .safetensors, or .bin model file here to run locally via the desktop daemon.</p>
                     <button className="bg-white border border-gray-300 hover:bg-gray-50 font-bold px-4 py-2 rounded-md text-sm text-gray-700 transition-colors shadow-sm">
                       Browse Files
                     </button>
                   </div>
                   
                   <div className="mt-4 border border-gray-200 rounded-md p-4 bg-white flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div>
                         <div>
                            <div className="font-bold text-gray-800">CodeLlama-7b-Instruct.gguf</div>
                            <div className="text-xs text-gray-500">4.1 GB &bull; Default for completion</div>
                         </div>
                      </div>
                      <button className="text-gray-400 hover:text-red-500 transition-colors font-medium text-sm">Remove</button>
                   </div>
                 </div>

                 <hr className="border-gray-200" />

                 {/* API Providers */}
                 <div>
                   <h3 className="font-bold text-gray-800 mb-3 text-lg">Cloud API Providers</h3>
                   <div className="space-y-4">
                     <div className="border border-gray-200 rounded-md p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                           <div className="font-bold text-gray-800">OpenAI</div>
                           <div className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Active</div>
                        </div>
                        <input type="password" defaultValue="sk-................................" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Enter API Key" />
                     </div>
                     <div className="border border-gray-200 rounded-md p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                           <div className="font-bold text-gray-800">Anthropic (Claude)</div>
                           <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not Configured</div>
                        </div>
                        <input type="password" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Enter API Key" />
                     </div>
                     <div className="border border-gray-200 rounded-md p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                           <div className="font-bold text-gray-800">Google Gemini</div>
                           <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not Configured</div>
                        </div>
                        <input type="password" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Enter API Key" />
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </>
        )}

        {activeTab === 'integrations' && (
           <>
             <div>
               <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-2">
                 <h2 className="">App Marketplace & Integrations</h2>
                 <button className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors flex items-center">
                   <ExternalLink className="w-3.5 h-3.5 mr-2" /> Developer Portal
                 </button>
               </div>
               <p className="text-sm text-gray-600 mb-6">Install 3rd party apps that can read/write via the API using OAuth2, and configure deep workflow extensions.</p>
               
               <div className="space-y-4">
                  {/* Jira */}
                  <div className="border border-gray-200 rounded-md p-4 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center font-black italic">
                          Jira
                       </div>
                       <div>
                         <h4 className="font-bold text-gray-900">Jira Software</h4>
                         <p className="text-xs text-gray-500">Sync issues and surface ticket info in PR sidebars.</p>
                       </div>
                    </div>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-1.5 rounded-md text-sm transition-colors border border-gray-300">
                      Configure
                    </button>
                  </div>
                  
                  {/* Slack */}
                  <div className="border border-gray-200 rounded-md p-4 bg-white flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-md flex items-center justify-center font-black">
                          #
                       </div>
                       <div>
                         <h4 className="font-bold text-gray-900">Slack Notifications</h4>
                         <p className="text-xs text-gray-500">Real-time alerts for pushes, PRs, and deployment status.</p>
                       </div>
                    </div>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-1.5 rounded-md text-sm transition-colors border border-gray-300">
                      Install
                    </button>
                  </div>
                  
                  {/* Linear */}
                  <div className="border border-green-500 bg-green-50 rounded-md p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-0.5 rounded-bl-md text-[10px] font-bold uppercase tracking-wider">
                      Connected
                    </div>
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-black text-white rounded-md flex items-center justify-center font-bold">
                          Lin.
                       </div>
                       <div>
                         <h4 className="font-bold text-gray-900">Linear App</h4>
                         <p className="text-xs text-gray-600">Auto-close issues on merge & draft PR sync.</p>
                       </div>
                    </div>
                    <button className="bg-white hover:bg-gray-50 text-gray-800 font-bold px-4 py-1.5 rounded-md text-sm transition-colors border border-gray-300 flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Sync
                    </button>
                  </div>
               </div>

               <div className="mt-12 bg-gray-50 border border-gray-300 rounded-lg p-6">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center lowercase tracking-tight">
                    <Globe className="w-4 h-4 mr-2" /> community marketplace
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 border border-gray-200 rounded bg-white hover:border-blue-300 transition-colors cursor-pointer group">
                       <div className="font-bold text-sm text-gray-900 flex justify-between">CodeClimate <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" /></div>
                       <div className="text-[10px] text-gray-500">Static code analysis & security grading</div>
                    </div>
                    <div className="p-3 border border-gray-200 rounded bg-white hover:border-blue-300 transition-colors cursor-pointer group">
                       <div className="font-bold text-sm text-gray-900 flex justify-between">Sentry <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50" /></div>
                       <div className="text-[10px] text-gray-500">Error tracking & performance monitoring</div>
                    </div>
                 </div>
               </div>
             </div>
           </>
        )}

        {activeTab === 'webhooks' && (
           <>
             <div>
                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-2">
                  <h2 className="">Webhooks</h2>
                  <button className="bg-white border border-gray-300 font-bold px-3 py-1 rounded-md text-xs shadow-sm hover:bg-gray-50 transition-colors">Add webhook</button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Webhooks allow external services to be notified when certain events happen within LocalHub.</p>
                
                <div className="space-y-4">
                   <div className="border border-gray-300 rounded-md bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-mono text-sm break-all">https://api.slack.com/services/B012345/</span>
                         </div>
                         <button className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
                      </div>
                      <div className="flex items-center space-x-4 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                         <span>Events: push, pull_request</span>
                         <span>&bull;</span>
                         <span>Active</span>
                      </div>
                   </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                   <h4 className="font-bold text-yellow-800 text-sm mb-1 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Webhook Security Tip
                   </h4>
                   <p className="text-xs text-yellow-700">Always use unique secrets for each webhook to verify that delivery is truly from LocalHub before processing payloads.</p>
                </div>
             </div>
           </>
        )}

        {activeTab === 'keys' && (
           <>
             <div>
                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-2">
                  <h2 className="">Deploy Keys</h2>
                  <button className="bg-white border border-gray-300 font-bold px-3 py-1 rounded-md text-xs shadow-sm hover:bg-gray-50 transition-colors">Add deploy key</button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Deploy keys are repo-scoped read-only (or write) SSH keys for automated builders and deployment tools.</p>
                
                <div className="space-y-4">
                   <div className="border border-gray-300 rounded-md bg-white p-4 shadow-sm flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                         <Key className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <div className="font-bold text-gray-900">CI-Runner-Alpha</div>
                            <div className="font-mono text-[10px] text-gray-500 break-all mt-1 bg-gray-50 p-1 rounded">ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK9...</div>
                            <div className="flex items-center space-x-3 mt-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                               <span className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Read-only</span>
                               <span>Added on Oct 12, 2023</span>
                               <span className="text-red-400">Never used</span>
                            </div>
                         </div>
                      </div>
                      <button className="text-red-500 hover:text-red-700 text-xs font-bold">Delete</button>
                   </div>
                </div>
             </div>
           </>
        )}


        {activeTab === 'collaborators' && (
           <>
             <div>
                <h2 className="mb-6 border-b border-gray-300 pb-2">Collaborators & RBAC</h2>
                <div className="space-y-6">
                   <div className="flex items-center justify-between bg-gray-50 border border-gray-300 p-4 rounded-md shadow-sm">
                      <div className="flex items-center space-x-3">
                         <img src={repo.owner === 'developer' ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felicity' : ''} className="w-10 h-10 rounded-full" />
                         <div>
                            <div className="font-bold text-gray-900">developer <span className="text-xs font-normal text-gray-500 underline ml-2 cursor-pointer">You</span></div>
                            <div className="text-xs text-gray-500">Owner &bull; Full Access</div>
                         </div>
                      </div>
                      <div className="flex items-center space-x-4">
                         <span className="text-xs font-black uppercase text-gray-400 tracking-widest bg-gray-200 px-2 py-0.5 rounded">Owner</span>
                         <button disabled className="text-xs text-gray-300 font-bold uppercase tracking-widest">Manage</button>
                      </div>
                   </div>

                   <hr className="border-gray-200" />

                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="font-bold text-gray-800">Manage Access</h3>
                         <button className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:bg-green-700 transition-colors">Add people</button>
                      </div>
                      <div className="text-sm text-gray-500 mb-4">Assign granular roles based on your organization's security policies.</div>
                      
                      <div className="border border-gray-300 rounded-md divide-y divide-gray-200 bg-white shadow-sm">
                         <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">A</div>
                               <div>
                                  <div className="font-bold text-gray-900">alice_dev</div>
                                  <div className="text-xs text-gray-500 font-mono">alice@corp.localhub</div>
                               </div>
                            </div>
                            <div className="flex items-center space-x-3">
                               <select className="text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50 font-bold">
                                  <option>Admin</option>
                                  <option selected>Contributor</option>
                                  <option>Read-only</option>
                               </select>
                               <button className="text-red-500 hover:text-red-700 p-1"><AlertTriangle className="w-4 h-4" /></button>
                            </div>
                         </div>
                         <div className="p-4 flex items-center justify-between opacity-60">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">B</div>
                               <div>
                                  <div className="font-bold text-gray-900">bob_contractor</div>
                                  <div className="text-xs text-gray-500 font-mono">bob@external.net</div>
                               </div>
                            </div>
                            <div className="flex items-center space-x-3">
                               <select className="text-sm border border-gray-300 rounded px-2 py-1 bg-gray-50 font-bold">
                                  <option>Admin</option>
                                  <option>Contributor</option>
                                  <option selected>Read-only</option>
                               </select>
                               <button className="text-red-500 hover:text-red-700 p-1"><AlertTriangle className="w-4 h-4" /></button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </>
        )}

        {activeTab === 'audit' && (
           <>
             <div>
                <h2 className="mb-2 border-b border-gray-300 pb-2">Audit Log</h2>
                <p className="text-sm text-gray-500 mb-6">Immutable record of every administrative action taken within this repository.</p>
                
                <div className="border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm">
                   <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 flex items-center text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      <div className="flex-1">Action</div>
                      <div className="w-32">User</div>
                      <div className="w-32">Time</div>
                      <div className="w-32">IP Address</div>
                   </div>
                   <div className="divide-y divide-gray-200">
                      {auditLogs.map(log => (
                         <div key={log.id} className="px-4 py-3 flex items-center text-sm group hover:bg-gray-50 transition-colors">
                            <div className="flex-1 flex flex-col">
                               <span className="font-bold text-gray-800 font-mono text-xs">{log.action}</span>
                               <span className="text-[10px] text-gray-500 mt-0.5">{log.details}</span>
                            </div>
                            <div className="w-32 flex items-center space-x-2">
                               <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold">U</div>
                               <span className="text-xs font-bold text-gray-700">{log.user.username}</span>
                            </div>
                             <div className="w-32 text-xs text-gray-500">
                                {formatDistanceToNow(new Date(log.timestamp))} ago
                             </div>
                            <div className="w-32 text-[10px] font-mono text-gray-400">
                               {log.ip}
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 p-1 text-blue-600"><Eye className="w-4 h-4" /></button>
                         </div>
                      ))}
                   </div>
                   <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 text-center">
                      <button className="text-xs font-bold text-blue-600 hover:underline">Download CSV Export</button>
                   </div>
                </div>
                
                <p className="mt-4 text-[10px] text-gray-400 italic">* Audit logs are kept for 90 days as per your current local node policy.</p>
             </div>
           </>
        )}

        {activeTab === 'infrastructure' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col">
                 <h2 className="text-white">Hardware & Core Services</h2>
                 <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-2 flex items-center">
                    <Zap className="w-3.5 h-3.5 mr-2 text-orange-500" /> Direct interface to OpenHub home server binaries
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[
                    { name: 'PostgreSQL', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10', class: 'Relational Engine', info: 'v15.3 • 128 connections • 450MB RAM', action: 'Manage Pools' },
                    { name: 'Redis', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10', class: 'Cache & Sessions', info: 'v7.0 • 12.4K keys • 0.4ms latency', action: 'Flush Heap' },
                    { name: 'Docker / Daemon', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10', class: 'Runtime Environment', info: 'Swarm Active • 4 Containers • No Orphans', action: 'Prune Objects' },
                    { name: 'S3 / MinIO', icon: HardDrive, color: 'text-orange-500', bg: 'bg-orange-500/10', class: 'Blob Storage', info: '2TB Quota • 45% Utilization • 8 Buckets', action: 'Inspect Buckets' },
                 ].map(svc => (
                    <div key={svc.name} className="industrial-card p-6 flex flex-col justify-between">
                       <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center">
                             <div className={`p-2 border border-white/10 rounded-sm ${svc.bg} ${svc.color} mr-4`}>
                                <svc.icon className="w-6 h-6" />
                             </div>
                             <div>
                                <h4 className="text-white font-industrial text-xl leading-tight">{svc.name}</h4>
                                <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{svc.class}</div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-sm">
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                             <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">ONLINE</span>
                          </div>
                       </div>
                       <div className="bg-black/40 border border-white/5 p-3 rounded-sm font-mono text-[10px] text-gray-400 mb-6 antialiased">
                          {svc.info}
                       </div>
                       <button className="text-[10px] font-black text-blue-500 hover:text-white uppercase tracking-widest text-left transition-colors">
                          {svc.action} &gt;&gt;
                       </button>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'observability' && (
           <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col">
                 <h2 className="text-white">Telemetry Console</h2>
                 <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-2 flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-2 text-green-500" /> Real-time metrics and log aggregation
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                    { label: 'CPU LOAD', val: '12.4%', color: 'text-green-500', bar: 'bg-green-500' },
                    { label: 'MEMORY USED', val: '4.2GB', color: 'text-blue-400', bar: 'bg-blue-400' },
                    { label: 'ACTIVE RPS', val: '842', color: 'text-orange-500', bar: 'bg-orange-500' },
                 ].map(stat => (
                    <div key={stat.label} className="industrial-card p-5">
                       <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</div>
                       <div className={`text-4xl font-display ${stat.color}`}>{stat.val}</div>
                       <div className="h-1 bg-gray-800 rounded-full mt-4 overflow-hidden">
                          <div className={`h-full ${stat.bar}`} style={{ width: '40%' }}></div>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="industrial-card p-8 bg-black/40">
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-gray-400 flex items-center uppercase text-sm font-black tracking-widest border-l-4 border-blue-500 pl-4">
                       <BarChart3 className="w-5 h-5 mr-3" /> Latency Spectrum
                    </h4>
                    <div className="text-[10px] text-gray-600 font-mono uppercase">Prometheus // Res: 1m</div>
                 </div>
                 <div className="h-48 flex items-end space-x-1 px-2">
                    {[40, 60, 45, 90, 100, 80, 50, 40, 70, 85, 40, 30, 45, 60, 80, 120, 100, 90, 70, 50, 60, 80, 110, 90, 40].map((h, i) => (
                       <div key={i} className="flex-1 bg-blue-500/20 border-t border-blue-500/40 hover:bg-orange-500/40 transition-all cursor-crosshair" style={{ height: `${h / 1.5}%` }}></div>
                    ))}
                 </div>
                 <div className="flex justify-between mt-4 font-mono text-[9px] text-gray-600 border-t border-white/5 pt-4">
                    <span>13:30Z</span>
                    <span>14:00Z</span>
                    <span>14:30Z</span>
                 </div>
              </div>

              <div className="bg-black border border-[#30363D] rounded-sm overflow-hidden font-mono text-[11px] h-64 flex flex-col">
                 <div className="bg-[#161B22] px-4 py-2 flex items-center justify-between border-b border-[#30363D]">
                    <div className="text-gray-400 flex items-center uppercase font-black tracking-widest text-[10px]">
                       <Shield className="w-4 h-4 mr-2 text-orange-500" /> GLOBAL LOGS (OPENHUB-LOKI)
                    </div>
                    <div className="flex space-x-4 text-[9px] font-black uppercase tracking-widest">
                       <span className="text-orange-500 flex items-center">
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2 animate-pulse"></span> LIVE
                       </span>
                    </div>
                 </div>
                 <div className="p-4 space-y-1 overflow-y-auto antialiased">
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:02</span> <span className="text-blue-400 mr-3">[INF]</span> <span className="text-gray-400">auth_server: challenge accepted for user: admin</span></div>
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:05</span> <span className="text-green-400 mr-3">[OK!]</span> <span className="text-gray-400">git_daemon: receive-pack complete for r1:main</span></div>
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:12</span> <span className="text-orange-400 mr-3">[WRN]</span> <span className="text-gray-400">disk_io: high pressure on /var/lib/docker/overlay2</span></div>
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:15</span> <span className="text-blue-400 mr-3">[INF]</span> <span className="text-gray-400">scheduler: triggered cron 'bin-rotation'</span></div>
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:18</span> <span className="text-gray-600 mr-3">[DBG]</span> <span className="text-gray-500">socket: persistent connection established with desktop-node-7</span></div>
                    <div className="flex"><span className="text-gray-600 mr-4 shrink-0">16:11:22</span> <span className="text-blue-400 mr-3">[INF]</span> <span className="text-gray-400">api_gateway: routed /api/v4/projects -&gt; internal-02</span></div>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}
