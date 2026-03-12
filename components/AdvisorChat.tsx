/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, AdvisorPersona } from '../types';

interface AdvisorChatProps {
  history: ChatMessage[];
  onSend: (msg: string) => void;
  isLoading: boolean;
  onClose: () => void;
  persona: AdvisorPersona;
}

const AdvisorChat: React.FC<AdvisorChatProps> = ({ history, onSend, isLoading, onClose, persona }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#151619] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden h-[60vh]">
        
        {/* Header */}
        <div className="bg-white/5 p-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-300 font-bold border border-white/10 shadow-inner">
                {persona[0]}
            </div>
            <div>
                <div className="text-sm font-bold text-stone-100 uppercase tracking-widest font-mono">{persona}</div>
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">Royal Advisor</div>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1a1b1e]">
          {history.length === 0 && (
             <div className="text-center text-stone-500 text-sm italic mt-10 font-serif">
                "Ask me anything about the kingdom, Sire."
             </div>
          )}
          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm shadow-md ${
                msg.role === 'user' 
                  ? 'bg-stone-200 text-black rounded-tr-sm' 
                  : 'bg-[#25262b] text-stone-200 border border-white/5 rounded-tl-sm font-serif leading-relaxed'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-[#25262b] text-stone-400 px-5 py-3 rounded-2xl rounded-tl-sm border border-white/5 text-xs italic font-serif shadow-md flex items-center gap-2">
                  Consulting the scrolls
                  <span className="flex gap-1">
                      <span className="w-1 h-1 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
               </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-[#151619] border-t border-white/5 flex gap-3">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for advice..."
            className="flex-1 bg-[#1a1b1e] text-stone-200 px-4 py-3 rounded-xl border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/30 outline-none text-sm placeholder:italic font-serif transition-all"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-white hover:bg-stone-200 disabled:opacity-50 disabled:hover:bg-white text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-lg"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdvisorChat;
