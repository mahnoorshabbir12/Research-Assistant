import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, X, Loader2, FileText, ChevronRight } from 'lucide-react';

const KnowledgeBaseSidebar = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, top_k: 5 })
      });
      
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-[90vw] bg-white dark:bg-[#2c2d44] shadow-2xl z-50 border-l border-dusty-grape/10 dark:border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dusty-grape/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3 text-space-indigo dark:text-parchment">
                <div className="p-2 bg-space-indigo/10 dark:bg-white/10 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <h2 className="font-display font-semibold text-lg">Knowledge Base</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-dusty-grape hover:text-space-indigo dark:text-lilac-ash dark:hover:text-parchment transition-colors rounded-lg hover:bg-space-indigo/5 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 shrink-0 border-b border-dusty-grape/5 dark:border-white/5">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Semantic search across all documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-space-indigo/5 dark:bg-black/20 text-space-indigo dark:text-parchment rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-space-indigo/30 transition-all border border-transparent focus:border-space-indigo/20 dark:focus:border-white/10 placeholder-dusty-grape/50 dark:placeholder-lilac-ash/50"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty-grape dark:text-lilac-ash" />
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-space-indigo dark:bg-parchment text-white dark:text-space-indigo rounded-lg disabled:opacity-50 transition-opacity"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!hasSearched && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Database className="w-12 h-12 mb-4 text-dusty-grape dark:text-lilac-ash" />
                  <p className="text-sm text-space-indigo dark:text-parchment max-w-[250px]">
                    Search through all your embedded documents using semantic similarity.
                  </p>
                </div>
              )}

              {hasSearched && results.length === 0 && !isSearching && (
                <div className="text-center py-8 text-sm text-dusty-grape dark:text-lilac-ash">
                  No similar chunks found. Ensure you have added documents to the Knowledge Base.
                </div>
              )}

              {results.map((result, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={result.id}
                  className="bg-white dark:bg-black/20 border border-dusty-grape/10 dark:border-white/10 rounded-xl p-4 hover:border-space-indigo/30 dark:hover:border-parchment/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-space-indigo/80 dark:text-parchment/80">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{result.metadata?.filename || 'Unknown Document'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-500/10 px-2 py-1 rounded-md shrink-0">
                      SCORE: {result.distance.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-sm text-space-indigo/90 dark:text-parchment/90 line-clamp-4 leading-relaxed font-sans">
                    {result.content}
                  </p>
                  {result.metadata?.chunk_index !== undefined && (
                    <div className="mt-3 pt-3 border-t border-dusty-grape/5 dark:border-white/5 text-[10px] text-dusty-grape dark:text-lilac-ash uppercase tracking-wider font-semibold">
                      Chunk Index: {result.metadata.chunk_index}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KnowledgeBaseSidebar;
