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

    setIsConnected(true);
  }, [tenantId, addMessage, t]);

  useEffect(() => {
    if (!serverSessionId) return;

    const channel = supabase.channel(`session_${serverSessionId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'crm',
          table: 'crm_agent_Message',
          filter: `sessionId=eq.${serverSessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.senderType === 'user') return;
          
          if (newMsg.senderType === 'bot') {
            // Options are usually sent in the API response, but for DB inserts we just show the message
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
          filter: `id=eq.${serverSessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new as any;
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
      .subscribe();

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
          const res = await fetch('/api/widget/form-proxy', {
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
