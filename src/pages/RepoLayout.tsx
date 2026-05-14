import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Code, CircleDot, GitPullRequest, PlayCircle, KanbanSquare, BookOpen, Settings, Book, Star, GitFork, Eye, Puzzle } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

export function RepoLayout() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => 
    state.repositories.find(r => r.owner === owner && r.name === repoName)
  );
  const fetchRepositories = useStore(s => s.fetchRepositories);

  React.useEffect(() => {
    if (!repo) fetchRepositories();
  }, [owner, repoName]);

  if (!repo) {
    return <div className="p-8 text-center text-gray-500">Repository not found</div>;
  }

  const navItems = [
    { to: `/${owner}/${repoName}`, icon: Code, label: 'Code', end: true },
    { to: `/${owner}/${repoName}/issues`, icon: CircleDot, label: 'Issues', count: useStore(s => s.issues.filter(i => i.repoId === repo.id && i.state === 'open').length) },
    { to: `/${owner}/${repoName}/pulls`, icon: GitPullRequest, label: 'Pull requests', count: useStore(s => s.pullRequests.filter(i => i.repoId === repo.id && i.state === 'open').length) },
    { to: `/${owner}/${repoName}/actions`, icon: PlayCircle, label: 'Actions' },
    { to: `/${owner}/${repoName}/projects`, icon: KanbanSquare, label: 'Projects' },
    { to: `/${owner}/${repoName}/wiki`, icon: BookOpen, label: 'Wiki' },
    { to: `/${owner}/${repoName}/extensions`, icon: Puzzle, label: 'Extensions' },
    { to: `/${owner}/${repoName}/settings`, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Repo Header */}
      <div className="bg-gray-50 border-b border-gray-200 pt-5 pb-0 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div className="flex items-center text-xl font-medium text-gray-700">
              <Book className="w-5 h-5 text-gray-500 mr-2" />
              <a href="#" className="text-blue-600 hover:underline">{owner}</a>
              <span className="mx-1">/</span>
              <a href="#" className="text-blue-600 hover:underline font-semibold">{repoName}</a>
              {repo.isPrivate && (
                <span className="ml-3 border border-gray-300 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">Private</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex rounded-md shadow-sm relative z-0">
                <button className="relative inline-flex items-center px-3 py-1 rounded-l-md border border-gray-300 bg-gray-50text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Unwatch
                  <span className="ml-1.5 bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.5 rounded-full">1</span>
                </button>
                <div className="relative inline-flex items-center px-3 py-1 border-t border-b border-r border-gray-300 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none cursor-pointer">
                  â¼
                </div>
              </div>
              <div className="flex rounded-md shadow-sm relative z-0">
                <button className="relative inline-flex items-center px-3 py-1 rounded-l-md border border-gray-300 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none">
                  <GitFork className="w-3.5 h-3.5 mr-1" />
                  Fork
                  <span className="ml-1.5 bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.5 rounded-full">{repo.forks}</span>
                </button>
                <div className="relative inline-flex items-center px-3 py-1 border-t border-b border-r border-gray-300 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none cursor-pointer">
                  â¼
                </div>
              </div>
              <div className="flex rounded-md shadow-sm relative z-0">
                <button className="relative inline-flex items-center px-3 py-1 rounded-l-md border border-gray-300 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none">
                  <Star className="w-3.5 h-3.5 mr-1" />
                  Star
                  <span className="ml-1.5 bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.5 rounded-full">{repo.stars}</span>
                </button>
                <div className="relative inline-flex items-center px-3 py-1 border-t border-b border-r border-gray-300 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:z-10 focus:outline-none cursor-pointer">
                  â¼
                </div>
              </div>
            </div>
          </div>

          <nav className="flex overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex items-center px-4 py-2 border-b-2 text-sm font-medium whitespace-nowrap outline-none",
                  isActive 
                    ? "border-blue-500 text-white font-semibold" 
                    : "border-transparent text-gray-400 hover:text-white hover:border-gray-500"
                )}
              >
                <item.icon className="w-4 h-4 mr-2 text-gray-400" />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 text-[11px] px-1.5 py-0.5 rounded-full font-semibold">
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
        <Outlet />
      </div>
    </div>
  );
}
