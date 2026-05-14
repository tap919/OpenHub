import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { GitPullRequest, GitMerge, MessageSquare, Tag, Filter, ExternalLink, Users, SplitSquareHorizontal, ChevronLeft, CheckCircle2, ShieldCheck, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { GoogleGenAI } from "@google/genai";

export function PullsView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => state.repositories.find(r => r.owner === owner && r.name === repoName));
  const protection = useStore((state) => state.branchProtection.find(rule => rule.repoId === repo?.id && rule.pattern === repo?.defaultBranch));
  const pulls = useStore(state => state.pullRequests.filter(i => i.repoId === repo?.id));
  
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<string | null>(null);
  
  if (!repo) return null;

  const handleAiReview = async () => {
    if (!selectedPR) return;
    setIsAiReviewing(true);
    setAiReviewResult(null);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this Pull Request: "${selectedPR.title}" from branch ${selectedPR.sourceBranch} to ${selectedPR.targetBranch}. 
        The context is a repository named ${repo.name}. 
        Summarize the likely impact and provide 3 key bullet points of what this PR does, oriented around security and maintainability.
        Keep it concise.`,
        config: {
          systemInstruction: "You are an expert lead engineer performing a shift-left security audit and code review. Be helpful but critical of suspicious patterns."
        }
      });
      setAiReviewResult(response.text);
    } catch (e) {
      console.error("AI Review failed", e);
      setAiReviewResult("Failed to generate AI review. Technical error in reaching Gemini engine.");
    } finally {
      setIsAiReviewing(false);
    }
  };

  const openPulls = pulls.filter(i => i.state === 'open').length;
  const closedPulls = pulls.filter(i => i.state === 'closed' || i.state === 'merged').length;

  return (
    <div className="flex flex-col space-y-6">
      {selectedPR ? (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setSelectedPR(null)} className="p-1 px-3 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center text-sm font-bold shadow-sm">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to list
            </button>
            <h2 className="text-xl font-bold truncate flex-1">{selectedPR.title} <span className="text-gray-400 font-normal">#{selectedPR.number}</span></h2>
          </div>
          
          <div className="border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm">
             <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm font-bold">
                   <div className="text-gray-700 bg-gray-200 px-2 py-1 rounded">Files changed: 1</div>
                   <div className="text-green-600">+12</div>
                   <div className="text-red-500">-3</div>
                </div>
                {protection && (
                   <div className="hidden md:flex items-center text-[10px] uppercase font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 tracking-widest">
                      <ShieldCheck className="w-3 h-3 mr-1.5" /> Branch Protected
                   </div>
                )}
                <div className="flex space-x-2">
                   <button 
                     onClick={handleAiReview}
                     disabled={isAiReviewing}
                     className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center disabled:opacity-50"
                   >
                      {isAiReviewing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
                      AI Review
                   </button>
                   <button className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-green-700 transition-colors shadow-sm">
                      Review changes
                   </button>
                </div>
             </div>

             {/* AI Summary Block */}
             {(isAiReviewing || aiReviewResult) && (
             <div className="bg-blue-50 border border-blue-100 rounded-md p-4 flex flex-col md:flex-row gap-4 underline-none">
                <div className="shrink-0">
                   <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                      {isAiReviewing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                   </div>
                </div>
                <div>
                   <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center">
                      AI Impact Summary <span className="ml-2 text-[10px] font-normal text-blue-500 bg-white px-1 rounded">just now</span>
                   </h4>
                   <div className="text-xs text-blue-800 space-y-2 leading-relaxed">
                      {isAiReviewing ? (
                         <div className="animate-pulse flex space-x-2">
                            <div className="flex-1 space-y-2 py-1">
                               <div className="h-2 bg-blue-200 rounded"></div>
                               <div className="h-2 bg-blue-200 rounded w-3/4"></div>
                            </div>
                         </div>
                      ) : (
                         <div className="markdown-body text-xs prose prose-blue max-w-none">
                            <pre className="whitespace-pre-wrap font-sans leading-relaxed">{aiReviewResult}</pre>
                         </div>
                      )}
                   </div>
                </div>
             </div>
             )}

             <div className="p-0 font-mono text-xs overflow-x-auto">
                <div className="bg-gray-100 px-4 py-2 text-gray-500 border-b border-gray-200">
                   @@ -1,5 +1,14 @@ server.ts
                </div>
                <div className="bg-white">
                   <div className="px-4 py-0.5 text-gray-400">import express from "express";</div>
                   <div className="px-4 py-0.5 text-gray-400">const app = express();</div>
                   <div className="px-4 py-0.5 bg-red-50 text-red-700 flex">
                      <span className="w-6 shrink-0 opacity-50">-</span> const PORT = 8080;
                   </div>
                   <div className="px-4 py-0.5 bg-green-50 text-green-700 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span> const PORT = process.env.PORT || 3000;
                   </div>
                   <div className="px-4 py-0.5 bg-green-50 text-green-700 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span> 
                   </div>
                   <div className="px-4 py-0.5 bg-green-50 text-green-700 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span> // Added health check endpoint for OpenHub internal monitoring
                   </div>
                   <div className="px-4 py-0.5 bg-green-500/10 text-green-500 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span> app.get("/api/health", (req, res) =&gt; {'{'}
                   </div>
                   <div className="px-4 py-0.5 bg-green-50 text-green-700 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span>   res.json({'{'} status: "ok" {'}'});
                   </div>
                   <div className="px-4 py-0.5 bg-green-50 text-green-700 flex">
                      <span className="w-6 shrink-0 opacity-50">+</span> {'}'});
                   </div>
                   <div className="px-4 py-0.5 text-gray-400">app.listen(PORT, () =&gt; {'{'}</div>
                </div>
             </div>
          </div>
          
          <div className="bg-[#161B22] border border-[#30363D] rounded-md p-6 flex flex-col items-center justify-center text-center">
             {protection?.requireReviews ? (
               <div className="mb-4">
                  <div className="flex items-center justify-center space-x-2 text-yellow-500 mb-2">
                     <AlertCircle className="w-8 h-8" />
                     <span className="text-xl font-bold">Review required</span>
                  </div>
                  <p className="text-gray-400 text-sm">At least 1 approving review is required before merging to <span className="font-mono text-gray-200">main</span>.</p>
               </div>
             ) : (
               <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="font-bold text-white text-xl">This branch has no conflicts</h3>
                  <p className="text-gray-400 text-sm mt-2 max-w-md">The 3rd party analysis bot has verified that these changes follow the repository's styling rules and unit tests passed.</p>
               </>
             )}
             <button disabled={protection?.requireReviews} className={`mt-6 font-bold px-6 py-2 rounded-md transition-colors shadow-lg ${protection?.requireReviews ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#238636] hover:bg-[#2EA043] text-white'}`}>
                {protection?.requireReviews ? 'Merge Blocked' : 'Merge pull request'}
             </button>
          </div>
        </div>
      ) : (
        <>
          {/* 3rd Party Integration Banner / Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#161B22] border border-[#30363D] rounded-md p-4 shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#2F81F7]/10 rounded-full border border-[#2F81F7]/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#2F81F7]" />
          </div>
          <div>
            <h3 className="font-bold text-[#F0F6FC] tracking-tight">Real-time Collaborative Review Enabled</h3>
            <p className="text-xs text-[#8B949E]">Live presence and 3rd-party code review integrations (e.g. Jira, Linear) are active.</p>
          </div>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button className="px-3 py-1.5 w-full sm:w-auto justify-center text-xs font-bold border border-[#30363D] rounded-md hover:bg-[#30363D] transition-colors text-[#F0F6FC] bg-transparent flex items-center">
             <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Manage Integrations
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex w-full sm:w-auto">
          <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-l-sm px-4 py-1.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
             Filters <span className="text-[10px] ml-1.5">▼</span>
          </button>
          <div className="relative flex-1 sm:w-80">
             <Filter className="w-4 h-4 text-gray-600 absolute left-3 top-2.5" />
             <input type="text" defaultValue="is:pr is:open " className="w-full pl-9 pr-3 py-1.5 border-t border-b border-r rounded-r-sm border-gray-700 bg-gray-900 font-mono text-xs text-gray-400 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
           <button className="bg-orange-500 hover:bg-orange-400 text-black px-6 py-1.5 rounded-sm text-xs font-black uppercase tracking-widest transition-all shadow-lg">New pull request</button>
        </div>
      </div>

      {/* PR list */}
      <div className="border border-gray-700 rounded-sm bg-gray-900 shadow-sm overflow-hidden industrial-card">
        {/* List Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
           <div className="flex space-x-4">
             <div className="flex items-center text-white cursor-pointer hover:text-orange-500 transition-colors">
               <GitPullRequest className="w-3.5 h-3.5 mr-2 text-white" /> {openPulls} Open
             </div>
             <div className="flex items-center hover:text-white cursor-pointer transition-colors">
               <GitMerge className="w-3.5 h-3.5 mr-2 text-purple-500" /> {closedPulls} Closed
             </div>
           </div>
           
           <div className="hidden sm:flex space-x-4 text-gray-500 cursor-pointer">
             <span className="hover:text-gray-800">Author â¼</span>
             <span className="hover:text-gray-800">Label â¼</span>
             <span className="hover:text-gray-800">Projects â¼</span>
             <span className="hover:text-gray-800">Milestones â¼</span>
             <span className="hover:text-gray-800">Sort â¼</span>
           </div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-gray-200">
          {pulls.map((pr, index) => (
            <div key={pr.id} 
              onClick={() => setSelectedPR(pr)}
              className="flex p-4 hover:bg-gray-50 transition-colors relative group cursor-pointer"
            >
              {/* Simulate someone else reviewing */}
              {index === 0 && pr.state === 'open' && (
                 <div className="absolute top-2 right-2 flex -space-x-2 mr-32 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <img src="https://i.pravatar.cc/100?img=1" className="w-6 h-6 rounded-full border-2 border-white" alt="avatar" title="alice is viewing" />
                    <img src="https://i.pravatar.cc/100?img=2" className="w-6 h-6 rounded-full border-2 border-white" alt="avatar" title="bob is typing..." />
                 </div>
              )}
              <div className="pt-0.5 mr-3">
                {pr.state === 'open' 
                  ? <GitPullRequest className="w-5 h-5 text-green-600" /> 
                  : <GitMerge className="w-5 h-5 text-purple-600 shrink-0" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <a href="#" className="text-base font-semibold text-gray-900 hover:text-blue-600">{pr.title}</a>
                </div>
                <div className="text-xs text-gray-500">
                  #{pr.number} opened {formatDistanceToNow(new Date(pr.createdAt))} ago by <a href="#" className="hover:text-blue-600 hover:underline">{pr.author.username}</a>
                  <span className="ml-2 font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {pr.targetBranch} â {pr.sourceBranch}
                  </span>
                </div>
              </div>
              
              <div className="hidden sm:flex ml-4 shrink-0 flex-col items-end justify-between pt-1">
                <div className="flex space-x-2 text-gray-500 hover:text-blue-600 cursor-pointer">
                  {pr.comments > 0 && (
                    <div className="flex items-center text-xs">
                      <MessageSquare className="w-4 h-4 mr-1 stroke-2" /> {pr.comments}
                    </div>
                  )}
                </div>
                
                {pr.state === 'open' && (
                  <div className="mt-2 flex space-x-2">
                    <button title="Sync to Jira" className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 hover:text-blue-600 transition-colors text-gray-500">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button title="Live Code Review" className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100 hover:text-blue-600 transition-colors text-gray-500">
                      <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button title="Join Voice Channel" className="w-7 h-7 flex items-center justify-center rounded-full bg-green-100 border border-green-300 text-green-700 hover:bg-green-200 transition-colors">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {pulls.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <GitPullRequest className="w-8 h-8 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800">No pull requests found</h3>
              <p>Welcome to pull requests! PRs are where code reviews and collaboration happen.</p>
            </div>
          )}
        </div>
        </div>
      </>
      )}
    </div>
  );
}
