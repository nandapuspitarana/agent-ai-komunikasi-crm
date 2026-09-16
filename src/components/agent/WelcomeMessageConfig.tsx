'use client';

import React, { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface WelcomeMessageConfigProps {
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  defaultOpen?: boolean;
}

export const WelcomeMessageConfig: React.FC<WelcomeMessageConfigProps> = ({
  agentConfig,
  setAgentConfig,
  defaultOpen = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-brand-bg/40 border border-brand/20 rounded-xl overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-brand-bg/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-bg flex items-center justify-center text-brand">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs sm:text-sm">Welcome Message / Greeting</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {agentConfig.welcomeMessage || 'No greeting set'}
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-slate-600 p-1">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-brand/10 space-y-4">
          <p className="text-xs text-slate-500">{t('agentBuilder', 'welcomePlaceholder')}</p>

          <div className="space-y-3">
            <div>
              <textarea
                value={agentConfig.welcomeMessage || ''}
                onChange={(e) => setAgentConfig({ ...agentConfig, welcomeMessage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light text-sm bg-white"
                rows={2}
                placeholder="Hello! How can I help you today?"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-1/3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Message Type</label>
                <select
                  value={agentConfig.welcomeMessageType || 'text'}
                  onChange={(e) => setAgentConfig({ ...agentConfig, welcomeMessageType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light bg-white text-sm"
                >
                  <option value="text">Text Only</option>
                  <option value="options">Text with Options (Buttons)</option>
                  <option value="form">Form (Lead Capture)</option>
                </select>
              </div>
              {agentConfig.welcomeMessageType === 'options' && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Options (comma separated)</label>
                  <input
                    type="text"
                    value={agentConfig.welcomeMessageOptions || ''}
                    onChange={(e) => setAgentConfig({ ...agentConfig, welcomeMessageOptions: e.target.value })}
                    placeholder="e.g. Help me choose, Pricing, Book a tour"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand-light text-sm bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeMessageConfig;
