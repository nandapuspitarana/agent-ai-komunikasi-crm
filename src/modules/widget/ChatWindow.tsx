'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, MoreVertical, UserCheck, Loader2, PhoneCall } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface ChatWindowProps {
  tenantId: string;
  primaryColor?: string;
  botName?: string;
  botLogo?: string | null;
}

type MessageSender = 'user' | 'bot' | 'agent' | 'system';

interface ChatMessage {
  id: number | string;
  text: string;
  sender: MessageSender;
  avatar?: string;
  options?: string[];
}

type SessionStatus = 'bot' | 'agent' | 'queue' | 'connecting';

export function ChatWindow({ 
  tenantId: propTenantId, 
  primaryColor = '#2563eb', 
  botName = 'Support Bot',
  botLogo = null,
}: ChatWindowProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('bot');
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const localSessionId = useRef<string>(`widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const getTenantId = () => {
    if (typeof window === 'undefined') return propTenantId;
    const params = new URLSearchParams(window.location.search);
    return params.get('tenantId') || propTenantId || 'demo-tenant-1234';
  };
  
  const tenantId = getTenantId();

  const addMessage = useCallback((text: string, sender: MessageSender, avatar?: string) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, sender, avatar }]);
  }, []);

  const [widgetConfig, setWidgetConfig] = useState({
    name: botName,
    tenantName: 'CRM Support',
    primaryColor: primaryColor,
    logo: botLogo,
    botAvatarUrl: null as string | null
  });

  // Initialize Socket.io connection and fetch config
  useEffect(() => {
    // Fetch widget config
    fetch(`/api/widget/config?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setWidgetConfig(prev => ({
            ...prev,
            name: data.botName || prev.name,
            tenantName: data.tenantName || prev.tenantName,
            primaryColor: data.primaryColor || prev.primaryColor,
            logo: data.logoUrl || prev.logo,
            botAvatarUrl: data.botAvatarUrl || null
          }));
          
          if (data.welcomeMessage) {
            setMessages([{ 
              id: 1, 
              text: data.welcomeMessage, 
              sender: 'bot',
              options: data.welcomeMessageOptions && data.welcomeMessageOptions.length > 0 ? data.welcomeMessageOptions : undefined
            }]);
          }
        }
      })
      .catch(err => console.error('Error fetching widget config:', err));

    const socket = io(window.location.origin, {
      path: '/api/socket',
      query: {
        sessionId: localSessionId.current,
        tenantId,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Menerima balasan bot dari server (realtime via Socket.io)
    socket.on('bot_reply', (data: { message: string; senderType: string }) => {
      addMessage(data.message, 'bot');
      setIsSending(false);
    });

    // Notifikasi ketika handoff ke agen berhasil diproses
    socket.on('agent_joined', (data: { agentName: string }) => {
      setSessionStatus('agent');
      addMessage(
        data.agentName ? `✅ Agent ${data.agentName} joined!` : t('chatWidget', 'agentJoined'),
        'system'
      );
    });

    // Balasan dari human agent
    socket.on('agent_message', (data: { message: string, avatar?: string }) => {
      addMessage(data.message, 'agent', data.avatar);
    });

    // Session closed
    socket.on('session_closed', () => {
      setSessionStatus('closed' as any);
      setShowReviewForm(true);
      addMessage(t('chatWidget', 'agentClosed'), 'system');
    });

    return () => {
      socket.disconnect();
    };
  }, [tenantId, addMessage]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Mengirim pesan ke API backend (bukan Socket.io langsung).
   * API akan menangani AI reply, handoff, dan Socket.io emit.
   */
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    addMessage(messageText, 'user');
    setInputValue('');

    try {
      const response = await fetch('/api/widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: serverSessionId,
          tenantId,
          message: messageText,
          contactId: localSessionId.current,
          channel: 'widget',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Simpan sessionId dari server untuk pesan berikutnya
        if (data.sessionId && !serverSessionId) {
          setServerSessionId(data.sessionId);
          // Join Socket.io room berdasarkan server session ID
          socketRef.current?.emit('join_session', { sessionId: data.sessionId });
        }

        // Jika AI tidak aktif atau API langsung mengembalikan reply (non-Socket.io mode)
        if (data.reply && sessionStatus === 'bot') {
          // Tambah balasan langsung jika Socket.io tidak mengirim
          // (Socket.io akan kirim event 'bot_reply' juga, tapi ini sebagai fallback)
          // Untuk menghindari duplikasi, kita cek apakah Socket.io sudah connected
          if (!isConnected) {
            addMessage(data.reply, 'bot');
            setIsSending(false);
          }
          // Jika Socket.io connected, biarkan event 'bot_reply' yang handle
        }

        // Handle handoff
        if (data.handoffOccurred) {
          setSessionStatus('queue');
          if (!isConnected && data.reply) {
            addMessage(data.reply, 'bot');
          }
          addMessage(
            t('chatWidget', 'queueMessage'),
            'system'
          );
          setIsSending(false);
        }

        // Jika sesi sudah mode agent
        if (data.status === 'agent') {
          setSessionStatus('agent');
          setIsSending(false);
        }

      } else {
        addMessage(t('chatWidget', 'errorOccurred'), 'system');
        setIsSending(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(t('chatWidget', 'noConnection'), 'system');
      setIsSending(false);
    }
  };

  /**
   * Handler untuk tombol "Bicara dengan Agen"
   */
  const handleRequestHumanAgent = () => {
    if (sessionStatus !== 'bot') return;
    sendMessage('Saya ingin bicara dengan agen manusia');
  };

  const submitReview = async () => {
    if (!serverSessionId || rating === 0) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/chat/sessions/${serverSessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review: reviewText }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error('Error submitting review', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Tentukan warna dan label status header
  const getStatusLabel = () => {
    switch (sessionStatus) {
      case 'bot': return isConnected ? t('chatWidget', 'botActive') : t('chatWidget', 'connecting');
      case 'queue': return t('chatWidget', 'waitingAgent');
      case 'agent': return t('chatWidget', 'connectedAgent');
      case 'closed' as any: return t('chatWidget', 'conversationClosed');
      case 'connecting': return t('chatWidget', 'connecting');
    }
  };

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'bot': return isConnected ? 'bg-green-400' : 'bg-red-400';
      case 'queue': return 'bg-yellow-400';
      case 'agent': return 'bg-emerald-400';
      case 'closed' as any: return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 font-sans text-slate-800">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between p-4 shadow-sm z-10"
        style={{ backgroundColor: widgetConfig.primaryColor, color: 'white' }}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shadow-inner overflow-hidden">
            {widgetConfig.logo ? (
              <img src={widgetConfig.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              sessionStatus === 'agent' ? <UserCheck size={22} /> : <Bot size={22} />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-base leading-tight">
              {sessionStatus === 'agent' ? 'Human Agent' : widgetConfig.tenantName}
            </h2>
            <p className="text-xs opacity-90 flex items-center mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor()}`}></span>
              {getStatusLabel()}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-center text-xs text-slate-400 mb-6">{t('chatWidget', 'conversationStarted')}</p>
        
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-3 py-1">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col mb-4">
              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 mt-1 flex-shrink-0 overflow-hidden">
                    {widgetConfig.botAvatarUrl && msg.sender === 'bot' ? (
                      <img src={widgetConfig.botAvatarUrl} alt="Bot" className="w-full h-full object-cover" />
                    ) : widgetConfig.logo && msg.sender === 'bot' ? (
                      <img src={widgetConfig.logo} alt="Bot" className="w-full h-full object-cover" />
                    ) : msg.avatar && msg.sender === 'agent' ? (
                      <img src={msg.avatar} alt="Agent" className="w-full h-full object-cover" />
                    ) : msg.sender === 'agent' ? (
                      <User size={14} className="text-emerald-600" />
                    ) : (
                      <Bot size={14} className="text-slate-500" />
                    )}
                  </div>
                )}
                
                <div className="flex flex-col max-w-[85%]">
                  {!isUser && (
                    <span className="text-[10px] text-slate-500 font-medium ml-1 mb-1">
                      {msg.sender === 'agent' ? 'Human Agent' : widgetConfig.name}
                    </span>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isUser 
                        ? 'text-white rounded-br-sm' 
                        : 'bg-white border border-slate-100 rounded-bl-sm'
                    }`}
                    style={isUser ? { backgroundColor: widgetConfig.primaryColor, marginLeft: 'auto' } : {}}
                  >
                    {isUser ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div 
                        className="leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-a:text-blue-600 widget-html-content"
                        dangerouslySetInnerHTML={{ __html: msg.text }} 
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Render options if available */}
              {!isUser && msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-8 pl-1">
                  {msg.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(option)}
                      disabled={isSending}
                      className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-colors shadow-sm disabled:opacity-50"
                      style={{ borderColor: widgetConfig.primaryColor + '40', color: widgetConfig.primaryColor }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator saat AI sedang memproses */}
        {isSending && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-2 mt-1">
              <Bot size={14} className="text-slate-500" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Talk to Human Button — hanya tampil jika masih mode bot */}
      {sessionStatus === 'bot' && (
        <div className="px-3 pt-2">
          <button
            onClick={handleRequestHumanAgent}
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <PhoneCall size={13} />
            {t('chatWidget', 'talkToAgentBtn')}
          </button>
        </div>
      )}

      {/* Input Form Area or Review Form */}
      <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
        {showReviewForm && !reviewSubmitted ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 p-2">
            <p className="text-center text-sm font-semibold text-slate-700">{t('chatWidget', 'reviewPrompt')}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill={rating >= star ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t('chatWidget', 'reviewPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-300 resize-none h-16"
            />
            <button
              onClick={submitReview}
              disabled={rating === 0 || isSending}
              className="w-full py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: widgetConfig.primaryColor }}
            >
              {t('chatWidget', 'submitReview')}
            </button>
          </div>
        ) : reviewSubmitted ? (
          <div className="py-4 text-center">
            <div className="w-10 h-10 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm font-medium text-slate-700">{t('chatWidget', 'reviewThanks')}</p>
          </div>
        ) : (sessionStatus as any) === 'closed' ? (
          <div className="py-3 text-center">
            <p className="text-sm text-slate-500">{t('chatWidget', 'conversationClosed')}</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                sessionStatus === 'queue' 
                  ? t('chatWidget', 'queueMessage')
                  : sessionStatus === 'agent'
                  ? t('chatWidget', 'writeMessageAgent')
                  : t('chatWidget', 'writeMessage')
              }
              className="flex-1 bg-slate-100 border-none focus:ring-2 rounded-full px-5 py-3 text-sm outline-none transition-all placeholder-slate-400"
              style={{ '--tw-ring-color': widgetConfig.primaryColor } as React.CSSProperties}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="absolute right-1.5 p-2 rounded-full text-white flex-shrink-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
              style={{ backgroundColor: widgetConfig.primaryColor }}
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
        )}
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            {sessionStatus === 'bot' ? t('chatWidget', 'botReplied') : sessionStatus === 'agent' ? t('chatWidget', 'agentActiveLabel') : sessionStatus === 'queue' ? t('chatWidget', 'waitingAgent') : t('chatWidget', 'doneLabel')}
          </p>
        </div>
      </div>
    </div>
  );
}
