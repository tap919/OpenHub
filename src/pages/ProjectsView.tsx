import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { LayoutGrid, List as ListIcon, Plus, MoreHorizontal } from 'lucide-react';

export function ProjectsView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => state.repositories.find(r => r.owner === owner && r.name === repoName));
  const issues = useStore(state => state.issues.filter(i => i.repoId === repo?.id));
  
  if (!repo) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
           <button className="flex items-center px-3 py-1.5 text-sm font-medium bg-white shadow-sm rounded text-gray-900 border border-gray-200">
             <LayoutGrid className="w-4 h-4 mr-2 text-gray-500" /> Board
           </button>
           <button className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded">
             <ListIcon className="w-4 h-4 mr-2 text-gray-500" /> Table
           </button>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
          <Plus className="w-4 h-4 mr-1" /> New project
        </button>
      </div>

      <div className="flex-1 overflow-x-auto flex space-x-6 pb-4">
        {/* Todo Column */}
        <div className="w-80 shrink-0 bg-gray-50 border border-gray-200 rounded-md flex flex-col max-h-full">
           <div className="p-3 border-b border-gray-200 flex justify-between items-center group">
             <div className="flex items-center space-x-2">
               <span className="w-3 h-3 rounded-full bg-gray-300"></span>
               <h3 className="font-semibold text-sm text-gray-700">Todo</h3>
               <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{issues.length}</span>
             </div>
             <MoreHorizontal className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
           </div>
           <div className="p-2 overflow-y-auto flex-1 space-y-2">
             {issues.map(iss => (
               <div key={`todo-${iss.id}`} className="bg-white p-3 rounded border border-gray-200 shadow-sm hover:border-blue-400 cursor-pointer">
                 <div className="text-sm text-gray-900 mb-2">{iss.title}</div>
                 <div className="flex items-center justify-between mt-3">
                   <div className="text-xs text-gray-500">#{iss.number}</div>
                   <img src={iss.author.avatarUrl} className="w-5 h-5 rounded-full" alt="avatar" />
                 </div>
               </div>
             ))}
             <button className="w-full text-left py-2 px-2 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded flex items-center">
               <Plus className="w-4 h-4 mr-1" /> Add item
             </button>
           </div>
        </div>

        {/* In Progress Column */}
        <div className="w-80 shrink-0 bg-gray-50 border border-gray-200 rounded-md flex flex-col max-h-full">
           <div className="p-3 border-b border-gray-200 flex justify-between items-center group">
             <div className="flex items-center space-x-2">
               <span className="w-3 h-3 rounded-full bg-purple-500"></span>
               <h3 className="font-semibold text-sm text-gray-700">In Progress</h3>
               <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">0</span>
             </div>
             <MoreHorizontal className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
           </div>
           <div className="p-2 overflow-y-auto flex-1 space-y-2">
             <button className="w-full text-left py-2 px-2 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded flex items-center">
               <Plus className="w-4 h-4 mr-1" /> Add item
             </button>
           </div>
        </div>

        {/* Done Column */}
        <div className="w-80 shrink-0 bg-gray-50 border border-gray-200 rounded-md flex flex-col max-h-full">
           <div className="p-3 border-b border-gray-200 flex justify-between items-center group">
             <div className="flex items-center space-x-2">
               <span className="w-3 h-3 rounded-full bg-green-500"></span>
               <h3 className="font-semibold text-sm text-gray-700">Done</h3>
               <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">0</span>
             </div>
             <MoreHorizontal className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 cursor-pointer" />
           </div>
           <div className="p-2 overflow-y-auto flex-1 space-y-2">
            <button className="w-full text-left py-2 px-2 text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded flex items-center">
               <Plus className="w-4 h-4 mr-1" /> Add item
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
