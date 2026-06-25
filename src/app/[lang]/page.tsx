'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChatWindow } from '@/modules/widget/ChatWindow';
import { MessageCircle, X, CheckCircle2, Code, LayoutTemplate } from 'lucide-react';
import siteConfig from '@/config/site.js';
import { useTranslation } from '@/lib/i18n/I18nContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const iconMap: Record<string, any> = { LayoutTemplate };

export default function Home() {
  const { t } = useTranslation();
  const tenantId = 'default-tenant';
  const defaultColor = '#dc2626';
  const defaultName = 'Support Bot';

  const [config, setConfig] = useState({
    color: defaultColor,
    name: defaultName,
    position: 'right',
    icon: '',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto open widget slightly after load
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch real widget configuration
  useEffect(() => {
    fetch(`/api/widget/config?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        setConfig({
          color: data.primaryColor || defaultColor,
          name: data.botName || defaultName,
          position: data.position || 'right',
          icon: data.widgetIconUrl || '',
        });
      })
      .catch(err => console.error(err));
  }, []);

  // Position styles
  const positionClasses = config.position === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6';
  const chatWindowPositionClasses = config.position === 'left'
    ? 'left-0 origin-bottom-left'
    : 'right-0 origin-bottom-right';

  const tooltipPositionClasses = config.position === 'left'
    ? 'left-full ml-4 flex-row-reverse'
    : 'right-full mr-4';

  const tooltipArrowClasses = config.position === 'left'
    ? 'right-full border-r-white'
    : 'left-full border-l-white';

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative overflow-x-hidden">
      {/* NAVBAR MOCK */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            {(() => {
              const LogoIcon = iconMap[siteConfig.logoIcon] || LayoutTemplate;
              return <LogoIcon className="w-5 h-5 text-white" />;
            })()}
          </div>
          <span className="font-bold text-xl text-slate-800">{siteConfig.name}</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-brand transition-colors">{t('homepage', 'product', 'Produk')}</a>
          <a href="#" className="hover:text-brand transition-colors">{t('homepage', 'pricing', 'Harga')}</a>
          <a href="#" className="hover:text-brand transition-colors">{t('homepage', 'docs', 'Dokumentasi')}</a>
          <a href="#" className="hover:text-brand transition-colors">{t('homepage', 'contact', 'Kontak')}</a>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {/* Login Button */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-full shadow-md shadow-brand/20 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {t('homepage', 'login', 'Login')}
          </Link>
        </div>
      </nav>

      {/* MOCK WEBSITE BACKGROUND - CARA PENGGUNAAN */}
      <div className="max-w-4xl mx-auto px-6 py-16 pb-32">
        <header className="mb-12 text-center md:text-left">
          <div className="inline-flex items-center justify-center p-3 bg-brand-bg rounded-2xl mb-6">
            <Code className="text-brand w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            {t('homepage', 'heroTitle', 'Preview Widget & Cara Penggunaan')}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
            {t('homepage', 'heroDesc', 'Ini adalah tampilan simulasi website Anda. Widget chat pintar telah dipasang di sudut layar dan siap digunakan.')}
          </p>
        </header>

        <div className="space-y-8">
          <section className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-bg text-brand text-sm mr-3 font-bold">1</span>
              {t('homepage', 'copyCodeTitle', 'Salin Kode Embed')}
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {t('homepage', 'copyCodeDesc', 'Untuk mengaktifkan widget ini di website Anda, salin kode snippet di bawah ini dan tempelkan tepat sebelum tag penutup </body> di HTML Anda.')}
            </p>
            <div className="relative group">
              <pre className="bg-[#0f172a] text-slate-50 p-6 rounded-2xl overflow-x-auto text-sm leading-relaxed font-mono shadow-inner">
{`<!-- AI Communication CRM Widget -->
<script>
  window.CRM_AGENT_CONFIG = {
    tenantId: "${tenantId}",
    apiUrl: "http://192.168.20.242:8201"
  };
</script>
<script src="http://192.168.20.242:8201/widget.js" async></script>`}
              </pre>
            </div>
          </section>

          <section className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-bg text-brand text-sm mr-3 font-bold">2</span>
              {t('homepage', 'activeFeaturesTitle', 'Fitur yang Aktif')}
            </h2>
            <div className="grid md:grid-cols-2 gap-y-4 gap-x-8">
              {[
                t('homepage', 'featAi', 'Kecerdasan Buatan (AI) otomatis'),
                t('homepage', 'featHandoff', 'Transisi ke agen manusia (Handoff)'),
                t('homepage', 'featBrand', 'Penyesuaian warna dan identitas merek'),
                t('homepage', 'featRealtime', 'Koneksi real-time via WebSocket'),
                t('homepage', 'featResponsive', 'Tampilan responsif semua perangkat'),
                t('homepage', 'featReview', 'Formulir review / feedback otomatis')
              ].map((feature, i) => (
                <div key={i} className="flex items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* FLOATING WIDGET AREA */}
      <div className={`fixed bottom-4 md:bottom-6 z-50 ${positionClasses} flex flex-col`}>
        {/* Chat Window Container */}
        <div
          className={`
            transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] absolute bottom-16 md:bottom-20
            ${isOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-8 pointer-events-none'
            }
            w-[calc(100vw-2rem)] md:w-[380px] h-[600px] max-h-[calc(100vh-8rem)]
            bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/60
            ${chatWindowPositionClasses}
          `}
        >
          <ChatWindow
            tenantId={tenantId}
            primaryColor={config.color}
            botName={config.name}
          />
        </div>

        {/* Floating Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center
            transition-all duration-300 hover:scale-105 active:scale-95 text-white relative z-50 self-end
          `}
          style={{ backgroundColor: config.color }}
          aria-label={isOpen ? t('homepage', 'closeChat', 'Tutup chat') : t('homepage', 'openChat', 'Buka chat')}
        >
          {isOpen ? (
            <X className="w-6 h-6 animate-in fade-in zoom-in duration-200" />
          ) : (
            config.icon && config.icon.startsWith('http') ? (
              <img src={config.icon} alt="Chat Icon" className="w-8 h-8 object-contain animate-in fade-in zoom-in duration-200" />
            ) : (
              <MessageCircle className="w-6 h-6 animate-in fade-in zoom-in duration-200" />
            )
          )}

          {/* Tooltip */}
          {!isOpen && (
            <span
              className={`
                absolute ${tooltipPositionClasses} top-1/2 -translate-y-1/2 bg-white text-slate-800 text-sm px-4 py-2 rounded-xl shadow-lg border border-slate-100
                whitespace-nowrap transition-all duration-300 font-medium
                ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
              `}
            >
              {t('homepage', 'needHelp', 'Butuh bantuan?')}
              <span className={`absolute top-1/2 -translate-y-1/2 border-[6px] border-transparent ${tooltipArrowClasses}`}></span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
