import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

function getCsrfToken(): string {
  const get = (name: string) =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1] ?? '';
  return get('__Host-csrf-token') || get('__Secure-csrf-token') || get('csrf-token');
}
import {
  Files, Search, GitBranch, Bug, Package, Settings, Terminal as TerminalIcon,
  X, Play, Save, Menu, ChevronRight, Folder, File, RefreshCw,
  Bot, Cpu, Loader2, CircleDot, GitPullRequest
} from 'lucide-react';
import Editor from '@monaco-editor/react';

type FileEntry = { name: string; type: 'file' | 'dir'; path: string; size?: number };

export function WorkspacePage() {
  const { owner, repo } = useParams();
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<'explorer' | 'search' | 'git' | 'extensions'>('explorer');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [openFile, setOpenFile] = useState<{ path: string; name: string; language: string } | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const wsBase = owner && repo ? `${owner}/${repo}` : '';

  useEffect(() => {
    if (owner && repo) {
      fetch(`/api/repos/${owner}/${repo}/contents?path=${currentPath}`, {
        credentials: 'include'
      })
        .then(r => r.json())
        .then(d => {
          if (d.entries) setFiles(d.entries);
          else if (d.type === 'file') {
            setFileContent(d.content || '');
            setOpenFile({ path: d.path, name: d.name, language: d.language || 'plaintext' });
          }
        })
        .catch(() => {});
    }
  }, [owner, repo, currentPath]);

  const handleFileClick = async (entry: FileEntry) => {
    if (entry.type === 'dir') {
      setCurrentPath(entry.path);
    } else {
      const res = await fetch(`/api/repos/${owner}/${repo}/contents?path=${entry.path}`, {
        credentials: 'include'
      });
      const d = await res.json();
      if (d.type === 'file') {
        setFileContent(d.content || '');
        const ext = entry.name.split('.').pop() || 'plaintext';
        const langMap: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
          py: 'python', json: 'json', md: 'markdown', css: 'css', html: 'html',
          yaml: 'yaml', yml: 'yaml', sql: 'sql', sh: 'shell', ps1: 'powershell',
        };
        setOpenFile({ path: entry.path, name: entry.name, language: langMap[ext] || ext });
      }
    }
  };

  const handleSave = async () => {
    if (!openFile || !owner || !repo) return;
    await fetch(`/api/repos/${owner}/${repo}/contents`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
      body: JSON.stringify({ path: openFile.path, content: fileContent, message: `Update ${openFile.name}` }),
    });
  };

  const handleAiSend = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');

    try {
      const res = await fetch('/api/mcp/vibe_architect', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ intent: aiPrompt, constraints: ['Workspace context'], target_stack: 'react' }),
      });
      const data = await res.json();
      setAiResponse(JSON.stringify(data, null, 2));
    } catch {
      setAiResponse('AI service unavailable. Ensure the MCP server is running.');
    } finally {
      setAiLoading(false);
    }
  };

  const sidebarIcons = [
    { id: 'explorer' as const, icon: Files, label: 'Explorer' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
    { id: 'extensions' as const, icon: Package, label: 'Extensions' },
  ];

  const panelContent = () => {
    if (activePanel === 'explorer') {
      return (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 py-1">
            {wsBase || 'No workspace open'}
          </div>
          {currentPath && (
            <button
              onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/'))}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs text-gray-400 hover:bg-[#30363d] rounded"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              ..
            </button>
          )}
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => handleFileClick(f)}
              className="w-full flex items-center gap-2 px-2 py-0.5 text-xs text-gray-300 hover:bg-[#30363d] rounded text-left"
            >
              {f.type === 'dir' ? <Folder className="w-3.5 h-3.5 text-blue-400" /> : <File className="w-3.5 h-3.5 text-gray-500" />}
              <span className="truncate">{f.name}</span>
            </button>
          ))}
          {files.length === 0 && owner && repo && (
            <div className="text-xs text-gray-600 px-2 py-4 text-center">Empty repository. Create a file to get started.</div>
          )}
        </div>
      );
    }
    if (activePanel === 'search') {
      return (
        <div className="p-3 space-y-2">
          <input
            type="text"
            placeholder="Search in workspace..."
            className="w-full bg-[#0A0C10] border border-[#30363d] rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
          <div className="text-xs text-gray-600">Type to search across files</div>
        </div>
      );
    }
    if (activePanel === 'git') {
      return (
        <div className="p-3 space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Source Control</div>
          <div className="text-xs text-gray-600">No changes detected</div>
          <button className="w-full bg-[#238636] hover:bg-[#2ea043] text-white rounded px-2 py-1 text-xs font-bold">Commit</button>
        </div>
      );
    }
    return <div className="p-3 text-xs text-gray-600">Extensions</div>;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0C10' }}>
      {/* Menu Bar + Breadcrumb */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[#30363d] text-xs">
        <Link to="/" className="text-blue-400 hover:underline font-bold">OpenHub</Link>
        {owner && <span className="text-gray-500">/</span>}
        {owner && <span className="text-gray-300">{owner}</span>}
        {repo && <span className="text-gray-500">/</span>}
        {repo && <span className="text-gray-300 font-bold">{repo}</span>}
        <div className="flex-1" />
        <button onClick={handleSave} disabled={!openFile} className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 rounded text-white text-xs">
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={() => setShowTerminal(!showTerminal)} className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] hover:bg-[#30363d] rounded text-gray-300 text-xs">
          <TerminalIcon className="w-3 h-3" /> Terminal
        </button>
      </div>

      {/* Main IDE Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 flex flex-col items-center pt-2 gap-1 border-r border-[#30363d]" style={{ background: '#0A0C10' }}>
          {sidebarIcons.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-10 h-10 flex items-center justify-center rounded hover:bg-[#30363d] transition-colors ${
                activePanel === item.id ? 'text-white' : 'text-gray-500'
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`w-10 h-10 flex items-center justify-center rounded hover:bg-[#30363d] transition-colors ${showAiPanel ? 'text-purple-400' : 'text-gray-500'}`}
            title="AI Co-Pilot"
          >
            <Bot className="w-5 h-5" />
          </button>
          <Link to="/settings" className="w-10 h-10 flex items-center justify-center rounded hover:bg-[#30363d] text-gray-500">
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        {/* Sidebar Panel */}
        <div className="w-64 flex flex-col border-r border-[#30363d]" style={{ background: '#0D1117' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {sidebarIcons.find((s) => s.id === activePanel)?.label}
            </span>
            <X className="w-3.5 h-3.5 text-gray-600 cursor-pointer" onClick={() => setActivePanel(activePanel)} />
          </div>
          {panelContent()}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {openFile ? (
            <>
              <div className="flex border-b border-[#30363d] overflow-x-auto">
                <div className="flex items-center gap-2 px-3 py-1 bg-[#0D1117] text-xs text-gray-300 border-t-2 border-t-blue-500 min-w-fit">
                  <File className="w-3 h-3" />
                  {openFile.name}
                  <X className="w-3 h-3 text-gray-600 cursor-pointer hover:text-white" onClick={() => setOpenFile(null)} />
                </div>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={openFile.language}
                  value={fileContent}
                  onChange={(v) => setFileContent(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center space-y-4">
                <div className="text-4xl">&#x2301;&#xFE0E;</div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-400 font-bold">OpenHub Workspace</div>
                  <div className="text-xs text-gray-600">
                    {owner && repo
                      ? 'Select a file from the explorer to start editing'
                      : 'Open a repository to start working. Visit the Dashboard to browse your repos.'}
                  </div>
                </div>
                {!owner && (
                  <Link to="/" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-bold">
                    Go to Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Co-Pilot Panel */}
        {showAiPanel && (
          <div className="w-80 flex flex-col border-l border-[#30363d]" style={{ background: '#0D1117' }}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Co-Pilot</span>
              </div>
              {aiLoading && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-xs text-gray-600 text-center py-4">
                Ask the AI to generate code, review changes, or scaffold new features.
              </div>
              {aiResponse && (
                <pre className="bg-[#161b22] border border-[#30363d] rounded p-2 text-xs text-gray-300 overflow-x-auto max-h-60">
                  {aiResponse}
                </pre>
              )}
            </div>
            <div className="p-2 border-t border-[#30363d]">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
                placeholder="Describe what you want to build..."
                className="w-full bg-[#0A0C10] border border-[#30363d] rounded p-2 text-xs text-white placeholder-gray-600 resize-none focus:border-purple-500 focus:outline-none"
                rows={3}
              />
              <button
                onClick={handleAiSend}
                disabled={aiLoading}
                className="w-full mt-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-white text-xs font-bold"
              >
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {aiLoading ? 'Thinking...' : 'Send to AI'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="h-48 border-t border-[#30363d]" style={{ background: '#0D1117' }}>
          <div className="flex items-center justify-between px-3 py-1 border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-400">Terminal</span>
            </div>
            <X className="w-3.5 h-3.5 text-gray-600 cursor-pointer" onClick={() => setShowTerminal(false)} />
          </div>
          <div className="p-3">
            <div className="text-xs text-gray-500 font-mono">$ openhub workspace</div>
            <div className="text-xs text-gray-600 font-mono mt-1">Terminal connected to {wsBase || 'workspace'} root</div>
            <div className="mt-2">
              <input
                type="text"
                placeholder="$ "
                className="w-full bg-transparent border-none text-xs text-green-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-0.5 border-t border-[#30363d] text-[10px] text-gray-600" style={{ background: '#0A0C10' }}>
        <div className="flex items-center gap-3">
          <span className="text-green-500">&#x25CF; Ready</span>
          <span>{openFile ? openFile.language : 'Plain Text'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>Spaces: 2</span>
          <span>OpenHub v2.0</span>
        </div>
      </div>
    </div>
  );
}
