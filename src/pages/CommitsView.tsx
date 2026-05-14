import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitCommit, Calendar, User, Copy, Check, ChevronRight, ShieldCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCommits, useBranches } from '../api/hooks';

export function CommitsView() {
  const { owner, repo: repoName } = useParams();
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const { data: commits = [], isLoading, error } = useCommits(owner!, repoName!);
  const { data: branchData } = useBranches(owner!, repoName!);

  const handleCopy = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <span className="ml-3 text-gray-400 text-sm font-mono">Loading commits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="industrial-card p-6 text-center">
        <div className="text-red-500 text-sm font-bold">Failed to load commits</div>
        <div className="text-gray-500 text-xs mt-2 font-mono">{(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center">
          <GitCommit className="w-5 h-5 mr-2 text-gray-500" /> Commit History
        </h2>
        <div className="flex items-center space-x-2">
          <select
            className="bg-[#161b22] border border-[#30363d] rounded-sm px-3 py-1.5 text-sm font-mono text-gray-300"
            defaultValue={branchData?.current || 'main'}
          >
            {branchData?.branches?.map((b: string) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="industrial-card rounded-lg overflow-hidden">
        <div className="bg-[#0D1117] px-4 py-3 border-b border-[#30363d] text-sm font-bold text-gray-300 flex items-center uppercase tracking-widest">
          <Calendar className="w-4 h-4 mr-2 text-orange-500" />
          {commits.length} commits
        </div>

        <div className="divide-y divide-[#30363d]">
          {commits.map((commit: any) => (
            <div key={commit.sha} className="p-4 hover:bg-[#1c2128] transition-colors flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-orange-500 font-bold text-xs mt-0.5">
                  {commit.author?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-200 group cursor-pointer hover:text-orange-500 transition-colors">
                    {commit.message}
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                    <span className="font-bold text-gray-400">{commit.author}</span>
                    <span>committed {formatDistanceToNow(new Date(commit.date * 1000))} ago</span>
                    {commit.verified && (
                      <span className="flex items-center text-green-500 font-bold border border-green-500/20 bg-green-500/10 px-1 rounded-sm ml-2 text-[10px]">
                        <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-[#0D1117] rounded-sm border border-[#30363d]">
                  <div className="px-2 py-1 text-xs font-mono text-blue-500 border-r border-[#30363d]">
                    {commit.sha.slice(0, 7)}
                  </div>
                  <button
                    onClick={() => handleCopy(commit.sha)}
                    className="p-1 hover:bg-[#30363d] transition-colors"
                  >
                    {copiedSha === commit.sha ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>
                </div>
                <Link
                  to={`/${owner}/${repoName}/tree/${commit.sha}`}
                  className="p-1.5 text-gray-500 hover:text-orange-500 border border-[#30363d] rounded-sm hover:bg-[#0D1117] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}

          {commits.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-mono text-sm">
              No commits yet. Create your first commit to see history here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
