'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { ChatUI, ChatMessageData, SessionStatus } from '@/components/chat/ChatUI';

interface ChatWindowProps {
  tenantId: string;
  primaryColor?: string;
  botName?: string;
  botLogo?: string | null;
}

export function ChatWindow({ 
  tenantId: propTenantId, 
  primaryColor = '#2563eb', 
  botName = 'Support Bot',
  botLogo = null,
}: ChatWindowProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('bot');
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const localSessionId = useRef<string>(`widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const getTenantId = () => {
    if (typeof window === 'undefined') return propTenantId;
    const params = new URLSearchParams(window.location.search);
    return params.get('tenantId') || propTenantId || 'demo-tenant-1234';
  };
  
  const tenantId = getTenantId();

  // When embedded externally (e.g. WordPress), API calls must use absolute URL
  const getApiBase = () => {
    if (typeof window !== 'undefined' && (window as any).CRM_AGENT_CONFIG?.apiUrl) {
      return (window as any).CRM_AGENT_CONFIG.apiUrl.replace(/\/$/, '');
    }
    return ''; // same-origin (when loaded from CRM itself)
  };
  const apiBase = getApiBase();

  const addMessage = useCallback((text: string, sender: ChatMessageData['sender'], avatar?: string, options?: string[]) => {
    setMessages(prev => {
      const isDuplicate = prev.slice(-3).some(m => 
        m.sender === sender && m.text.trim() === text.trim()
      );
      if (isDuplicate) return prev;
      return [...prev, { id: Date.now() + Math.random(), text, sender, avatar, options }];
    });
  }, []);

  const [widgetConfig, setWidgetConfig] = useState({
    name: botName,
    tenantName: 'CRM Support',
    primaryColor: primaryColor,
    logo: botLogo,
    botAvatarUrl: null as string | null
  });

  useEffect(() => {
    fetch(`${apiBase}/api/widget/config?tenantId=${tenantId}`)
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

          // Request Geolocation if enabled
          if (data.layer1_geolocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                // Send to backend silently
                fetch(`${apiBase}/api/widget/visitor/geo`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tenantId,
                    contactId: localSessionId.current,
                    latitude,
                    longitude
                  })
                }).catch(err => console.error('Geo API error:', err));
              },
              (error) => {
                console.warn('Geolocation permission denied or failed:', error.message);
              },
              { timeout: 10000, maximumAge: 60000 }
            );
          }
        }
      })
      .catch(err => console.error('Error fetching widget config:', err));

    setIsConnected(true);
  }, [tenantId, addMessage, t]);

  useEffect(() => {
    if (!serverSessionId) return;

    console.log('[Widget] Subscribing to channel:', `session_${serverSessionId}`);
    const channel = supabase.channel(`session_${serverSessionId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'crm',
          table: 'crm_agent_Message',
        },
        (payload) => {
          console.log('[Widget] RECEIVED postgres_changes EVENT!', payload);
          const newMsg = payload.new as any;
          if (newMsg.sessionId !== serverSessionId) return;
          if (newMsg.senderType === 'user') return;
          
          if (newMsg.senderType === 'bot') {
            addMessage(newMsg.content, 'bot');
            setIsSending(false);
          } else if (newMsg.senderType === 'agent') {
            addMessage(newMsg.content, 'agent');
          } else if (newMsg.senderType === 'system') {
            addMessage(newMsg.content, 'system');
          }
        }
      )
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          console.log('[Widget] RECEIVED broadcast EVENT!', payload);
          const newMsg = payload.payload as any;
          if (newMsg.senderType === 'user') return;
          
          if (newMsg.senderType === 'bot') {
            addMessage(newMsg.content, 'bot');
            setIsSending(false);
          } else if (newMsg.senderType === 'agent') {
            addMessage(newMsg.content, 'agent');
          } else if (newMsg.senderType === 'system') {
            addMessage(newMsg.content, 'system');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'crm',
          table: 'crm_agent_ChatSession',
        },
        (payload) => {
          const updatedSession = payload.new as any;
          if (updatedSession.id !== serverSessionId) return;
          
          if (updatedSession.status === 'agent') {
            setSessionStatus('agent');
          } else if (updatedSession.status === 'closed') {
            setSessionStatus('closed');
            setShowReviewForm(true);
          } else if (updatedSession.status === 'queue') {
            setSessionStatus('queue');
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Widget] Channel status changed:', status, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverSessionId, addMessage, t]);

  const isSendingRef = useRef(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isSendingRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);
    addMessage(messageText, 'user');
    setInputValue('');

    try {
      const response = await fetch(`${apiBase}/api/widget/message`, {
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
        if (data.sessionId && !serverSessionId) {
          setServerSessionId(data.sessionId);
        }
        if (data.reply && sessionStatus === 'bot') {
          addMessage(data.reply, 'bot', undefined, data.options);
          setIsSending(false);
        }
        if (data.handoffOccurred) {
          setSessionStatus('queue');
          if (data.reply && sessionStatus !== 'bot') {
             addMessage(data.reply, 'bot', undefined, data.options);
          }
          addMessage(t('chatWidget', 'queueMessage'), 'system');
          setIsSending(false);
        }
        if (data.status === 'agent') {
          setSessionStatus('agent');
          setIsSending(false);
        }
      } else {
        addMessage(t('chatWidget', 'errorOccurred'), 'system');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(t('chatWidget', 'noConnection'), 'system');
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleRequestHumanAgent = () => {
    if (sessionStatus !== 'bot') return;
    sendMessage('Saya ingin bicara dengan agen manusia');
  };

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    const handleWindowMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'widget_quick_reply' && event.data?.text) {
        sendMessageRef.current(event.data.text);
      } else if (event.data?.type === 'widget_form_submit' && event.data?.url && event.data?.payload) {
        try {
          const loadingMsg = event.data.loadingMessage || t('chatWidget', 'submittingForm', 'Submitting your details...');
          addMessage(loadingMsg, 'system');
          const res = await fetch(`${apiBase}/api/widget/form-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: event.data.url,
              payload: event.data.payload,
              sessionId: serverSessionId,
              tenantId: tenantId
            })
          });
          if (res.ok) {
            const formSummary = Object.entries(event.data.payload)
              .map(([key, value]) => `- ${key}: ${value}`)
              .join('\n');
            addMessage(`📝 [Form Submitted]\n${formSummary}`, 'user');

            const successMsg = event.data.successMessage || t('chatWidget', 'formSuccess', 'Thank you! Your request has been submitted successfully. Our team will contact you soon.');
            addMessage(successMsg, 'bot');
          } else {
            const errorMsg = event.data.errorMessage || t('chatWidget', 'formError', 'Failed to submit form. Please try again later.');
            addMessage(errorMsg, 'system');
          }
        } catch (err) {
          const connectErrorMsg = event.data.connectionErrorMessage || t('chatWidget', 'formConnectionError', 'Error submitting form. Please check your connection.');
          addMessage(connectErrorMsg, 'system');
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [addMessage, serverSessionId, tenantId, t]);

  const submitReview = async () => {
    if (!serverSessionId || rating === 0) return;
    setIsSending(true);
    try {
      const res = await fetch(`${apiBase}/api/chat/sessions/${serverSessionId}/review`, {
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

  return (
    <ChatUI
      messages={messages}
      isTyping={isSending}
      status={sessionStatus}
      isConnected={isConnected}
      config={widgetConfig}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSendMessage={sendMessage}
      onTalkToAgent={handleRequestHumanAgent}
      showReviewForm={showReviewForm}
      reviewSubmitted={reviewSubmitted}
      rating={rating}
      onRatingChange={setRating}
      reviewText={reviewText}
      onReviewTextChange={setReviewText}
      onSubmitReview={submitReview}
    />
  );
}
