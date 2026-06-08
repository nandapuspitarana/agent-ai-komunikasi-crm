'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, PanelRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { CannedResponses } from '@/components/inbox/CannedResponses';

interface Chat {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  createdAt: string;
  messages: Array<{ id: string; text: string; sender: string; timestamp: string }>;
  preview: string;
  time: string;
}

export default function InboxPage() {
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch active chat sessions
  useEffect(() => {
    if (!session?.user) return;

    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        if (res.ok) {
          const data = await res.json();
          setChats(data);
          if (data.length > 0 && !selectedChat) {
            setSelectedChat(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch chat sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [session]);

  // Join the selected chat session room to receive realtime messages for it
  useEffect(() => {
    if (selectedChat && socketRef.current) {
      socketRef.current.emit('join_session', { sessionId: selectedChat });
      console.log('Emitted join_session for room:', selectedChat);
    }
  }, [selectedChat]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!session?.user) return;

    const socket = io(window.location.origin, {
      path: '/api/socket',
      query: {
        userId: (session.user as any).id,
        tenantId: (session.user as any).tenantId
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Agent connected to Inbox via Socket.io');
      // If we already have a selected chat, make sure we join its room on reconnect
      if (selectedChat) {
        socket.emit('join_session', { sessionId: selectedChat });
      }
    });

    // Listen for widget messages
    socket.on('widget_message', (data) => {
      console.log('Received widget message:', data);
      setChats(prev => {
        const existingChat = prev.find(chat => chat.id === data.sessionId);
        if (existingChat) {
          return prev.map(chat => {
            if (chat.id === data.sessionId) {
              const messages = chat.messages || [];
              // Prevent duplicates
              if (messages.some(m => m.text === data.message && m.sender === 'user')) {
                return chat;
              }
              return {
                ...chat,
                messages: [...messages, {
                  id: Date.now().toString() + Math.random(),
                  text: data.message,
                  sender: 'user',
                  timestamp: new Date(data.timestamp || Date.now()).toISOString()
                }],
                preview: data.message,
                time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return chat;
          });
        } else {
          // Create new chat for unknown session
          const newChat: Chat = {
            id: data.sessionId,
            contactId: 'Pengunjung Baru',
            channel: 'widget',
            status: 'bot',
            createdAt: new Date(data.timestamp || Date.now()).toISOString(),
            time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            preview: data.message,
            messages: [{
              id: Date.now().toString(),
              text: data.message,
              sender: 'user',
              timestamp: new Date(data.timestamp || Date.now()).toISOString()
            }]
          };
          return [newChat, ...prev];
        }
      });
    });

    // Listen for bot responses
    socket.on('bot_reply', (data: { sessionId: string; message: string; timestamp: string }) => {
      console.log('Received bot reply:', data);
      setChats(prev => prev.map(chat => {
        if (chat.id === data.sessionId) {
          const messages = chat.messages || [];
          if (messages.some(m => m.text === data.message && m.sender === 'bot')) {
            return chat;
          }
          return {
            ...chat,
            messages: [...messages, {
              id: Date.now().toString() + Math.random(),
              text: data.message,
              sender: 'bot',
              timestamp: new Date(data.timestamp || Date.now()).toISOString()
            }],
            preview: data.message,
            time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return chat;
      }));
    });

    // Listen for agent messages (sent by other sessions or tabs)
    socket.on('agent_message', (data: { sessionId: string; message: string; timestamp: string }) => {
      console.log('Received agent message:', data);
      setChats(prev => prev.map(chat => {
        if (chat.id === data.sessionId) {
          const messages = chat.messages || [];
          if (messages.some(m => m.text === data.message && m.sender === 'agent')) {
            return chat;
          }
          return {
            ...chat,
            messages: [...messages, {
              id: Date.now().toString() + Math.random(),
              text: data.message,
              sender: 'agent',
              timestamp: new Date(data.timestamp || Date.now()).toISOString()
            }],
            preview: data.message,
            time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return chat;
      }));
    });

    // Listen for agent joined event
    socket.on('agent_joined', (data: { agentName: string; agentId: string; sessionId?: string }) => {
      console.log('Agent joined conversation:', data);
      const sId = data.sessionId || selectedChat;
      if (!sId) return;
      setChats(prev => prev.map(chat => {
        if (chat.id === sId) {
          const messages = chat.messages || [];
          return {
            ...chat,
            status: 'agent',
            messages: [...messages, {
              id: Date.now().toString() + Math.random(),
              text: `✅ Agen ${data.agentName || 'kami'} bergabung ke percakapan.`,
              sender: 'system',
              timestamp: new Date().toISOString()
            }]
          };
        }
        return chat;
      }));
    });

    // Listen for handoff request notification
    socket.on('handoff_requested', (data: { sessionId: string; reason: string; lastMessage: string }) => {
      console.log('Handoff requested in tenant:', data);
      setChats(prev => prev.map(chat => {
        if (chat.id === data.sessionId) {
          return {
            ...chat,
            status: 'queue',
            preview: data.lastMessage || chat.preview,
          };
        }
        return chat;
      }));
    });

    // Listen for session updates (like status changes or assigned agent changes)
    socket.on('session_updated', (data: { sessionId: string; status: string; assignedAgentId?: string }) => {
      console.log('Session updated:', data);
      setChats(prev => prev.map(chat => {
        if (chat.id === data.sessionId) {
          return {
            ...chat,
            status: data.status,
            assignedAgentId: data.assignedAgentId || chat.assignedAgentId
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
  }, [session, selectedChat]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat, chats]);

  // Function to manually claim a conversation
  const handleClaimChat = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/claim`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state immediately
        setChats(prev => prev.map(chat => {
          if (chat.id === sessionId) {
            return {
              ...chat,
              status: 'agent',
              messages: [...(chat.messages || []), {
                id: Date.now().toString() + Math.random(),
                text: `✅ Anda mengambil alih percakapan.`,
                sender: 'system',
                timestamp: new Date().toISOString()
              }]
            };
          }
          return chat;
        }));
      } else {
        console.error('Failed to claim session');
      }
    } catch (error) {
      console.error('Error claiming chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;

    const chat = chats.find(c => c.id === selectedChat);
    if (!chat) return;

    // Optimistically add message to UI
    const tempMessage = {
      id: 'temp-' + Date.now(),
      text: messageInput,
      sender: 'agent',
      timestamp: new Date().toISOString()
    };

    setChats(prev => prev.map(c => {
      if (c.id === selectedChat) {
        return {
          ...c,
          status: 'agent', // Auto take over status
          messages: [...(c.messages || []), tempMessage],
          preview: messageInput,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return c;
    }));

    setMessageInput('');

    try {
      // Send to backend API
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedChat,
          content: messageInput
        })
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      // If the backend returns that session status updated, sync it
      const responseData = await res.json();
      if (responseData.status && responseData.status !== chat.status) {
        setChats(prev => prev.map(c => {
          if (c.id === selectedChat) {
            return {
              ...c,
              status: responseData.status
            };
          }
          return c;
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update or show error
    }
  };

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Omni-Inbox</h2>
          <p className="text-xs text-slate-500">{chats.length} active conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">Loading conversations...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No active conversations</div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChat(chat.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedChat === chat.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-slate-800">{chat.contactId}</span>
                  <span className="text-xs text-slate-400">{chat.time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.preview}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${chat.channel === 'whatsapp' ? 'bg-green-100 text-green-700 font-medium' : 'bg-purple-100 text-purple-700 font-medium'}`}>
                    {chat.channel}
                  </span>
                  {chat.status === 'queue' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold animate-pulse">
                      ⏳ Handoff ke Agen
                    </span>
                  )}
                  {chat.status === 'bot' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      🤖 AI Bot
                    </span>
                  )}
                  {chat.status === 'agent' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      👤 Ditangani
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3 shadow-inner">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {chats.find(c => c.id === selectedChat)?.contactId}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center mt-0.5">
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${chats.find(c => c.id === selectedChat)?.status === 'queue' ? 'bg-amber-400' : 'bg-green-500'}`}></span>
                    {chats.find(c => c.id === selectedChat)?.status === 'queue' ? 'Menunggu Agen' : 'Aktif'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {chats.find(c => c.id === selectedChat)?.status === 'queue' && (
                  <button
                    onClick={() => handleClaimChat(selectedChat)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center"
                  >
                    Ambil Percakapan
                  </button>
                )}
                {chats.find(c => c.id === selectedChat)?.status === 'bot' && (
                  <button
                    onClick={() => handleClaimChat(selectedChat)}
                    className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center"
                  >
                    Intervensi AI (Ambil)
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chats.find(c => c.id === selectedChat)?.messages && chats.find(c => c.id === selectedChat)!.messages!.length > 0 ? (
                chats.find(c => c.id === selectedChat)?.messages?.map(msg => {
                  if (msg.sender === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-xs bg-slate-200/80 text-slate-600 rounded-full px-3 py-1 font-medium">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isAgent = msg.sender === 'agent';
                  const isBot = msg.sender === 'bot';

                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md p-3 rounded-2xl ${
                        isAgent 
                          ? 'bg-blue-600 text-white rounded-br-sm shadow-sm' 
                          : isBot 
                          ? 'bg-amber-50 border border-amber-100 text-slate-700 rounded-tl-sm shadow-sm' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                      }`}>
                        {isBot && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[9px] bg-amber-200 text-amber-800 font-bold px-1 py-0.5 rounded tracking-wide">
                              🤖 AI BOT
                            </span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${isAgent ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-md bg-white border border-slate-200 text-slate-700 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <p className="text-sm">Belum ada pesan.</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
 
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center bg-slate-100 rounded-full pr-2 pl-4 py-1 mb-2">
                <input 
                  type="text" 
                  placeholder="Ketik pesan atau / untuk template balasan..." 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none"
                />
                <button 
                  onClick={() => setShowCannedResponses(!showCannedResponses)}
                  className="p-2 text-slate-500 hover:text-blue-600 transition-colors mr-1"
                  title="Canned Responses"
                >
                  <PanelRight size={18} />
                </button>
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
              {showCannedResponses && session?.user && (
                <div className="border-t border-slate-200 pt-2">
                  <CannedResponses 
                    tenantId={(session.user as any).tenantId}
                    agentId={(session.user as any).id}
                    onSelect={(response) => {
                      setMessageInput(prev => prev + (prev ? ' ' : '') + response.content);
                      setShowCannedResponses(false);
                    }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Pilih percakapan untuk mulai berkirim pesan</p>
          </div>
        )}
      </div>
    </div>
  );
}
