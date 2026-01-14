
import React, { useState, useRef, useCallback } from 'react';
import Header from './components/Header';
import { localConvertToLlmTxt } from './services/conversionService';
import { ConversionState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<ConversionState>({
    isLoading: false,
    error: null,
    result: null,
    fileName: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, fileName: file.name }));

    // Small timeout to allow UI to show loading state for very large files
    setTimeout(() => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            // Validate JSON
            JSON.parse(content);
            
            // Perform high-performance local conversion
            const markdown = localConvertToLlmTxt(content);
            
            setState(prev => ({ ...prev, result: markdown, isLoading: false }));
          } catch (err: any) {
            setState(prev => ({ 
              ...prev, 
              error: err.message || "The uploaded file is not a valid JSON OpenAPI specification.", 
              isLoading: false 
            }));
          }
        };
        reader.onerror = () => {
          setState(prev => ({ ...prev, error: "Failed to read file.", isLoading: false }));
        };
        reader.readAsText(file);
      } catch (err) {
        setState(prev => ({ ...prev, error: "An unexpected error occurred.", isLoading: false }));
      }
    }, 100);
  };

  const handleCopy = useCallback(() => {
    if (state.result) {
      navigator.clipboard.writeText(state.result);
      alert("Copied to clipboard!");
    }
  }, [state.result]);

  const handleDownload = useCallback(() => {
    if (state.result) {
      const blob = new Blob([state.result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'llm.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [state.result]);

  const reset = () => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      fileName: null
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
          
          {/* Left Column: Input */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 h-full min-h-[400px] flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Upload Specification
            </h2>
            
            <p className="text-slate-500 mb-6 text-sm">
              Upload your OpenAPI 3.0 or Swagger 2.0 JSON file. 
              The local engine will parse endpoints, parameters, and schemas instantly.
            </p>

            <div className="flex-1 flex flex-col justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all p-10 text-center relative group">
              <input 
                type="file" 
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {state.fileName ? state.fileName : "Click to select a JSON file"}
                </span>
                <span className="text-xs text-slate-400 mt-1">Maximum file size: 5MB</span>
              </div>
            </div>

            {state.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {state.error}
              </div>
            )}

            {state.isLoading && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-600 font-medium">Processing schema...</p>
              </div>
            )}
            
            {state.result && (
              <button 
                onClick={reset}
                className="mt-6 w-full py-2 px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                Clear and Upload New
              </button>
            )}
          </section>

          {/* Right Column: Result */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Conversion Result (llm.txt)
              </h2>
              <div className="flex gap-2">
                <button 
                  disabled={!state.result}
                  onClick={handleCopy}
                  className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button 
                  disabled={!state.result}
                  onClick={handleDownload}
                  className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Download as llm.txt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-0 overflow-auto bg-slate-900 text-slate-300 relative group">
              {!state.result && !state.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic px-10 text-center">
                  Markdown output will appear here after uploading a specification.
                </div>
              )}
              
              {state.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] z-10">
                   <div className="w-1/2 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"></div>
                   </div>
                </div>
              )}

              {state.result && (
                <pre className="p-6 code-font text-sm leading-relaxed whitespace-pre-wrap">
                  {state.result}
                </pre>
              )}
            </div>
          </section>

        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-100 bg-white">
        Built with high-performance local parsing. No data is sent to external servers.
        <style>
          {`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}
        </style>
      </footer>
    </div>
  );
};

export default App;
