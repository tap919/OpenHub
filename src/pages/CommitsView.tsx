import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { GitCommit, Calendar, User, Copy, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export function CommitsView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => 
    state.repositories.find(r => r.owner === owner && r.name === repoName)
  );

  if (!repo) return null;

  // Mock commits for display
  const commits = [
    {
      sha: 'a1b2c3d',
      message: 'Add deep collaborative review features and 3rd party integrations',
      author: 'developer',
      avatar: 'https://i.pravatar.cc/100?u=developer',
      date: new Date(),
      verified: true,
    },
    {
      sha: 'e5f6g7h',
      message: 'Fix layout issues on mobile view in Settings',
      author: 'developer',
      avatar: 'https://i.pravatar.cc/100?u=developer',
      date: new Date(Date.now() - 3600000 * 2),
      verified: true,
    },
    {
      sha: 'i9j0k1l',
      message: 'Initial commit: Project structural backbone',
      author: 'system',
      avatar: 'https://i.pravatar.cc/100?u=system',
      date: new Date(Date.now() - 3600000 * 24),
      verified: false,
    }
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold flex items-center">
            <GitCommit className="w-5 h-5 mr-2 text-gray-500" /> Commit History
         </h2>
         <div className="flex items-center space-x-2">
            <button className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-semibold flex items-center shadow-sm">
               main <span className="text-xs ml-1.5 opacity-50">â–¼</span>
            </button>
         </div>
      </div>

      <div className="border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          Commits on May 13, 2026
        </div>
        
        <div className="divide-y divide-gray-200">
          {commits.map((commit) => (
            <div key={commit.sha} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <img src={commit.avatar} className="w-9 h-9 rounded-full mt-0.5" alt="avatar" />
                <div>
                  <h4 className="font-bold text-gray-900 group cursor-pointer">
                    <span className="hover:text-blue-600 hover:underline">{commit.message}</span>
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                    <span className="font-bold text-gray-700">{commit.author}</span>
                    <span>committed {format(commit.date, 'MMM d, yyyy')}</span>
                    {commit.verified && (
                       <span className="flex items-center text-green-600 font-bold border border-green-200 bg-green-50 px-1 rounded ml-2 text-[10px]">
                          <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                       </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 rounded-md border border-gray-200">
                  <div className="px-2 py-1 text-xs font-mono text-blue-600 border-r border-gray-200">
                    {commit.sha}
                  </div>
                  <button className="p-1 hover:bg-gray-200 transition-colors">
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <Link to={`/${owner}/${repoName}/tree/${commit.sha}`} className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded hover:bg-white bg-gray-50 shadow-sm transition-colors">
                   <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-center pt-4">
         <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-md border border-blue-200 transition-colors">
            Load more commits
         </button>
      </div>
    </div>
  );
}
