import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, File } from 'lucide-react';

const DocumentWidget = ({ docData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { content, metadata } = docData;

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
            <div className="p-4 pt-0">
              <div className="w-full h-px bg-dusty-grape/10 dark:bg-white/10 mb-4" />
              <div className="bg-space-indigo/5 dark:bg-black/20 rounded-xl p-4 max-h-96 overflow-y-auto">
                <p className="text-sm text-space-indigo/80 dark:text-parchment/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {content}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentWidget;
