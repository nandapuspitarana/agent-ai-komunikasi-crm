import React from 'react';
import ClassificationBadge from './ClassificationBadge';
import LeadScoreBadge from './LeadScoreBadge';
import { Eye, Smartphone, Monitor } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface VisitorTableProps {
  visitors: any[];
  isLoading: boolean;
  onViewDetail: (visitorId: string) => void;
}

export default function VisitorTable({ visitors, isLoading, onViewDetail }: VisitorTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
        <p className="text-slate-600 mt-3">{t('visitors', 'loading')}</p>
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-slate-600">{t('visitors', 'noVisitors')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'score')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'visitor')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'classification')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'deviceSource')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'sessions')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('visitors', 'lastSeen')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('visitors', 'actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visitors.map((visitor) => (
              <tr key={visitor.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <LeadScoreBadge score={visitor.leadScore} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900">{visitor.name || t('visitors', 'anonymous')}</p>
                  {visitor.email && <p className="text-xs text-slate-500">{visitor.email}</p>}
                  {visitor.phone && <p className="text-xs text-slate-500">{visitor.phone}</p>}
                  {!visitor.name && !visitor.email && <p className="text-xs text-slate-400 font-mono">{visitor.contactId.substring(0, 8)}...</p>}
                </td>
                <td className="px-4 py-3">
                  <ClassificationBadge classification={visitor.leadClassification} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    {visitor.deviceType === 'mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                    <span className="text-xs">{visitor.browserName || t('visitors', 'unknownBrowser')}</span>
                  </div>
                  {visitor.utmSource && (
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium border border-slate-200">
                      utm: {visitor.utmSource}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium">
                  {visitor.sessions}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {new Date(visitor.lastSeenAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetail(visitor.id)}
                    className="p-2 text-brand hover:bg-brand-bg rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <Eye size={16} /> {t('visitors', 'view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
