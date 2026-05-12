'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MoreVertical } from 'lucide-react';

interface ChatWindowProps {
  tenantId: string;
  primaryColor?: string;
  botName?: string;
}

export function ChatWindow({ 
  tenantId, 
  primaryColor = '#2563eb', 
  botName = 'Support Bot' 
}: ChatWindowProps) {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hi! How can we help you today?', sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Tambah pesan user
    setMessages(prev => [...prev, { id: Date.now(), text: inputValue, sender: 'user' }]);
    setInputValue('');

    // Placeholder untuk Integrasi Flow Engine
    // Nanti akan diganti dengan emit Socket.io ke backend
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: 'Ini adalah respon sementara. Flow Engine sedang dibangun pada Fase 3.', 
        sender: 'bot' 
      }]);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 font-sans text-slate-800">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between p-4 shadow-sm z-10"
        style={{ backgroundColor: primaryColor, color: 'white' }}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shadow-inner">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-semibold text-base leading-tight">{botName}</h2>
            <p className="text-xs opacity-90 flex items-center mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
              Online
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-center text-xs text-slate-400 mb-6">Today</p>
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'bot' && (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Bot size={14} className="text-slate-500" />
              </div>
            )}
            
            <div 
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.sender === 'user' 
                  ? 'text-white rounded-br-sm' 
                  : 'bg-white border border-slate-100 rounded-bl-sm'
              }`}
              style={msg.sender === 'user' ? { backgroundColor: primaryColor } : {}}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Area */}
      <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSend} className="flex items-center gap-2 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-100 border-none focus:ring-2 rounded-full px-5 py-3 text-sm outline-none transition-all placeholder-slate-400"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-1.5 p-2 rounded-full text-white flex-shrink-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            POWERED BY MODERN SAAS CRM
          </p>
        </div>
      </div>
    </div>
  );
}
