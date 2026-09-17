'use client';

import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface FallbackConfigProps {
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  defaultOpen?: boolean;
}

export const FallbackConfig: React.FC<FallbackConfigProps> = ({
  agentConfig,
  setAgentConfig,
  defaultOpen = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-orange-50/40 border border-orange-200/70 rounded-xl overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-orange-100/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Bot size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs sm:text-sm">Default Fallback Response</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {agentConfig.defaultResponse || 'No fallback message set'}
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-slate-600 p-1">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-orange-100/80 space-y-4">
          <p className="text-xs text-slate-500">
            {t('agentBuilder', 'unknownPlaceholder')} (does not match any Intent/QnA).
          </p>

          <div className="space-y-3">
            <div>
              <textarea
                value={agentConfig.defaultResponse || ''}
                onChange={(e) => setAgentConfig({ ...agentConfig, defaultResponse: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                rows={2}
                placeholder="Sorry, I don't understand your question..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-1/3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Message Type</label>
                <select
                  value={agentConfig.defaultResponseType || 'text'}
                  onChange={(e) => setAgentConfig({ ...agentConfig, defaultResponseType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm"
                >
                  <option value="text">Text Only</option>
                  <option value="options">Text with Options (Buttons)</option>
                  <option value="form">Form (Lead Capture)</option>
                </select>
              </div>
              {agentConfig.defaultResponseType === 'options' && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Options (comma separated)</label>
                  <input
                    type="text"
                    value={agentConfig.defaultResponseOptions || ''}
                    onChange={(e) => setAgentConfig({ ...agentConfig, defaultResponseOptions: e.target.value })}
                    placeholder="e.g. Kembali ke Menu Utama, Bicara dengan Agen"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
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

export default FallbackConfig;
