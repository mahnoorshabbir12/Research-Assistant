import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center gap-3 mb-2">
          <div className="p-3 bg-space-indigo text-parchment rounded-2xl shadow-xl shadow-space-indigo/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-space-indigo dark:text-parchment tracking-tight">
            Research Assistant
          </h1>
        </div>
        <p className="text-dusty-grape dark:text-lilac-ash text-lg max-w-xl mx-auto font-medium">
          Your personal academic companion powered by advanced AI
        </p>
      </motion.div>

      {/* Main Chat Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 bg-white/70 dark:bg-indigo-glass backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white/50 dark:border-white/10 overflow-hidden flex flex-col"
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
        <div className="p-4 md:p-6 bg-white/50 dark:bg-space-indigo/50 backdrop-blur-md border-t border-white/40 dark:border-white/5">
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
