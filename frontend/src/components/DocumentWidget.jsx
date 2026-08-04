import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, File, Settings2, Loader2, SplitSquareHorizontal } from 'lucide-react';

const DocumentWidget = ({ docData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'chunks'
  
  // Chunking State
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [strategy, setStrategy] = useState('recursive');
  const [isChunking, setIsChunking] = useState(false);
  const [chunksData, setChunksData] = useState(null);

  const { content, metadata } = docData;

  const handleChunkDocument = async () => {
    if (!content) return;
    setIsChunking(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/document/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
          strategy: strategy
        })
      });
      
      if (!response.ok) throw new Error('Chunking failed');
      const data = await response.json();
      setChunksData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChunking(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#2c2d44] border border-dusty-grape/15 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm mt-4 mb-4">
      {/* Header / Summary */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-space-indigo/5 dark:hover:bg-white/5 transition-colors gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-space-indigo/10 dark:bg-white/10 text-space-indigo dark:text-parchment rounded-xl shrink-0">
            {metadata.type === 'PDF' ? (
              <File className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-space-indigo dark:text-parchment font-display line-clamp-1">
              {metadata.filename}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-dusty-grape dark:text-lilac-ash font-medium">
              <span className="px-2 py-0.5 bg-dusty-grape/10 dark:bg-black/20 rounded-md">
                {metadata.type}
              </span>
              <span>•</span>
              <span>{metadata.pages} page{metadata.pages !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{(metadata.character_count / 1000).toFixed(1)}k chars</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-space-indigo/5 dark:bg-white/5 text-dusty-grape dark:text-parchment shrink-0">
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Content Preview */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 pt-0 flex flex-col h-full max-h-[600px]">
              <div className="w-full h-px bg-dusty-grape/10 dark:bg-white/10 mb-4" />
              
              {/* Tabs */}
              <div className="flex gap-4 border-b border-dusty-grape/10 dark:border-white/10 mb-4 px-2">
                <button 
                  onClick={() => setActiveTab('raw')}
                  className={`pb-2 text-sm font-semibold transition-colors relative ${activeTab === 'raw' ? 'text-space-indigo dark:text-parchment' : 'text-dusty-grape dark:text-lilac-ash hover:text-space-indigo/70 dark:hover:text-parchment/70'}`}
                >
                  Raw Text
                  {activeTab === 'raw' && <motion.div layoutId="doc_tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-space-indigo dark:bg-parchment" />}
                </button>
                <button 
                  onClick={() => setActiveTab('chunks')}
                  className={`pb-2 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${activeTab === 'chunks' ? 'text-space-indigo dark:text-parchment' : 'text-dusty-grape dark:text-lilac-ash hover:text-space-indigo/70 dark:hover:text-parchment/70'}`}
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  Chunking Playground
                  {activeTab === 'chunks' && <motion.div layoutId="doc_tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-space-indigo dark:bg-parchment" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'raw' ? (
                  <div className="bg-space-indigo/5 dark:bg-black/20 rounded-xl p-4">
                    <p className="text-sm text-space-indigo/80 dark:text-parchment/80 whitespace-pre-wrap font-sans leading-relaxed">
                      {content}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 h-full">
                    {/* Controls */}
                    <div className="flex flex-wrap items-end gap-4 p-4 bg-space-indigo/5 dark:bg-white/5 rounded-xl border border-dusty-grape/10 dark:border-white/10 shrink-0">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-space-indigo dark:text-parchment flex items-center gap-1">
                          <Settings2 className="w-3.5 h-3.5" /> Strategy
                        </label>
                        <select 
                          value={strategy}
                          onChange={(e) => setStrategy(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-dusty-grape/20 dark:border-white/10 text-sm text-space-indigo dark:text-parchment focus:outline-none focus:ring-2 focus:ring-space-indigo/30"
                        >
                          <option value="recursive">Recursive Character</option>
                          <option value="token">Token Splitter</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 w-32">
                        <label className="text-xs font-semibold text-space-indigo dark:text-parchment">
                          Chunk Size
                        </label>
                        <input 
                          type="number"
                          value={chunkSize}
                          onChange={(e) => setChunkSize(parseInt(e.target.value) || 0)}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-dusty-grape/20 dark:border-white/10 text-sm text-space-indigo dark:text-parchment focus:outline-none focus:ring-2 focus:ring-space-indigo/30"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1.5 w-32">
                        <label className="text-xs font-semibold text-space-indigo dark:text-parchment">
                          Overlap
                        </label>
                        <input 
                          type="number"
                          value={chunkOverlap}
                          onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 0)}
                          className="px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-dusty-grape/20 dark:border-white/10 text-sm text-space-indigo dark:text-parchment focus:outline-none focus:ring-2 focus:ring-space-indigo/30"
                        />
                      </div>
                      
                      <button
                        onClick={handleChunkDocument}
                        disabled={isChunking}
                        className="px-4 py-2 bg-space-indigo text-parchment dark:bg-parchment dark:text-space-indigo font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 h-[38px]"
                      >
                        {isChunking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Split'}
                      </button>
                    </div>

                    {/* Results Visualization */}
                    <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-2">
                      {!chunksData && !isChunking && (
                        <div className="h-full flex items-center justify-center text-sm text-dusty-grape dark:text-lilac-ash text-center p-8">
                          Click "Split" to visualize how this document breaks down into chunks for semantic search.
                        </div>
                      )}
                      
                      {chunksData && (
                        <div className="mb-2 text-xs font-semibold text-space-indigo/70 dark:text-parchment/70 flex justify-between items-center px-1">
                          <span>Generated {chunksData.num_chunks} chunks</span>
                          <span className="bg-space-indigo/10 dark:bg-white/10 px-2 py-1 rounded-md">
                            {chunksData.strategy === 'token' ? 'Tokens' : 'Characters'}
                          </span>
                        </div>
                      )}

                      {chunksData?.chunks.map((chunk, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                          key={idx} 
                          className={`p-4 rounded-xl border border-dusty-grape/10 dark:border-white/5 relative group ${
                            idx % 2 === 0 
                              ? 'bg-space-indigo/[0.03] dark:bg-white/[0.03]' 
                              : 'bg-dusty-grape/[0.03] dark:bg-black/20'
                          }`}
                        >
                          <div className="absolute top-3 right-4 text-[10px] font-bold text-space-indigo/40 dark:text-parchment/30 bg-white/50 dark:bg-black/50 px-2 py-1 rounded-md">
                            CHUNK {idx + 1}
                          </div>
                          <p className="text-sm text-space-indigo/90 dark:text-parchment/90 whitespace-pre-wrap font-sans leading-relaxed mt-4">
                            {chunk}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentWidget;
