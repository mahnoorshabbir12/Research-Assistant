import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, ChevronDown } from 'lucide-react';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState('researcher');
  const [userName, setUserName] = useState('User');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
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
          temperature: 0.7,
          persona: persona,
          user_name: userName,
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + chunk }
              ];
            }
            return prev;
          });
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

  return (
    <div className="flex flex-col h-[90vh] w-full max-w-5xl mx-auto p-4 md:p-6 font-sans">
      
      {/* Header / Navbar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between w-full mb-6 gap-4 relative z-20"
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
          <input 
            type="text" 
            value={userName} 
            onChange={(e) => setUserName(e.target.value)} 
            placeholder="Your Name"
            className="px-3 py-2 rounded-lg bg-white/80 dark:bg-white/5 border border-transparent hover:border-white/30 dark:hover:border-white/10 text-space-indigo dark:text-parchment focus:outline-none focus:ring-1 focus:ring-space-indigo w-32 placeholder-dusty-grape dark:placeholder-lilac-ash/60 transition-all font-medium"
          />
          <div className="h-6 w-px bg-dusty-grape/20 dark:bg-white/10 mx-1"></div>
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

      {/* Main Chat Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 bg-white dark:bg-[#1a1b2a] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-dusty-grape/15 dark:border-white/10 overflow-hidden flex flex-col min-h-0 relative z-10"
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-dusty-grape/70 dark:text-lilac-ash/70 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-parchment flex items-center justify-center mb-2">
                  <Bot className="w-8 h-8 text-space-indigo" />
                </div>
                <p className="text-xl font-display font-medium">Start a conversation</p>
                <p className="text-sm">Try asking about a complex scientific concept</p>
              </motion.div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-space-indigo text-parchment' 
                      : 'bg-white text-space-indigo border border-parchment'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[75%] px-6 py-4 rounded-3xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-space-indigo text-parchment rounded-tr-sm'
                      : 'bg-white dark:bg-space-indigo/40 text-space-indigo dark:text-parchment rounded-tl-sm border border-parchment/60 dark:border-white/5'
                  }`}>
                    {msg.content === '' && isLoading && idx === messages.length - 1 ? (
                      <div className="flex items-center gap-1.5 h-6">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-dusty-grape/50" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-dusty-grape/50" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-dusty-grape/50" />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-4 md:p-6 bg-parchment/30 dark:bg-black/20 border-t border-dusty-grape/10 dark:border-white/5">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="w-full pl-6 pr-16 py-5 rounded-2xl border-none bg-parchment/50 dark:bg-space-indigo text-space-indigo dark:text-parchment placeholder-dusty-grape/60 focus:outline-none focus:ring-2 focus:ring-space-indigo/20 shadow-inner text-base transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-3 bg-space-indigo text-parchment rounded-xl hover:bg-space-indigo/90 hover:scale-105 active:scale-95 focus:outline-none disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
          <p className="text-center text-xs text-dusty-grape/60 mt-3 font-medium">
            Powered by LangChain & Gemini
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatBox;
