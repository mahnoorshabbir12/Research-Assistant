import { motion } from 'framer-motion';
import { FileText, File, Database } from 'lucide-react';

const DocumentWidget = ({ docData }) => {
  const { metadata } = docData;

  return (
    <div className="w-full bg-white dark:bg-[#2c2d44] border border-dusty-grape/15 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm mt-4 mb-4">
      {/* Header / Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
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
        
        <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
          <Database className="w-4 h-4" />
          <span>Added to Vector DB</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentWidget;
