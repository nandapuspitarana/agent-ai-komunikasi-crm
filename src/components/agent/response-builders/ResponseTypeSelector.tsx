'use client';

import React from 'react';
import { MessageSquare, LayoutList, ExternalLink, FormInput, UserCheck } from 'lucide-react';

interface ResponseTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

interface TypeOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeColor: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    id: 'text',
    label: 'Text Only',
    desc: 'Standard text response',
    icon: MessageSquare,
    badgeColor: 'text-slate-600 bg-slate-100',
  },
  {
    id: 'options',
    label: 'Quick Reply',
    desc: 'Text with button choices',
    icon: LayoutList,
    badgeColor: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'card',
    label: 'Info Card',
    desc: 'Card with image & link',
    icon: ExternalLink,
    badgeColor: 'text-amber-600 bg-amber-50',
  },
  {
    id: 'form',
    label: 'Lead Form',
    desc: 'Interactive input form',
    icon: FormInput,
    badgeColor: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 'handoff',
    label: 'Agent Handoff',
    desc: 'Transfer to human agent',
    icon: UserCheck,
    badgeColor: 'text-rose-600 bg-rose-50',
  },
];

export const ResponseTypeSelector: React.FC<ResponseTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Response Type
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-start gap-1.5 ${
                isSelected
                  ? 'border-brand bg-brand-bg/60 text-brand shadow-sm ring-1 ring-brand/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected ? 'bg-brand text-white' : opt.badgeColor
                  }`}
                >
                  <Icon size={14} />
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                )}
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-brand' : 'text-slate-800'}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResponseTypeSelector;
