'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, PanelRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { CannedResponses } from '@/components/inbox/CannedResponses';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface Chat {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  createdAt: string;
  messages: Array<{ id: string; text: string; sender: string; timestamp: string }>;
  preview: string;
  time: string;
  assignedAgentId?: string;
  assignedAgentName?: string | null;
}

export default function InboxPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
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
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/users?limit=100');
        if (res.ok) {
          const data = await res.json();
          // Filter agents or show all users who can handle chats
          setAgents(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchSessions();
    if ((session.user as any).role === 'SUPER_ADMIN' || (session.user as any).role === 'BUSINESS_PARTNER') {
      fetchAgents();
    }
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
            contactId: 'New Visitor',
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
              text: `✅ Agent ${data.agentName || ''} joined the conversation.`,
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
  const handleClaimChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${chatId}/claim`, {
        method: 'POST'
      });
      if (res.ok) {
        // Optimistic UI update
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return { 
              ...chat, 
              status: 'agent', 
              assignedAgentId: (session?.user as any)?.id, 
              assignedAgentName: session?.user?.name,
              messages: [...(chat.messages || []), {
                id: Date.now().toString() + Math.random(),
                text: `✅ You took over the conversation.`,
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

  const handleReassignChat = async (chatId: string, newAgentId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${chatId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedAgentId: newAgentId })
      });
      if (res.ok) {
        const newAgentName = agents.find(a => a.id === newAgentId)?.name || 'Unknown Agent';
        setChats(prev => prev.map(chat => {
          if (chat.id === chatId) {
            return { 
              ...chat, 
              assignedAgentId: newAgentId, 
              assignedAgentName: newAgentName,
              messages: [...(chat.messages || []), {
                id: Date.now().toString() + Math.random(),
                text: `🔄 Conversation transferred to ${newAgentName}.`,
                sender: 'system',
                timestamp: new Date().toISOString()
              }]
            };
          }
          return chat;
        }));
        // Notify others
        if (socketRef.current) {
          socketRef.current.emit('agent_joined', { sessionId: chatId });
        }
      } else {
        const err = await res.json();
        alert('Failed to transfer conversation: ' + err.error);
      }
    } catch (error) {
      console.error('Error reassigning chat:', error);
    }
  };

  const handleCloseChat = async (sessionId: string) => {
    if (!confirm('Are you sure you want to close this conversation and request a review from the visitor?')) return;
    
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/close`, {
        method: 'POST',
      });
      if (res.ok) {
        setChats(prev => prev.map(chat => {
          if (chat.id === sessionId) {
            return {
              ...chat,
              status: 'closed',
              messages: [...(chat.messages || []), {
                id: Date.now().toString() + Math.random(),
                text: `Conversation has been closed by agent. Requesting review from user...`,
                sender: 'system',
                timestamp: new Date().toISOString()
              }]
            };
          }
          return chat;
        }));
      } else {
        console.error('Failed to close session');
      }
    } catch (error) {
      console.error('Error closing chat:', error);
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
          <h2 className="font-semibold text-slate-800">{t('inbox', 'omniInbox')}</h2>
          <p className="text-xs text-slate-500">{chats.length} {t('inbox', 'activeConversations')}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">{t('inbox', 'loadingConversations')}</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-slate-500">{t('inbox', 'noActiveConversations')}</div>
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
                      ⏳ Handoff
                    </span>
                  )}
                  {chat.status === 'bot' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      🤖 AI Bot
                    </span>
                  )}
                  {chat.status === 'agent' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      👤 Handled
                    </span>
                  )}
                  {chat.status === 'closed' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                      ✓ Done
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
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-500 flex items-center mt-0.5">
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${chats.find(c => c.id === selectedChat)?.status === 'queue' ? 'bg-amber-400' : 'bg-green-500'}`}></span>
                      {chats.find(c => c.id === selectedChat)?.status === 'queue' ? t('inbox', 'waitingForAgent') : t('inbox', 'active')}
                    </p>
                    {chats.find(c => c.id === selectedChat)?.status === 'agent' && chats.find(c => c.id === selectedChat)?.assignedAgentName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {t('inbox', 'handledBy')} <span className="font-medium text-slate-800">{chats.find(c => c.id === selectedChat)?.assignedAgentName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {((session?.user as any)?.role === 'SUPER_ADMIN' || (session?.user as any)?.role === 'BUSINESS_PARTNER') && chats.find(c => c.id === selectedChat)?.status === 'agent' && (
                  <select
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-lg outline-none cursor-pointer"
                    value={chats.find(c => c.id === selectedChat)?.assignedAgentId || ''}
                    onChange={(e) => handleReassignChat(selectedChat, e.target.value)}
                  >
                    <option value="" disabled>{t('inbox', 'transferTo')}</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                )}
                {chats.find(c => c.id === selectedChat)?.status === 'queue' && (
                  <button
                    onClick={() => handleClaimChat(selectedChat)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center"
                  >
                    {t('inbox', 'takeConversation')}
                  </button>
                )}
                {chats.find(c => c.id === selectedChat)?.status === 'bot' && (
                  <button
                    onClick={() => handleClaimChat(selectedChat)}
                    className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center"
                  >
                    {t('inbox', 'aiIntervention')}
                  </button>
                )}
                {(chats.find(c => c.id === selectedChat)?.status === 'agent' || chats.find(c => c.id === selectedChat)?.status === 'queue') && (
                  <button
                    onClick={() => handleCloseChat(selectedChat)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center border border-slate-300"
                  >
                    {t('inbox', 'closeConversation')}
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-4 relative">
              <style dangerouslySetInnerHTML={{__html: `
                .chat-html-content .form-card { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 8px; }
                .chat-html-content .form-card_label { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; display: block; }
                .chat-html-content .form-card_input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; margin-bottom: 8px; outline: none; }
                .chat-html-content .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .chat-html-content .submit-btn { background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; width: 100%; font-size: 12px; font-weight: 600; cursor: pointer; margin-top: 4px; }
                .chat-html-content .submit-btn:hover { background: #2563eb; }
              `}} />
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
                        <div 
                          className="text-sm leading-relaxed whitespace-pre-wrap break-words chat-html-content" 
                          dangerouslySetInnerHTML={{ __html: msg.text }} 
                        />
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
                    <p className="text-sm">{t('inbox', 'noMessages')}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input form - only show if status is not closed and assigned to current user */}
            {(() => {
              const chat = chats.find(c => c.id === selectedChat);
              if (!chat) return null;
              if (chat.status === 'closed') {
                return (
                  <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-slate-500 text-sm">
                    {t('inbox', 'conversationClosedInfo')}
                  </div>
                );
              }
              
              const currentUserId = (session?.user as any)?.id;
              if (chat.status === 'agent' && chat.assignedAgentId && chat.assignedAgentId !== currentUserId) {
                return (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-slate-500 text-sm">
                    {t('inbox', 'handledByAnother')} <span className="font-semibold text-slate-700">{chat.assignedAgentName || 'another agent'}</span>. {t('inbox', 'monitorOnly')}
                  </div>
                );
              }

              return (
                <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex items-center bg-slate-100 rounded-full pr-2 pl-4 py-1 mb-2">
                  <input 
                    type="text" 
                    placeholder={t('inbox', 'typeMessage')} 
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
            );
          })()}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>{t('inbox', 'selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
