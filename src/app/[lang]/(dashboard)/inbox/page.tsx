'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, PanelRight, MapPin, Monitor, Smartphone, Globe, Star, ChevronRight, X, Phone, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase-client';
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
  const [visitorInfo, setVisitorInfo] = useState<any | null>(null);
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [showVisitorPanel, setShowVisitorPanel] = useState(true);
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

  // Initialize Supabase Realtime connection
  useEffect(() => {
    if (!session?.user) return;
    const tenantId = (session.user as any).tenantId;

    const channel = supabase.channel(`inbox_${tenantId}`);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'crm', table: 'crm_agent_Message' },
        (payload) => {
          const data = payload.new as any;
          setChats(prev => {
            const existingChat = prev.find(chat => chat.id === data.sessionId);
            if (!existingChat) return prev; // If we don't have the chat loaded, ignore it (ChatSession listener handles new sessions)
            
            return prev.map(chat => {
              if (chat.id === data.sessionId) {
                const messages = chat.messages || [];
                // Prevent duplicates
                if (messages.some(m => m.text === data.content && m.sender === data.senderType)) {
                  return chat;
                }
                
                return {
                  ...chat,
                  messages: [...messages, {
                    id: data.id || (Date.now().toString() + Math.random()),
                    text: data.content,
                    sender: data.senderType,
                    timestamp: new Date(data.createdAt || Date.now()).toISOString()
                  }],
                  preview: data.content,
                  time: new Date(data.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
              }
              return chat;
            });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'crm', table: 'crm_agent_ChatSession', filter: `tenantId=eq.${tenantId}` },
        (payload) => {
          const updatedSession = payload.new as any;
          setChats(prev => prev.map(chat => {
            if (chat.id === updatedSession.id) {
              return {
                ...chat,
                status: updatedSession.status,
                assignedAgentId: updatedSession.assignedAgentId || chat.assignedAgentId
              };
            }
            return chat;
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'crm', table: 'crm_agent_ChatSession', filter: `tenantId=eq.${tenantId}` },
        (payload) => {
          const newSession = payload.new as any;
          setChats(prev => {
            if (prev.some(c => c.id === newSession.id)) return prev;
            const newChat: Chat = {
              id: newSession.id,
              contactId: newSession.contactName || newSession.contactPhone || 'New Visitor',
              channel: newSession.channel || 'widget',
              status: newSession.status || 'bot',
              createdAt: new Date(newSession.createdAt || Date.now()).toISOString(),
              time: new Date(newSession.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              preview: 'New session started...',
              messages: []
            };
            return [newChat, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Agent connected to Inbox via Supabase Realtime');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChat, chats]);

  // Fetch visitor info when chat is selected
  useEffect(() => {
    if (!selectedChat) { setVisitorInfo(null); return; }
    const chat = chats.find(c => c.id === selectedChat);
    if (!chat?.contactId) { setVisitorInfo(null); return; }
    setVisitorLoading(true);
    fetch(`/api/visitors/by-contact/${encodeURIComponent(chat.contactId)}`)
      .then(r => r.json())
      .then(data => setVisitorInfo(data.visitor || null))
      .catch(() => setVisitorInfo(null))
      .finally(() => setVisitorLoading(false));
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
        // Supabase Realtime handles this UI update automatically
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

  const getLeadBadge = (classification: string) => {
    const map: Record<string, { color: string; label: string }> = {
      cold: { color: 'bg-slate-100 text-slate-600', label: '🧊 Cold' },
      warm: { color: 'bg-yellow-100 text-yellow-700', label: '🌤️ Warm' },
      hot_lead: { color: 'bg-orange-100 text-orange-700', label: '🔥 Hot Lead' },
      booking: { color: 'bg-green-100 text-green-700', label: '💰 Booking' },
      support: { color: 'bg-blue-100 text-blue-700', label: '🛠️ Support' },
    };
    return map[classification] || { color: 'bg-slate-100 text-slate-600', label: classification };
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
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedChat === chat.id ? 'bg-brand-bg/50 border-l-4 border-l-brand' : ''}`}
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-bg text-brand font-semibold">
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
                <div className="w-10 h-10 bg-brand-bg text-brand-hover rounded-full flex items-center justify-center mr-3 shadow-inner">
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
                    className="px-3.5 py-1.5 bg-brand-light hover:bg-brand text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center"
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
                          ? 'bg-brand text-white rounded-br-sm shadow-sm' 
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
                        <p className={`text-xs mt-1 ${isAgent ? 'text-brand-bg' : 'text-slate-400'}`}>
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
                    className="p-2 text-slate-500 hover:text-brand transition-colors mr-1"
                    title="Canned Responses"
                  >
                    <PanelRight size={18} />
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    className="p-2 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors"
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

      {/* Right Panel: Visitor Info */}
      {showVisitorPanel && selectedChat && (
        <div className="w-72 border-l border-slate-200 flex flex-col overflow-y-auto bg-slate-50">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Info Prospek</h3>
            <button onClick={() => setShowVisitorPanel(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <X size={14} />
            </button>
          </div>

          {visitorLoading ? (
            <div className="p-6 text-center text-xs text-slate-400">Memuat data...</div>
          ) : !visitorInfo ? (
            <div className="p-6 text-center">
              <User size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Data prospek belum tersedia.<br />Akan muncul setelah ada percakapan.</p>
            </div>
          ) : (
            <div className="flex-1 p-4 space-y-4">
              {/* Avatar + Identity */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
                <div className="w-14 h-14 bg-brand-bg text-brand-hover rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  {visitorInfo.name ? visitorInfo.name.charAt(0).toUpperCase() : '?'}
                </div>
                <p className="font-bold text-slate-800 text-sm">{visitorInfo.name || 'Prospek Anonim'}</p>
                {visitorInfo.email && <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1"><Mail size={10} /> {visitorInfo.email}</p>}
                {visitorInfo.phone && <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5"><Phone size={10} /> {visitorInfo.phone}</p>}
              </div>

              {/* Lead Score */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Status Prospek</p>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getLeadBadge(visitorInfo.leadClassification || 'cold').color}`}>
                    {getLeadBadge(visitorInfo.leadClassification || 'cold').label}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{visitorInfo.leadScore || 0} pts</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-brand to-orange-400 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, visitorInfo.leadScore || 0)}%` }}
                  />
                </div>
                {visitorInfo.topicsDiscussed?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {visitorInfo.topicsDiscussed.map((topic: string) => (
                      <span key={topic} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{topic}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Location + Device */}
              {(visitorInfo.city || visitorInfo.country || visitorInfo.deviceType || visitorInfo.browserName) && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Perangkat & Lokasi</p>
                  <div className="space-y-2">
                    {(visitorInfo.city || visitorInfo.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600">{[visitorInfo.city, visitorInfo.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {visitorInfo.latitude && visitorInfo.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${visitorInfo.latitude},${visitorInfo.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-brand hover:underline flex items-center gap-1"
                      >
                        <Globe size={10} /> Lihat di Maps
                      </a>
                    )}
                    {visitorInfo.deviceType && (
                      <div className="flex items-center gap-2">
                        {visitorInfo.deviceType === 'mobile' ? <Smartphone size={12} className="text-slate-400" /> : <Monitor size={12} className="text-slate-400" />}
                        <span className="text-xs text-slate-600 capitalize">{visitorInfo.deviceType} · {visitorInfo.browserName || ''} {visitorInfo.os ? `· ${visitorInfo.os}` : ''}</span>
                      </div>
                    )}
                    {visitorInfo.referrerUrl && (
                      <div className="flex items-start gap-2">
                        <ChevronRight size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-slate-500 break-all">{visitorInfo.referrerUrl}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Metadata from Extractors */}
              {visitorInfo.metadata && typeof visitorInfo.metadata === 'object' && !Array.isArray(visitorInfo.metadata) && Object.keys(visitorInfo.metadata).length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Data Tambahan (Kustom)</p>
                  <div className="space-y-2">
                    {Object.entries(visitorInfo.metadata as Record<string, string>).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start gap-2">
                        <span className="text-xs text-slate-500 font-medium capitalize shrink-0">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-xs text-slate-800 font-semibold text-right">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions Summary */}
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Riwayat Interaksi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand">{visitorInfo.sessions || 0}</p>
                    <p className="text-[10px] text-slate-500">Sesi</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-700">{visitorInfo.messageCount || 0}</p>
                    <p className="text-[10px] text-slate-500">Pesan</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  Terakhir aktif: {visitorInfo.lastSeenAt ? new Date(visitorInfo.lastSeenAt).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle button when panel is hidden */}
      {!showVisitorPanel && selectedChat && (
        <button
          onClick={() => setShowVisitorPanel(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 shadow-md rounded-l-lg p-2 text-slate-500 hover:text-brand hover:border-brand transition-colors"
          title="Tampilkan Info Prospek"
        >
          <User size={16} />
        </button>
      )}
    </div>
  );
}
