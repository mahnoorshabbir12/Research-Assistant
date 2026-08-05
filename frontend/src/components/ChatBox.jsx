import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, ChevronDown, BrainCircuit, Layers, Paperclip, FileText, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import QuizWidget from './QuizWidget';
import FlashcardWidget from './FlashcardWidget';
import DocumentWidget from './DocumentWidget';
import KnowledgeBaseSidebar from './KnowledgeBaseSidebar';

const ChatBox = () => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState('researcher');
  const [userName, setUserName] = useState('User');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollRafRef = useRef(null);

  const handleGenerateStructured = async (type) => {
    if (isLoading || messages.length === 0) return;
    setIsLoading(true);

    try {
      setMessages((prev) => [...prev, { role: 'assistant', type: 'loading', content: `Generating ${type}...` }]);
      const endpoint = type === 'quiz' ? '/api/generate/quiz' : '/api/generate/flashcards';
      
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter(m => !m.type), // Keep for legacy/fallback, but backend uses sessionId
          session_id: sessionId,
          temperature: 0.3,
          persona: persona,
          user_name: userName,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', type: type, data: data }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', type: 'error', content: `Failed to generate ${type}.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages];
    
    if (pendingAttachment) {
      newMessages.push({ role: 'user', content: `[Attached Document: ${pendingAttachment.metadata.filename}]`, type: 'document', data: pendingAttachment });
      setPendingAttachment(null);
    }
    
    if (input.trim()) {
      newMessages.push({ role: 'user', content: input });
    }
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          session_id: sessionId,
          temperature: 0.7,
          persona: persona,
          user_name: userName,
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let buffer = '';
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop(); // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.slice(6));
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.role === 'assistant') {
                    if (payload.type === 'content') {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: lastMessage.content + payload.data }
                      ];
                    } else if (payload.type === 'log') {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, logs: [...(lastMessage.logs || []), payload.data] }
                      ];
                    } else if (payload.type === 'usage') {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, usage: payload.data }
                      ];
                    }
                  }
                  return prev;
                });
              } catch (e) {
                console.error("Failed to parse SSE", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection failed. Please ensure the backend is running.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      setPendingAttachment(data);
    } catch (error) {
      console.error('Upload Error:', error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', type: 'error', content: `Failed to process document.` }
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full font-sans bg-transparent">
      
      {/* Header / Navbar - Full Width */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between w-full px-6 py-4 border-b border-dusty-grape/10 dark:border-white/5 bg-white/40 dark:bg-[#1a1b2e]/60 backdrop-blur-xl relative z-20 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-space-indigo text-parchment rounded-xl shadow-lg shadow-space-indigo/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-2xl font-bold font-display text-space-indigo dark:text-parchment tracking-tight leading-none">
              Research Assistant
            </h1>
            <p className="text-dusty-grape dark:text-lilac-ash text-xs font-medium mt-1 uppercase tracking-wider">
              Powered by Advanced AI
            </p>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="flex items-center gap-1.5 text-sm bg-white/60 dark:bg-black/40 p-1.5 rounded-xl backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-space-indigo/5 dark:bg-white/5 hover:bg-space-indigo/10 dark:hover:bg-white/10 text-space-indigo dark:text-parchment font-medium transition-colors"
            title="Open Knowledge Base"
          >
            <Database className="w-4 h-4" />
            <span className="hidden md:inline">Knowledge Base</span>
          </button>
          
          <div className="h-6 w-px bg-dusty-grape/20 dark:bg-white/10 mx-1"></div>
          
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your Name"
            className="px-3 py-2 rounded-lg bg-white/80 dark:bg-white/5 border border-dusty-grape/15 dark:border-white/10 hover:border-dusty-grape/30 dark:hover:border-white/15 text-space-indigo dark:text-parchment focus:outline-none focus:ring-1 focus:ring-space-indigo w-32 placeholder-dusty-grape dark:placeholder-lilac-ash/60 transition-all font-medium hidden md:block"
          />
          <div className="h-6 w-px bg-dusty-grape/20 dark:bg-white/10 mx-1 hidden md:block"></div>
          {/* Custom Dropdown */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-white/5 border border-transparent hover:border-white/30 dark:hover:border-white/10 text-space-indigo dark:text-parchment focus:outline-none focus:ring-1 focus:ring-space-indigo transition-all cursor-pointer font-medium min-w-[130px]"
            >
              <span className="capitalize">{persona === 'tutor' ? 'Socratic Tutor' : persona}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#2c2d44] rounded-xl shadow-xl border border-dusty-grape/10 dark:border-white/10 overflow-hidden z-50 py-1.5"
                  >
                    {[
                      { id: 'researcher', label: 'Researcher' },
                      { id: 'tutor', label: 'Socratic Tutor' },
                      { id: 'summarizer', label: 'Summarizer' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPersona(p.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          persona === p.id 
                            ? 'bg-space-indigo/5 dark:bg-white/10 font-semibold text-space-indigo dark:text-parchment' 
                            : 'hover:bg-space-indigo/5 dark:hover:bg-white/5 text-dusty-grape dark:text-lilac-ash hover:text-space-indigo dark:hover:text-parchment'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 z-10 w-full">
        {/* Messages Scroll Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6 pb-6">
            {messages.length === 0 ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-dusty-grape/70 dark:text-lilac-ash/70 space-y-4">
                <div className="w-16 h-16 rounded-full bg-parchment flex items-center justify-center mb-2">
                  <Bot className="w-8 h-8 text-space-indigo" />
                </div>
                <p className="text-xl font-display font-medium">Start a conversation</p>
                <p className="text-sm">Try asking about a complex scientific concept</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-[fadeIn_0.2s_ease-out]`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-md ${
                    msg.role === 'user'
                      ? 'bg-space-indigo text-parchment'
                      : 'bg-white text-space-indigo border border-parchment'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  {/* Message Bubble or Widget */}
                  {msg.type && msg.type !== 'loading' && msg.type !== 'error' ? (
                    <div className="flex-1 min-w-0">
                      {msg.type === 'quiz' && <QuizWidget quizData={msg.data} />}
                      {msg.type === 'flashcards' && <FlashcardWidget deckData={msg.data} />}
                      {msg.type === 'document' && <DocumentWidget docData={msg.data} />}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-space-indigo text-parchment rounded-tr-sm'
                        : 'bg-white dark:bg-white/[0.04] text-space-indigo dark:text-parchment rounded-tl-sm border border-parchment/60 dark:border-white/8'
                    }`}>
                      {msg.content === '' && isLoading && idx === messages.length - 1 ? (
                        <div className="flex flex-col gap-2">
                          {msg.logs && msg.logs.length > 0 && (
                            <div className="flex flex-col gap-1 text-xs text-dusty-grape/70 dark:text-lilac-ash/70 font-mono mb-2">
                              {msg.logs.map((log, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                  <Bot className="w-3 h-3" /> {log}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 h-6 text-dusty-grape/80 dark:text-lilac-ash/80 text-sm font-medium">
                            <span>Thinking</span>
                            <span className="inline-flex items-center gap-1 ml-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-dusty-grape/50 animate-[pulse_1s_ease-in-out_infinite]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-dusty-grape/50 animate-[pulse_1s_ease-in-out_0.2s_infinite]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-dusty-grape/50 animate-[pulse_1s_ease-in-out_0.4s_infinite]" />
                            </span>
                          </div>
                        </div>
                      ) : msg.type === 'loading' ? (
                        <div className="flex items-center gap-3 h-6 text-dusty-grape dark:text-lilac-ash font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {msg.content}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-space-indigo/5 dark:prose-pre:bg-white/5">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {msg.usage && !isLoading && (
                            <div className="self-end mt-2 px-2 py-0.5 rounded-full bg-space-indigo/5 dark:bg-white/5 border border-dusty-grape/10 dark:border-white/10 text-[10px] font-mono text-dusty-grape/60 dark:text-lilac-ash/60">
                              {msg.usage.total_tokens} tokens
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Area - Static Bottom */}
        <div className="w-full border-t border-dusty-grape/10 dark:border-white/5 bg-white/60 dark:bg-[#1a1b2e]/80 backdrop-blur-xl px-4 md:px-8 py-4 z-20 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2.5">

          {/* Pending Attachment Chip */}
          <AnimatePresence>
            {pendingAttachment && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="flex items-center gap-3 bg-white/80 dark:bg-white/5 backdrop-blur-md border border-dusty-grape/20 dark:border-white/10 rounded-xl p-2.5 shadow-sm max-w-sm"
              >
                <div className="p-2 bg-space-indigo/10 dark:bg-white/10 rounded-lg text-space-indigo dark:text-parchment">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-space-indigo dark:text-parchment truncate">
                    {pendingAttachment.metadata.filename}
                  </p>
                  <p className="text-xs text-dusty-grape dark:text-lilac-ash">
                    {(pendingAttachment.metadata.character_count / 1000).toFixed(1)}k chars
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(null)}
                  className="p-1.5 hover:bg-dusty-grape/10 dark:hover:bg-white/10 rounded-md text-dusty-grape dark:text-parchment/70 transition-colors"
                >
                  <span className="text-xs font-bold leading-none">✕</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendMessage} className="relative flex items-center group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="absolute left-3.5 p-2 text-dusty-grape/40 hover:text-space-indigo dark:text-parchment/30 dark:hover:text-parchment transition-colors z-10 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-space-indigo dark:text-parchment" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or attach a document..."
              disabled={isLoading || isUploading}
              className="w-full pl-12 pr-40 py-4 rounded-2xl border border-dusty-grape/15 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm text-space-indigo dark:text-parchment placeholder-dusty-grape/50 dark:placeholder-parchment/40 focus:outline-none focus:ring-2 focus:ring-space-indigo/20 dark:focus:ring-parchment/15 focus:border-transparent text-[15px] transition-all shadow-sm disabled:opacity-50"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleGenerateStructured('quiz')}
                disabled={isLoading || messages.length === 0}
                title="Generate Quiz"
                className="p-2 rounded-lg text-dusty-grape/50 hover:text-space-indigo hover:bg-space-indigo/5 dark:text-parchment/40 dark:hover:text-parchment dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <BrainCircuit className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={() => handleGenerateStructured('flashcards')}
                disabled={isLoading || messages.length === 0}
                title="Generate Flashcards"
                className="p-2 rounded-lg text-dusty-grape/50 hover:text-space-indigo hover:bg-space-indigo/5 dark:text-parchment/40 dark:hover:text-parchment dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <Layers className="w-4.5 h-4.5" />
              </button>
              <div className="w-px h-5 bg-dusty-grape/15 dark:bg-white/10"></div>
              <button
                type="submit"
                disabled={isLoading || isUploading || (!input.trim() && !pendingAttachment)}
                className="p-2.5 bg-space-indigo dark:bg-parchment text-parchment dark:text-space-indigo rounded-xl hover:bg-space-indigo/90 dark:hover:bg-parchment/90 active:scale-95 focus:outline-none disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
          <p className="text-center text-[11px] text-dusty-grape/40 dark:text-parchment/30 font-medium">
            Powered by LangChain & Gemini
          </p>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <KnowledgeBaseSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};

export default ChatBox;
