import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, MessageSquare, Plus } from 'lucide-react';

const ChatHistorySidebar = ({ isOpen, onClose, sessions, currentSessionId, onSelectSession, onNewSession }) => {
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
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="font-display font-semibold text-lg">Chat History</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-dusty-grape hover:text-space-indigo dark:text-lilac-ash dark:hover:text-parchment transition-colors rounded-lg hover:bg-space-indigo/5 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4 shrink-0 border-b border-dusty-grape/5 dark:border-white/5">
              <button
                onClick={onNewSession}
                className="w-full flex items-center justify-center gap-2 py-3 bg-space-indigo text-white dark:bg-parchment dark:text-space-indigo rounded-xl hover:opacity-90 transition-opacity font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <MessageSquare className="w-12 h-12 mb-4 text-dusty-grape dark:text-lilac-ash" />
                  <p className="text-sm text-space-indigo dark:text-parchment max-w-[250px]">
                    No past conversations yet.
                  </p>
                </div>
              ) : (
                sessions.map((session, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`cursor-pointer border rounded-xl p-4 transition-colors ${
                      session.id === currentSessionId
                        ? 'bg-space-indigo/5 dark:bg-white/10 border-space-indigo/30 dark:border-parchment/30'
                        : 'bg-white dark:bg-black/20 border-dusty-grape/10 dark:border-white/10 hover:border-space-indigo/30 dark:hover:border-parchment/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-dusty-grape dark:text-lilac-ash shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-space-indigo dark:text-parchment truncate">
                          {session.title || 'New Chat'}
                        </h4>
                        <p className="text-xs text-dusty-grape dark:text-lilac-ash mt-1">
                          {new Date(session.updatedAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistorySidebar;

