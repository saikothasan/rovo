'use client';

import { useState } from 'react';
import { Search, Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils'; // Standard shadcn util

interface ToolRunnerProps {
  toolId: string;
  title: string;
  description: string;
  placeholder?: string;
}

export function ToolRunner({ toolId, title, description, placeholder = "example.com" }: ToolRunnerProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/tools?tool=${toolId}&q=${encodeURIComponent(query)}`);
      const json = await res.json();
      
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-gray-400 max-w-lg">{description}</p>
      </div>

      {/* Input Section - Premium "Glass" Effect */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        <div className="relative flex items-center bg-surface border border-white/10 rounded-xl p-2 shadow-2xl">
          <Search className="w-5 h-5 text-gray-500 ml-3" />
          <input
            type="text"
            className="w-full bg-transparent border-none focus:ring-0 text-white font-mono px-4 py-2 placeholder:text-gray-600"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          />
          <button
            onClick={handleRun}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </motion.div>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-black/40 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Result Output</span>
              <button className="text-gray-500 hover:text-white transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-0 overflow-x-auto">
              <pre className="p-6 text-sm font-mono text-blue-100/90 leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
