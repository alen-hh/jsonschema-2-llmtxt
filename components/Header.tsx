
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 py-6 mb-8 shadow-sm">
      <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 19h6"/><path d="M9 11h1"/></svg>
            </span>
            OpenAPI to <span className="text-blue-600">llm.txt</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Convert Swagger/OpenAPI specifications to LLM-optimized Markdown.</p>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://llmstxt.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-full px-3 py-1 bg-slate-50 transition-colors"
          >
            What is llm.txt?
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
