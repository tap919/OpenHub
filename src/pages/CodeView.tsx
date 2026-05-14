import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore, FileNode, SecurityFinding } from '../store';
import { File, Folder, HardDrive, History, Tags, Check, Search, Download, Star, UploadCloud, Eye, Lightbulb, ChevronRight, CornerDownRight, Copy, ShieldAlert, ShieldCheck, Loader2, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function CodeView() {
  const { owner, repo: repoName } = useParams();
  const { repositories, beginnerMode, scanFile, logAuditAction, triggerPipeline } = useStore();
  const repo = repositories.find(r => r.owner === owner && r.name === repoName);
  
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<SecurityFinding[] | null>(null);
  
  if (!repo) return null;

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setScanResults(null);
    
    // Check if the file is .env or contains secrets
    // For this mock, we use the selectedFile.content or the mock content
    const content = selectedFile.content || `
      const API_KEY = "AKIA1234567890ABCDEF"; // Simulated AWS key
      const token = "token:xyz1234567890abcdef"; 
    `;
    
    const findings = await scanFile(content, selectedFile.name);
    setScanResults(findings);
    setIsScanning(false);
    
    logAuditAction('security.file_scan', `Scanned ${selectedFile.name} - ${findings.length} findings`, repo.id);
  };

  const mockFileContent = `import express from "express";
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Hello from OpenHub!");
});

app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});`;

  const handleQuickUpload = async () => {
    setIsScanning(true);
    // Simulate pre-receive hook
    logAuditAction('git.push', 'Initiating push over SSH', repo.id);
    
    // Fake a few seconds of hook processing
    setTimeout(async () => {
       const findings = await scanFile('const pass = "password123";', 'new_file.js');
       if (findings.length > 0) {
          logAuditAction('git.push_rejected', 'Push rejected by pre-receive hook: Secrets detected', repo.id);
          alert("Push Rejected: Security hook detected sensitive information in your commit.");
       } else {
          logAuditAction('git.push_success', 'Push accepted. Post-receive hook triggered CI.', repo.id);
          triggerPipeline(repo.id, 'Uploaded new files via web');
       }
       setIsScanning(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="md:w-3/4 flex flex-col">
        {beginnerMode && !selectedFile && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 text-lg mb-1">Welcome to Beginner Mode!</h3>
              <p className="text-sm text-yellow-800/80 mb-3">
                This mode highlights features to help you navigate and use the version control system effectively. Try dragging files into the box below to quickly upload them, or check out the Visual History.
              </p>
            </div>
            <button className="text-xs font-bold uppercase tracking-widest text-[#238636] bg-[#238636]/10 hover:bg-[#238636]/20 border border-[#238636] px-3 py-1.5 rounded-md flex items-center transition-colors">
              Begin Tutorial
            </button>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm mb-4">
          <Link to={`/${owner}/${repoName}`} className="text-[#2F81F7] font-bold hover:underline" onClick={() => setSelectedFile(null)}>
            {repoName}
          </Link>
          {selectedFile && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-800 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
            </>
          )}
        </div>

        {/* Top actions toolbar */}
        {!selectedFile && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex items-center space-x-2">
               <button className="bg-white hover:bg-gray-50 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-semibold flex items-center shadow-sm">
                 <History className="w-4 h-4 mr-2 text-gray-400" /> {repo.defaultBranch} <span className="text-xs ml-1.5">â–¼</span>
               </button>
               <div className="flex items-center text-sm text-gray-600 space-x-4 ml-4">
                 <Link to={`/${owner}/${repoName}/commits`} className="flex items-center hover:text-blue-600 cursor-pointer">
                   <History className="w-4 h-4 mr-1 text-gray-400" />
                   <span className="font-semibold mr-1">34</span> Commits
                 </Link>
                 <div className="flex items-center hover:text-blue-600 cursor-pointer">
                   <Tags className="w-4 h-4 mr-1 text-gray-400" />
                   <span className="font-semibold mr-1">2</span> Tags
                 </div>
               </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleQuickUpload}
                disabled={isScanning}
                className="text-xs font-bold uppercase tracking-widest text-[#238636] bg-[#238636]/10 hover:bg-[#238636]/20 border border-[#238636] px-3 py-1.5 rounded-md flex items-center transition-colors disabled:opacity-50"
              >
                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                Git Push simulation
              </button>
              <button className="text-xs font-bold uppercase tracking-widest text-[#2F81F7] bg-[#2F81F7]/10 hover:bg-[#2F81F7]/20 border border-[#2F81F7] px-3 py-1.5 rounded-md flex items-center transition-colors hidden sm:flex">
                <Eye className="w-4 h-4 mr-2" /> Visual History
              </button>
              <div className="relative group">
                <button className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md flex items-center shadow-md">
                  <Download className="w-4 h-4 mr-1" /> Code <span className="text-xs ml-1.5">▼</span>
                </button>
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl hidden group-hover:block z-50 overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                      <span>Clone</span>
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block">HTTPS</label>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                          <input 
                            readOnly 
                            value={`https://openhub.internal/${owner}/${repoName}.git`} 
                            className="bg-transparent text-[11px] font-mono text-gray-400 flex-1 outline-none" 
                          />
                          <button className="text-gray-500 hover:text-blue-500 ml-2"><Copy className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">SSH</label>
                        <div className="flex items-center bg-gray-900 border border-gray-700 rounded px-2 py-1.5">
                          <input 
                            readOnly 
                            value={`git@openhub.internal:${owner}/${repoName}.git`} 
                            className="bg-transparent text-[11px] font-mono text-gray-400 flex-1 outline-none" 
                          />
                          <button className="text-gray-400 hover:text-blue-500 ml-2"><Copy className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 italic text-[10px] text-gray-400">
                      Use your <Link to="/settings" className="text-blue-500 hover:underline">SSH keys</Link> for secure local transport without passwords.
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-2 border-t border-gray-100 flex flex-col space-y-1">
                    <button className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-white hover:text-blue-600 rounded flex items-center transition-colors">
                      <Download className="w-3.5 h-3.5 mr-2" /> Download ZIP
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-white hover:text-blue-600 rounded flex items-center transition-colors">
                      <Terminal className="w-3.5 h-3.5 mr-2" /> Open in Local Terminal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File tree or single file viewer */}
        <div 
          className={`border ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-300 bg-white'} rounded-md overflow-hidden shadow-sm relative transition-all duration-200`}
          onDragOver={(e) => { e.preventDefault(); !selectedFile && setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
        >
          {isDragging && !selectedFile && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#161B22]/90 backdrop-blur-sm border-2 border-dashed border-[#2F81F7] rounded-md m-1">
              <UploadCloud className="w-16 h-16 text-[#2F81F7] mb-4 animate-bounce" />
              <h2 className="text-[#F0F6FC] !text-xl font-display uppercase tracking-widest text-center">Drop files to upload</h2>
              <p className="text-[#8B949E] mt-2 font-mono text-[10px] uppercase tracking-widest">// Auto-commits to {repo.defaultBranch}</p>
            </div>
          )}

          {!selectedFile ? (
            <>
              {/* Header */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-sm">
                  <img src={useStore(s => s.currentUser).avatarUrl} alt="author" className="w-6 h-6 rounded-full" />
                  <a href="#" className="font-semibold hover:underline hover:text-blue-600">developer</a>
                  <span className="text-gray-600 truncate max-w-xs">{repo.files[0]?.lastCommitMessage || 'Initial commit'}</span>
                </div>
                <div className="text-sm text-gray-500 hidden sm:flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{repo.files[0] ? formatDistanceToNow(new Date(repo.files[0].lastCommitDate!)) : '1 day'} ago</span>
                </div>
              </div>

              {/* Files List */}
              <ul className="text-sm">
                {repo.files.map((file, i) => (
                  <li key={file.name} className={`flex items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors ${i === repo.files.length - 1 ? 'border-none' : ''}`}>
                    <div className="w-1/3 flex items-center">
                      {file.type === 'dir' ? (
                        <Folder className="w-4 h-4 text-blue-400 mr-2 shrink-0 fill-current" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                      )}
                      <button 
                        onClick={() => file.type === 'file' && setSelectedFile(file)}
                        className={`text-gray-800 hover:text-blue-600 hover:underline text-left ${file.type === 'dir' ? 'cursor-default' : 'cursor-pointer font-medium'}`}
                      >
                        {file.name}
                      </button>
                    </div>
                    <div className="w-1/2 text-gray-500 truncate hidden sm:block">
                      <span className="hover:text-blue-600 transition-colors cursor-default">{file.lastCommitMessage}</span>
                    </div>
                    <div className="w-1/6 text-right text-gray-500 text-xs hidden sm:block">
                      {formatDistanceToNow(new Date(file.lastCommitDate!))} ago
                    </div>
                  </li>
                ))}
                {repo.files.length === 0 && (
                  <div className="p-8 text-center text-gray-500 font-mono text-sm">// Repository is currently empty.</div>
                )}
              </ul>
            </>
          ) : (
            <>
              {/* Single File Header */}
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="flex items-center text-sm font-mono text-gray-500">
                      <File className="w-4 h-4 mr-2" />
                      {selectedFile.name}
                   </div>
                   <div className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded tracking-widest uppercase font-bold">
                      {(selectedFile.name.split('.').pop() || 'text').toUpperCase()}
                   </div>
                </div>
                <div className="flex items-center space-x-2">
                   <button 
                     onClick={handleScan}
                     disabled={isScanning}
                     className={`flex items-center text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border transition-all ${
                       scanResults && scanResults.length > 0 
                       ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                       : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                     }`}
                   >
                     {isScanning ? (
                       <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                     ) : (
                       <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                     )}
                     {isScanning ? 'Scanning...' : 'Security Audit'}
                   </button>
                   <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors" title="Copy Content">
                      <Copy className="w-4 h-4" />
                   </button>
                   <button className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Raw
                   </button>
                </div>
              </div>
              {/* File Content with Syntax Highlighting */}
              <div className="overflow-x-auto">
                <SyntaxHighlighter 
                  language={selectedFile.name.split('.').pop() === 'ts' ? 'typescript' : 'javascript'}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}
                  showLineNumbers={true}
                >
                  {selectedFile.content || mockFileContent}
                </SyntaxHighlighter>
              </div>
              
              {scanResults && (
                <div className={`p-4 border-t ${scanResults.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <h4 className={`text-sm font-bold flex items-center mb-2 ${scanResults.length > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {scanResults.length > 0 ? <ShieldAlert className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Security Scan Summary
                  </h4>
                  {scanResults.length > 0 ? (
                    <div className="space-y-2">
                       {scanResults.map(f => (
                         <div key={f.id} className="text-xs text-red-700 bg-white/50 p-2 rounded border border-red-100 flex items-start">
                            <span className="font-mono bg-red-100 px-1 rounded mr-2">L{f.line}</span>
                            <div>
                               <div className="font-bold">{f.title}</div>
                               <div className="opacity-80">{f.description}</div>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-xs text-green-700 italic">No secrets or vulnerabilities detected in this file snapshot.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {beginnerMode && !selectedFile && (
          <div className="mt-8 border border-[#30363D] bg-[#0A0C10] rounded-md overflow-hidden relative shadow-lg">
            <div className="bg-[#161B22] border-b border-[#30363D] px-4 py-2 font-bold text-xs uppercase tracking-widest text-[#F0F6FC]">
              Git Flow Anatomy
            </div>
            <div className="p-6 flex flex-col md:flex-row items-center justify-between text-center gap-6">
               <div className="flex-1 bg-[#161B22] border border-[#30363D] p-4 rounded-md relative z-10 w-full">
                  <div className="text-[#8B949E] text-xs font-bold uppercase tracking-wider mb-2">Stage 1</div>
                  <div className="text-white font-bold mb-1">Local Workspace</div>
                  <div className="text-xs text-[#8B949E]">Your actual files on disk.</div>
               </div>
               
               <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-8">
                  <span className="text-[#8B949E] text-[10px] font-bold uppercase mb-1">Commit</span>
                  <div className="w-full h-0.5 bg-[#30363D] relative after:content-[''] after:absolute after:right-0 after:-top-1 after:border-t-4 after:border-t-transparent after:border-b-4 after:border-b-transparent after:border-l-4 after:border-l-[#30363D]"></div>
               </div>
               <div className="md:hidden h-8 flex flex-col items-center justify-center w-full">
                  <div className="h-full w-0.5 bg-[#30363D]"></div>
               </div>
               
               <div className="flex-1 bg-[#238636]/10 border border-[#238636]/30 p-4 rounded-md relative z-10 w-full">
                  <div className="text-[#238636] text-xs font-bold uppercase tracking-wider mb-2">Stage 2</div>
                  <div className="text-[#F0F6FC] font-bold mb-1">Local Repository</div>
                  <div className="text-xs text-[#8B949E]">Tracked changes in OpenHub.</div>
               </div>
               
               <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-8">
                  <span className="text-[#2F81F7] text-[10px] font-bold uppercase mb-1">Push</span>
                  <div className="w-full h-0.5 bg-[#2F81F7]/50 relative after:content-[''] after:absolute after:right-0 after:-top-1 after:border-t-4 after:border-t-transparent after:border-b-4 after:border-b-transparent after:border-l-4 after:border-l-[#2F81F7]/50"></div>
               </div>
               <div className="md:hidden h-8 flex flex-col items-center justify-center w-full">
                  <div className="h-full w-0.5 bg-[#2F81F7]/50"></div>
               </div>
               
               <div className="flex-1 bg-[#2F81F7]/10 border border-[#2F81F7]/30 p-4 rounded-md relative z-10 w-full">
                  <div className="text-[#2F81F7] text-xs font-bold uppercase tracking-wider mb-2">Stage 3</div>
                  <div className="text-[#F0F6FC] font-bold mb-1">Remote Server</div>
                  <div className="text-xs text-[#8B949E]">Synced to cloud/other machines.</div>
               </div>
            </div>
          </div>
        )}
        
        {/* Readme rendering simulation */}
        {repo.files.some(f => f.name.toLowerCase() === 'readme.md') && (
          <div className="mt-8 border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 font-semibold flex items-center">
              <Search className="w-4 h-4 mr-2 text-gray-500" /> README.md
            </div>
            <div className="p-8 prose prose-slate max-w-none">
               <h1 className="border-b pb-2">{repo.name}</h1>
               <p className="mt-4">{repo.description}</p>
               <h2 className="mt-6 font-semibold text-lg border-b pb-1">Getting Started</h2>
               <p className="mt-2 text-gray-700">Clone the repository and install dependencies.</p>
               <pre className="bg-gray-900 p-3 border border-gray-700 rounded-sm mt-2 text-xs text-gray-400 font-mono"><code>git clone openhub:{repo.owner}/{repo.name}.git{"\n"}npm install</code></pre>
            </div>
          </div>
        )}
      </div>

      <div className="md:w-1/4 flex flex-col space-y-6">
        
        {beginnerMode && (
          <div className="border border-yellow-200 bg-yellow-50 rounded-md p-4">
            <h3 className="font-bold text-yellow-800 flex items-center mb-3">
              <Lightbulb className="w-4 h-4 mr-2" /> Learning Center
            </h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="flex hover:underline text-blue-600 font-medium">How Version Control Works</a></li>
              <li><a href="#" className="flex hover:underline text-blue-600 font-medium">When to Commit vs Push</a></li>
              <li><a href="#" className="flex hover:underline text-blue-600 font-medium">Anatomy of a Code Review</a></li>
              <li><a href="#" className="flex hover:underline text-blue-600 font-medium">Resolving Merge Conflicts Visually</a></li>
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">About</h3>
          <p className="text-sm text-gray-600 mb-4">{repo.description}</p>
          <div className="flex items-center text-sm text-gray-600 hover:text-blue-600 cursor-pointer mb-2">
            <HardDrive className="w-4 h-4 mr-2" /> Readme
          </div>
          <div className="flex items-center text-sm text-gray-600 hover:text-blue-600 cursor-pointer mb-4">
            <Star className="w-4 h-4 mr-2" /> {repo.stars} stars
          </div>
          <div className="border border-gray-200 mt-4"></div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Releases</h3>
          <p className="text-sm text-gray-500">No releases published</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Packages</h3>
          <p className="text-sm text-gray-500">No packages published</p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Languages</h3>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex mb-2 mt-2">
            <div className="bg-blue-500 w-[100%] h-full"></div>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 px-1">
             <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>{repo.language}</div>
             <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
