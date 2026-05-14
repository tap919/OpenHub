import React from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store';
import { Search, Edit, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function WikiView() {
  const { owner, repo: repoName } = useParams();
  const repo = useStore((state) => state.repositories.find(r => r.owner === owner && r.name === repoName));
  const wikiPages = useStore(state => state.wikiPages.filter(i => i.repoId === repo?.id));
  
  if (!repo) return null;

  const homePage = wikiPages.find(p => p.title === 'Home');

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Main wiki content */}
      <div className="w-full md:w-3/4 flex flex-col">
        {homePage ? (
          <div className="border border-gray-300 rounded-md bg-white shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-3 flex items-center justify-between">
               <h1 className="text-lg font-semibold text-gray-800">{homePage.title}</h1>
               <div className="flex space-x-2">
                  <button className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-100 bg-white flex items-center">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium">New Page</button>
               </div>
            </div>
            <div className="p-8 prose prose-slate max-w-none">
               <h1 className="border-b pb-2">Welcome to the LocalHub Wiki</h1>
               <p className="mt-4">Here you can find all the documentation for the core engine.</p>
               <h2 className="mt-6 font-semibold text-lg border-b pb-1">Features</h2>
               <ul>
                 <li>Git-compatible source hosting</li>
                 <li>Integrated issue tracking</li>
                 <li>Built-in CI/CD pipelines</li>
                 <li>Project management</li>
               </ul>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 text-right">
              developer edited this page {formatDistanceToNow(new Date(homePage.updatedAt))} ago
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 border border-gray-300 rounded-md">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800">Welcome to the wiki!</h3>
            <p className="mb-4">Wikis provide a place in your repository to lay out the roadmap of your project, show the current status, and document software better, together.</p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">Create the first page</button>
          </div>
        )}
      </div>
      
      {/* Sidebar for pages */}
      <div className="w-full md:w-1/4">
        <div className="border border-gray-300 rounded-md bg-white overflow-hidden shadow-sm">
           <div className="px-4 py-3 border-b border-gray-200">
             <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input type="text" placeholder="Find a page..." className="w-full pl-9 pr-3 py-1.5 border rounded-md border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
             </div>
           </div>
           <div className="p-4">
             <h3 className="text-sm font-semibold text-gray-800 mb-3">Pages <span className="bg-gray-100 rounded-full px-2 py-0.5 ml-1 text-xs text-gray-600">{wikiPages.length}</span></h3>
             <ul className="space-y-2 text-sm">
               {wikiPages.map(page => (
                 <li key={page.id}>
                    <a href="#" className="font-semibold text-blue-600 hover:underline">{page.title}</a>
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
