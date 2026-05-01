import { useState, useRef, useEffect } from 'react';
import { chatWithAgent } from '../lib/api';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Chat() {
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Hello! I am the RentPi Assistant. I can help you with product availability, rental trends, category stats, and more. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const data = await chatWithAgent(sessionId, userText);
      setMessages(prev => [...prev, { role: 'bot', text: data.reply || data.error || 'Something went wrong.' }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: err.response?.data?.error || err.response?.data?.details || 'Sorry, I encountered an error connecting to the intelligence layer.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-card/30 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-black/20">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">RentPi Agentic AI</h2>
          <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online and ready
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={i}
              className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 ${
                msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-black/40 border border-white/5 text-foreground/90 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-[85%]">
            <div className="shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mt-1 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-black/40 border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/20 border-t border-border">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about product trends, availability, or categories..."
            className="w-full bg-black/40 border border-border/50 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-[15px]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
          >
            <Send className="h-5 w-5 ml-0.5" />
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
