'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

interface Chat {
  id: number;
  name: string;
  channel: string;
  time: string;
  preview: string;
  messages?: Array<{ id: string; text: string; sender: string; timestamp: Date }>;
  sessionId?: string;
}

export default function InboxPage() {
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [chats, setChats] = useState<Chat[]>([
    { id: 1, name: 'Anonymous Visitor', channel: 'widget', time: '10:42 AM', preview: 'I need help with my account.', messages: [], sessionId: 'widget_1' },
    { id: 2, name: '+62 812-3456-7890', channel: 'whatsapp', time: '09:15 AM', preview: 'Thanks for the info!', messages: [] },
  ]);
  const [messageInput, setMessageInput] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!session?.user) return;

    const socket = io(window.location.origin, {
      query: {
        userId: (session.user as any).id,
        tenantId: (session.user as any).tenantId,
        namespace: 'inbox'
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Agent connected to Inbox via Socket.io');
    });

    // Listen for widget messages
    socket.on('widget_message', (data) => {
      console.log('Received widget message:', data);
      setChats(prev => prev.map(chat => {
        if (chat.sessionId === data.sessionId) {
          return {
            ...chat,
            messages: [...(chat.messages || []), {
              id: Date.now().toString(),
              text: data.message,
              sender: 'visitor',
              timestamp: new Date(data.timestamp)
            }],
            preview: data.message,
            time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return chat;
      }));
    });

    socket.on('disconnect', () => {
      console.log('Agent disconnected from Inbox');
    });

    return () => {
      socket.disconnect();
    };
  }, [session]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat, chats]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChat) return;

    const chat = chats.find(c => c.id === selectedChat);
    if (!chat) return;

    // Add message to chat
    setChats(prev => prev.map(c => {
      if (c.id === selectedChat) {
        return {
          ...c,
          messages: [...(c.messages || []), {
            id: Date.now().toString(),
            text: messageInput,
            sender: 'agent',
            timestamp: new Date()
          }]
        };
      }
      return c;
    }));

    // Send via Socket.io if it's a widget chat
    if (chat.sessionId && socketRef.current) {
      socketRef.current.emit('send_to_widget', {
        sessionId: chat.sessionId,
        message: messageInput
      });
    }

    setMessageInput('');
  };

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Omni-Inbox</h2>
          <p className="text-xs text-slate-500">2 active conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setSelectedChat(chat.id)}
              className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedChat === chat.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-slate-800">{chat.name}</span>
                <span className="text-xs text-slate-400">{chat.time}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{chat.preview}</p>
              <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${chat.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                {chat.channel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center shadow-sm z-10">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {chats.find(c => c.id === selectedChat)?.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                  Active now
                </p>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chats.find(c => c.id === selectedChat)?.messages && chats.find(c => c.id === selectedChat)!.messages!.length > 0 ? (
                chats.find(c => c.id === selectedChat)?.messages?.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'agent' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'} shadow-sm`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'agent' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-md bg-white border border-slate-200 text-slate-700 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <p className="text-sm">I need help with my account.</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center bg-slate-100 rounded-full pr-2 pl-4 py-1">
                <input 
                  type="text" 
                  placeholder="Type a message or / for canned responses..." 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
