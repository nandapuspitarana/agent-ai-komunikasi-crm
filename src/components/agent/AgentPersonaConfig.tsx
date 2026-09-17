'use client';

import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface AgentPersonaConfigProps {
  agentConfig: any;
  setAgentConfig: React.Dispatch<React.SetStateAction<any>>;
  defaultOpen?: boolean;
}

export const AgentPersonaConfig: React.FC<AgentPersonaConfigProps> = ({
  agentConfig,
  setAgentConfig,
  defaultOpen = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-purple-50/40 border border-purple-200/70 rounded-xl overflow-hidden transition-all shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-purple-100/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
            <Bot size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs sm:text-sm">AI Persona & Business Context</h3>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {agentConfig.language || 'Bahasa Indonesia'} &bull; {agentConfig.speakingStyle || 'ramah dan profesional'}
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-slate-600 p-1">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-purple-100/80 space-y-4">
          <p className="text-xs text-slate-500">
            Set up how your AI agent speaks and understands your business context.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Main Language</label>
              <select
                value={agentConfig.language || 'Bahasa Indonesia'}
                onChange={(e) => setAgentConfig({ ...agentConfig, language: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="Bahasa Indonesia">Indonesian</option>
                <option value="English">English</option>
                <option value="Bahasa Indonesia campur English (Jaksel)">Mixed (Indonesian & English)</option>
                <option value="Jawa">Javanese</option>
                <option value="Mandarin">Chinese (Mandarin)</option>
                <option value="Korean">Korean</option>
                <option value="Thai">Thai</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Speaking Style</label>
              <select
                value={agentConfig.speakingStyle || 'ramah dan profesional'}
                onChange={(e) => setAgentConfig({ ...agentConfig, speakingStyle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="ramah dan profesional">Friendly & Professional</option>
                <option value="sangat santai dan asik layaknya teman">Casual & Fun</option>
                <option value="sangat formal dan baku">Formal & Standard</option>
                <option value="penuh antusiasme dan ceria">Enthusiastic & Cheerful</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Business Needs / Context (Optional)</label>
            <textarea
              value={agentConfig.businessNeeds || ''}
              onChange={(e) => setAgentConfig({ ...agentConfig, businessNeeds: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
              rows={3}
              placeholder="Example: We are a beauty clinic focusing on anti-aging treatments. Provide advice in a convincing tone."
            />
            <p className="text-[10px] text-slate-400 mt-1">{t('agentBuilder', 'contextPlaceholder')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPersonaConfig;
