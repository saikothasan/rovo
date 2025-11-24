'use client';

import { useState } from 'react';
import { Search, Loader2, Copy, AlertCircle, Terminal, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolConfig, ToolResult } from '@/lib/types';

interface ToolRunnerProps {
  toolConfig: ToolConfig;
}

export function ToolRunner({ toolConfig }: ToolRunnerProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);

  const handleRun = async () => {
    if (!query && toolConfig.inputType !== 'none') return;
    
    setLoading(true);
    setResult(null);

    try {
      const q = encodeURIComponent(query);
      const res = await fetch(`/api/tools?slug=${toolConfig.slug}&q=${q}`);
      const data: ToolResult = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ 
        status: 'error', 
        timestamp: new Date().toISOString(), 
        message: err instanceof Error ? err.message : 'Network Error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const isInputRequired = toolConfig.inputType !== 'none';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono mb-2 border border-blue-500/20">
          {toolConfig.category}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">{toolConfig.title}</h1>
        <p className="text-gray-400 max-w-xl">{toolConfig.description}</p>
      </div>

      {/* Input Area */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition duration-500" />
        <div className="relative flex items-center bg-[#0A0A0B] border border-white/10 rounded-xl p-2 shadow-2xl">
          
          {isInputRequired ? (
            <>
              <Search className="w-5 h-5 text-gray-500 ml-4" />
              <input
                type="text"
                className="w-full bg-transparent border-none focus:ring-0 text-white font-mono px-4 py-3 placeholder:text-gray-600 text-lg"
                placeholder={
                  toolConfig.inputType === 'host-port' ? "example.com:443" :
                  toolConfig.inputType === 'text' ? "Enter text to process..." : 
                  "example.com"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              />
            </>
          ) : (
            <div className="flex-1 px-6 py-3 text-gray-500 font-mono italic flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Auto-generated (No input needed)
            </div>
          )}
          
          <button
            onClick={handleRun}
            disabled={loading || (isInputRequired && !query)}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-8 py-3 rounded-lg font-medium transition-all flex items-center gap-2 min-w-[140px] justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run Tool'}
          </button>
        </div>
      </div>

      {/* Results Display */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Error State */}
            {result.status === 'error' && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Analysis Failed</p>
                  <p className="text-sm opacity-80">{result.message}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {result.status === 'success' && (
              <div className="rounded-xl border border-white/10 bg-[#0A0A0B] overflow-hidden shadow-2xl">
                {/* Result Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${result.grade === 'F' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-mono text-gray-400 uppercase tracking-wider">
                      Status: {result.grade ? `Grade ${result.grade}` : 'Active'}
                    </span>
                  </div>
                  <button className="text-gray-500 hover:text-white transition-colors" title="Copy JSON">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {/* Visual Grade Badge (If applicable) */}
                {result.grade && (
                  <div className="p-8 flex justify-center border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div className="flex flex-col items-center">
                      <ShieldCheck className={`w-12 h-12 mb-2 ${
                        result.grade === 'A' ? 'text-green-500' : 
                        result.grade === 'B' ? 'text-yellow-500' : 'text-red-500'
                      }`} />
                      <span className="text-4xl font-bold text-white">{result.grade}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">Security Score</span>
                    </div>
                  </div>
                )}

                {/* JSON Data View */}
                <div className="p-0 overflow-x-auto custom-scrollbar">
                  <pre className="p-6 text-sm font-mono text-blue-100/90 leading-relaxed">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
