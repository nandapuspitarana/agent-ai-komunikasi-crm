'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, MoreVertical, UserCheck, Loader2, PhoneCall, RotateCcw, Mail, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

export type MessageSender = 'user' | 'bot' | 'agent' | 'system';
export type SessionStatus = 'bot' | 'agent' | 'queue' | 'connecting' | 'closed';

export interface UserProfileState {
  email?: string;
  name?: string;
  company?: string;
}

export interface ContactFormData {
  category: string;
  description: string;
}

export interface ChatMessageData {
  id: number | string;
  text: string;
  sender: MessageSender;
  avatar?: string;
  options?: string[];
  createdAt?: string | Date;
}

export interface ChatUIConfig {
  name: string;
  tenantName: string;
  primaryColor: string;
  logo?: string | null;
  botAvatarUrl?: string | null;
  humanHandoffEnabled?: boolean;
  fallbackEmail?: string | null;
  contactForm?: {
    enabled?: boolean;
    buttonLabel?: string;
    formTitle?: string;
    categories?: string[];
    autoReplyTemplate?: string;
  } | null;
}

export interface ChatUIProps {
  messages: ChatMessageData[];
  isTyping: boolean;
  status: SessionStatus;
  isConnected: boolean;
  config: ChatUIConfig;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  
  // Header Actions
  onRestartChat?: () => void;
  
  // Footer / Status actions
  onTalkToAgent?: () => void;
  
  // Review Form
  showReviewForm?: boolean;
  reviewSubmitted?: boolean;
  rating?: number;
  onRatingChange?: (rating: number) => void;
  reviewText?: string;
  onReviewTextChange?: (text: string) => void;
  onSubmitReview?: () => void;

  // Minimal Contact / Funnel Form
  showContactForm?: boolean;
  onOpenContactForm?: () => void;
  onCloseContactForm?: () => void;
  onSubmitContactForm?: (data: ContactFormData) => Promise<void> | void;
  userProfile?: UserProfileState;
  isSubmittingContactForm?: boolean;
  
  // Layout Options
  height?: string; // e.g., '100%', '400px'
  hideHeaderMoreOptions?: boolean;
}

export function ChatUI({
  messages,
  isTyping,
  status,
  isConnected,
  config,
  inputValue,
  onInputChange,
  onSendMessage,
  onRestartChat,
  onTalkToAgent,
  showReviewForm,
  reviewSubmitted,
  rating,
  onRatingChange,
  reviewText,
  onReviewTextChange,
  onSubmitReview,
  showContactForm = false,
  onCloseContactForm,
  onSubmitContactForm,
  userProfile,
  isSubmittingContactForm = false,
  height = '100%',
  hideHeaderMoreOptions = false,
}: ChatUIProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultCategories = [
    'Pertanyaan Umum',
    'Layanan & Fasilitas',
    'Kendala Teknis',
    'Billing & Pembayaran',
    'Kemitraan',
    'Lainnya',
  ];
  const categoriesList =
    config.contactForm?.categories && config.contactForm.categories.length > 0
      ? config.contactForm.categories
      : defaultCategories;

  const [formCategory, setFormCategory] = useState(categoriesList[0] || 'Pertanyaan Umum');
  const [formDescription, setFormDescription] = useState('');

  // Sync category if categoriesList updates
  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.includes(formCategory)) {
      setFormCategory(categoriesList[0]);
    }
  }, [categoriesList, formCategory]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isTyping) {
      onSendMessage(inputValue);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim() || isSubmittingContactForm) return;
    if (onSubmitContactForm) {
      await onSubmitContactForm({
        category: formCategory,
        description: formDescription.trim(),
      });
      setFormDescription('');
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'bot': return isConnected ? t('chatWidget', 'botActive') : t('chatWidget', 'connecting');
      case 'queue': return t('chatWidget', 'waitingAgent');
      case 'agent': return t('chatWidget', 'connectedAgent');
      case 'closed': return t('chatWidget', 'conversationClosed');
      case 'connecting': return t('chatWidget', 'connecting');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'bot': return isConnected ? 'bg-green-400' : 'bg-red-400';
      case 'queue': return 'bg-yellow-400';
      case 'agent': return 'bg-emerald-400';
      case 'closed': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex flex-col w-full bg-slate-50 font-sans text-slate-800" style={{ height }}>
      <style>{`
        .widget-html-content {
          --brand: ${config.primaryColor};
          --line: #e5e7eb;
          --muted: #6b7280;
          --soft: #faf7f7;
        }
        .widget-html-content .options { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 16px; }
        .widget-html-content button.option { border:1px solid rgba(128,21,23,.2); background:#fff; color:var(--brand); padding:9px 11px; border-radius:14px; font-size:13px; cursor:pointer; transition:.15s ease; min-height:38px; }
        .widget-html-content button.option:hover { background:var(--brand); color:#fff; }
        .widget-html-content button.option.primary-choice { width:100%; text-align:left; border-color:rgba(128,21,23,.35); background:var(--soft); font-weight:700; }
        .widget-html-content button.option.secondary-choice { background:#f9fafb; color:#374151; border-color:var(--line); }
        .widget-html-content .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px; margin:10px 0; }
        .widget-html-content .card-title { color:var(--brand); font-weight:700; margin-bottom:6px; }
        .widget-html-content .centre-list, .widget-html-content .package-list { display:grid; gap:10px; margin:10px 0 16px; }
        .widget-html-content .centre-card { background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; }
        .widget-html-content .package-card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px; }
        .widget-html-content .centre-photo { width:100%; height:118px; background:#efe7e7; background-size:cover; background-position:center; }
        .widget-html-content .centre-content { padding:12px; }
        .widget-html-content .centre-select, .widget-html-content .package-select { margin-top:10px; }
        .widget-html-content .feature-list { margin:10px 0 0; padding-left:18px; color:#374151; font-size:12px; line-height:1.45; }
        .widget-html-content .price { font-size:20px; font-weight:700; margin:8px 0 2px; }
        .widget-html-content .price-option { border-top:1px solid var(--line); padding-top:10px; margin-top:10px; }
        .widget-html-content .price-option:first-child { border-top:0; padding-top:0; margin-top:0; }
        .widget-html-content .small { font-size:12px; color:var(--muted); }
        .widget-html-content .cta-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
        .widget-html-content .cta { border:0; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700; font-size:13px; }
        .widget-html-content .cta-note { margin-top:10px; padding-top:10px; border-top:1px solid var(--line); font-size:12px; color:var(--muted); }
        .widget-html-content .primary { background:var(--brand); color:#fff; }
        .widget-html-content .secondary { background:#f3f4f6; color:#374151; }
        .widget-html-content .notice { background:#fff8e6; border:1px solid #f3d27b; color:#654a00; padding:10px 12px; border-radius:12px; font-size:12px; margin:8px 0; }
        .widget-html-content .form-card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px; margin:10px 0; }
        .widget-html-content .form-card label { display:block; font-size:12px; color:#374151; font-weight:700; margin:10px 0 5px; }
        .widget-html-content .form-card input, .widget-html-content .form-card select, .widget-html-content .form-card textarea { width:100%; border:1px solid var(--line); border-radius:10px; padding:10px; font-size:13px; font-family:Arial, Helvetica, sans-serif; color:#374151; outline:none; background-color: #fff; box-sizing: border-box; }
        .widget-html-content .form-card input:focus, .widget-html-content .form-card select:focus, .widget-html-content .form-card textarea:focus { border-color:var(--brand); }
        .widget-html-content .form-card textarea { min-height:70px; resize:vertical; }
        .widget-html-content .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .widget-html-content .submit-btn { width:100%; border:0; background:var(--brand); color:#fff; border-radius:12px; padding:11px; font-weight:700; margin-top:12px; cursor:pointer; transition: opacity 0.2s; box-sizing: border-box; }
        .widget-html-content .submit-btn:disabled { opacity:.72; cursor:default; }
        .widget-html-content .submit-btn:hover:not(:disabled) { opacity:.9; }
      `}</style>
      
      {/* Top Header */}
      <div 
        className="flex items-center justify-between p-4 shadow-sm z-10 flex-shrink-0"
        style={{ backgroundColor: config.primaryColor, color: 'white' }}
      >
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shadow-inner overflow-hidden">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              status === 'agent' ? <UserCheck size={22} /> : <Bot size={22} />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-base leading-tight">
              {status === 'agent' ? 'Human Agent' : config.tenantName}
            </h2>
            <p className="text-xs opacity-90 flex items-center mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor()}`}></span>
              {getStatusLabel()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRestartChat && (
            <button onClick={onRestartChat} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Restart Chat">
              <RotateCcw size={18} />
            </button>
          )}
          {!hideHeaderMoreOptions && (
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <MoreVertical size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Inquiry / Contact Form Overlay (Minimalist: Category & Description, auto-profile state) */}
      {showContactForm && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div 
            className="p-3.5 text-white flex items-center justify-between shadow-sm relative flex-shrink-0"
            style={{ backgroundColor: config.primaryColor }}
          >
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Mail size={16} />
                {config.contactForm?.formTitle || t('chatWidget', 'inquiryFormTitle', 'Kirim Pesan ke Perusahaan')}
              </h3>
              <p className="text-[11px] text-white/80">
                {t('chatWidget', 'inquiryFormDesc', 'Tim kami akan segera menindaklanjuti kendala atau pertanyaan Anda.')}
              </p>
            </div>
            {onCloseContactForm && (
              <button
                type="button"
                onClick={onCloseContactForm}
                disabled={isSubmittingContactForm}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-black/10 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <form onSubmit={handleContactSubmit} className="flex-1 flex flex-col p-4 overflow-y-auto">
            {/* Minimalist Profile info indicator (parsed from parameters) */}
            {(userProfile?.email || userProfile?.name || userProfile?.company) && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">
                  {t('chatWidget', 'sendingAs', 'Mengirim sebagai')}
                </span>
                <span className="font-semibold text-slate-800">
                  {userProfile.name || userProfile.email}
                  {userProfile.company ? ` (${userProfile.company})` : ''}
                </span>
                {userProfile.name && userProfile.email && (
                  <span className="text-slate-400 block text-[11px]">{userProfile.email}</span>
                )}
              </div>
            )}

            {/* Field 1: Category */}
            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('chatWidget', 'categoryLabel', 'Kategori Masalah')}
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                disabled={isSubmittingContactForm}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 2: Description */}
            <div className="flex-1 flex flex-col mb-4 min-h-[110px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('chatWidget', 'descriptionLabel', 'Deskripsi Masalah')}
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={isSubmittingContactForm}
                placeholder={t('chatWidget', 'descriptionPlaceholder', 'Jelaskan kendala atau kebutuhan Anda secara singkat...')}
                className="w-full flex-1 min-h-[110px] text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Actions */}
            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
              {onCloseContactForm && (
                <button
                  type="button"
                  onClick={onCloseContactForm}
                  disabled={isSubmittingContactForm}
                  className="flex-1 py-2.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {t('chatWidget', 'cancelBtn', 'Batal')}
                </button>
              )}
              <button
                type="submit"
                disabled={!formDescription.trim() || isSubmittingContactForm}
                className="flex-1 py-2.5 text-xs font-semibold text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                style={{ backgroundColor: config.primaryColor }}
              >
                {isSubmittingContactForm ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{t('chatWidget', 'submitting', 'Mengirim...')}</span>
                  </>
                ) : (
                  <span>{t('chatWidget', 'submitBtn', 'Kirim Laporan')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

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
                    {config.botAvatarUrl && msg.sender === 'bot' ? (
                      <img src={config.botAvatarUrl} alt="Bot" className="w-full h-full object-cover" />
                    ) : config.logo && msg.sender === 'bot' ? (
                      <img src={config.logo} alt="Bot" className="w-full h-full object-cover" />
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
                      {msg.sender === 'agent' ? 'Human Agent' : config.name}
                    </span>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isUser 
                        ? 'text-white rounded-br-sm' 
                        : 'bg-white border border-slate-100 rounded-bl-sm'
                    }`}
                    style={isUser ? { backgroundColor: config.primaryColor, marginLeft: 'auto' } : {}}
                  >
                    {isUser ? (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div 
                        className="leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-a:text-brand widget-html-content"
                        dangerouslySetInnerHTML={{ __html: msg.text }} 
                      />
                    )}
                  </div>
                  {msg.createdAt && (
                    <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-white/80' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Render options if available */}
              {!isUser && msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-8 pl-1">
                  {msg.options.map((optionRaw, idx) => {
                    const pipeIdx = optionRaw.indexOf('|');
                    const label = pipeIdx !== -1 ? optionRaw.substring(0, pipeIdx).trim() : optionRaw.trim();
                    const value = pipeIdx !== -1 ? optionRaw.substring(pipeIdx + 1).trim() : optionRaw.trim();
                    return (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(value)}
                      disabled={isTyping || status === 'closed'}
                      className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-brand/30 transition-colors shadow-sm disabled:opacity-50"
                      style={{ borderColor: config.primaryColor + '40', color: config.primaryColor }}
                    >
                      {label}
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator saat AI sedang memproses */}
        {isTyping && (
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

      {/* Talk to Human / Contact via Email Button — hanya tampil jika masih mode bot */}
      {status === 'bot' && onTalkToAgent && (
        <div className="px-3 pt-2">
          <button
            onClick={onTalkToAgent}
            disabled={isTyping}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {config.humanHandoffEnabled === false ? (
              <>
                <Mail size={13} className="text-brand" />
                <span>
                  {config.contactForm?.buttonLabel ||
                    (config.fallbackEmail
                      ? `${t('chatWidget', 'contactViaEmailBtn', 'Hubungi via Email')} (${config.fallbackEmail})`
                      : t('chatWidget', 'contactViaEmailBtn', 'Hubungi via Email'))}
                </span>
              </>
            ) : (
              <>
                <PhoneCall size={13} />
                <span>{t('chatWidget', 'talkToAgentBtn')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Input Form Area or Review Form */}
      <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_15px_rgba(0,0,0,0.02)] flex-shrink-0">
        {showReviewForm && !reviewSubmitted && onSubmitReview && onRatingChange && onReviewTextChange ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 p-2">
            <p className="text-center text-sm font-semibold text-slate-700">{t('chatWidget', 'reviewPrompt')}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRatingChange(star)}
                  className={`p-1 transition-transform hover:scale-110 ${rating && rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill={rating && rating >= star ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              ))}
            </div>
            <textarea
              value={reviewText || ''}
              onChange={(e) => onReviewTextChange(e.target.value)}
              placeholder={t('chatWidget', 'reviewPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand/30 resize-none h-16"
            />
            <button
              onClick={onSubmitReview}
              disabled={!rating || rating === 0 || isTyping}
              className="w-full py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ backgroundColor: config.primaryColor }}
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
        ) : status === 'closed' ? (
          <div className="py-3 text-center">
            <p className="text-sm text-slate-500">{t('chatWidget', 'conversationClosed')}</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                status === 'queue' 
                  ? t('chatWidget', 'queueMessage')
                  : status === 'agent'
                  ? t('chatWidget', 'writeMessageAgent')
                  : t('chatWidget', 'writeMessage')
              }
              className="flex-1 bg-slate-100 border-none focus:ring-2 rounded-full pl-5 pr-12 py-3 text-sm outline-none transition-all placeholder-slate-400"
              style={{ '--tw-ring-color': config.primaryColor } as React.CSSProperties}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-1.5 p-2 rounded-full text-white flex-shrink-0 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
              style={{ backgroundColor: config.primaryColor }}
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
        )}
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            {status === 'bot' ? t('chatWidget', 'botReplied') : status === 'agent' ? t('chatWidget', 'agentActiveLabel') : status === 'queue' ? t('chatWidget', 'waitingAgent') : t('chatWidget', 'doneLabel')}
          </p>
        </div>
      </div>
    </div>
  );
}
