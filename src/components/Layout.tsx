import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Github, Bell, Plus, UserCircle, Search, Menu, Lightbulb, Terminal as TerminalIcon, Zap } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useStore } from '../store';
import { TerminalPanel } from './TerminalPanel';
import { DevAssistant } from './DevAssistant';

export function Layout() {
  const { user, logout } = useAuth();
  const { beginnerMode, toggleBeginnerMode, fetchRepositories } = useStore();

  React.useEffect(() => {
    fetchRepositories();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden" style={{ backgroundColor: '#0A0C10' }}>
      <div className="openhub-tag">OPENHUB</div>
      <div className="scanline" />
      {/* Top Navigation */}
      <header
        className="text-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-[#30363d]"
        style={({ WebkitAppRegion: 'drag' } as any)}
      >
        <div className="flex items-center space-x-4" style={({ WebkitAppRegion: 'no-drag' } as any)}>
          <Menu className="w-6 h-6 sm:hidden text-gray-500 cursor-pointer" />
          <Link to="/" className="flex items-center space-x-2 text-blue-500 hover:text-blue-400">
            <Github className="w-8 h-8" />
            <span className="text-2xl font-black tracking-tighter uppercase hidden sm:block">OPENHUB</span>
          </Link>

          <nav className="ml-8 hidden lg:flex items-center space-x-6">
            <Link to="/registry" className="text-xs font-black uppercase text-gray-400 hover:text-white transition-colors tracking-widest">Logistics</Link>
            <Link to="/business" className="text-xs font-black uppercase text-gray-400 hover:text-white transition-colors tracking-widest">Intelligence</Link>
            <Link to="/autonomous" className="text-xs font-black uppercase text-gray-400 hover:text-white transition-colors tracking-widest">Orchestration</Link>
            <Link to="/integrations" className="text-xs font-black uppercase text-gray-400 hover:text-white transition-colors tracking-widest">Cloud</Link>
            <div className="h-4 w-px bg-[#30363d]" />
            <Link to="/workspace" className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-400 hover:text-purple-300 transition-colors tracking-widest">
              <TerminalIcon className="w-3.5 h-3.5" /> Workspace
            </Link>
            <Link to="/studio" className="flex items-center gap-1.5 text-xs font-black uppercase text-orange-400 hover:text-orange-300 transition-colors tracking-widest">
              <Zap className="w-3.5 h-3.5" /> Studio
            </Link>
          </nav>

          <div className="hidden sm:flex items-center bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 w-64 md:w-96 ml-6">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search projects, files, symbols..."
              className="bg-transparent border-none outline-none text-sm w-full text-gray-300 placeholder-gray-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4 relative z-10" style={({ WebkitAppRegion: 'no-drag' } as any)}>
          <div className="flex space-x-4 items-center mr-2">
            <button
              onClick={toggleBeginnerMode}
              className={`flex items-center px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${beginnerMode ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-[#30363D] bg-[#161B22] text-[#8B949E] hover:bg-[#30363D]'}`}
            >
              <Lightbulb className={`w-3.5 h-3.5 mr-1 ${beginnerMode ? 'animate-pulse' : ''}`} />
              Beginner Mode
            </button>
            <span className="tag tag-green hidden sm:inline-flex">OpenHub Active</span>
            <Link to="/settings" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.username || user?.email || 'dev'}&background=3b82f6&color=fff`}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-blue-500 transition-all"
                alt="Profile"
              />
              <span className="hidden md:block">{user?.username || 'Loading...'}</span>
            </Link>
            <button onClick={logout} className="text-xs text-gray-600 hover:text-gray-400 hidden md:block">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 pb-12">
        <Outlet />
      </main>

      {/* Terminal Panel overlay */}
      <TerminalPanel />
      <DevAssistant />
    </div>
  );
}
