import React, { useState } from 'react';
import { Terminal, X, ChevronUp, ChevronDown } from 'lucide-react';

export function TerminalPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-0 left-0 border-t border-r border-[#30363D] bg-[#161B22] px-4 py-2 text-xs font-bold text-[#F0F6FC] cursor-pointer flex items-center hover:bg-[#30363D] transition-colors rounded-tr-lg z-50 uppercase tracking-widest border-l-4 border-l-orange-500"
        onClick={() => setIsOpen(true)}
      >
        <Terminal className="w-4 h-4 mr-2" />
        Terminal Console
      </div>
    );
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-[#0A0C10] border-t border-[#30363D] flex flex-col ${isExpanded ? 'h-1/2' : 'h-64'} transition-all duration-300 z-50 shadow-2xl`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363D] bg-[#161B22] text-[#8B949E]">
        <div className="flex items-center text-xs font-bold uppercase tracking-widest text-[#F0F6FC]">
          <Terminal className="w-4 h-4 mr-2 text-[#2F81F7]" />
          Integrated Terminal
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setIsExpanded(!isExpanded)} className="hover:text-[#F0F6FC] transition-colors p-1">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:text-[#F0F6FC] transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 font-mono text-sm text-[#F0F6FC] overflow-y-auto">
        <div className="mb-2 text-[#8B949E]">// Welcome to the OpenHub Enterprise Terminal</div>
        <div className="mb-2 text-[#8B949E]">// Execute business binaries or git commands.</div>
        <div className="mb-2 flex items-center">
          <span className="text-orange-500 font-bold mr-2">➜</span> 
          <span className="text-blue-500 font-bold mr-2">~/openhub</span>
          <span>$ </span>
          <span className="ml-2 w-2 h-4 bg-[#F0F6FC] animate-pulse inline-block align-middle"></span>
        </div>
      </div>
    </div>
  );
}
