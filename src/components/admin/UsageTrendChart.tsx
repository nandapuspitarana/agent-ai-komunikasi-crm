'use client';

import { useTranslation } from '@/lib/i18n/I18nContext';
import { formatCost, formatInt, formatTokens, type AdminDayUsage } from './shared';

/** Daily token bars drawn with plain CSS (height relative to the busiest day); tooltip carries the details. */
export default function UsageTrendChart({ byDay }: { byDay: AdminDayUsage[] }) {
  const { t, locale } = useTranslation();
  const ta = (key: string, fallback: string) => t('admin', key, fallback);

  const max = byDay.reduce((m, d) => Math.max(m, d.total_tokens), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{ta('trendTitle', 'Daily token & cost trend')}</h3>
      {byDay.length === 0 || max === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">{ta('trendEmpty', 'No AI usage in this period yet')}</p>
      ) : (
        <>
          <div className="flex items-end gap-[2px] h-40" role="list">
            {byDay.map((d) => {
              const pct = d.total_tokens > 0 ? Math.max((d.total_tokens / max) * 100, 2) : 0;
              const tip = `${d.date}\n${formatTokens(d.total_tokens, locale)} ${ta('colTokens', 'Tokens').toLowerCase()} · ${formatCost(d.cost_usd, locale)}\n${formatInt(d.request_count, locale)} ${ta('requests', 'requests')}`;
              return (
                <div key={d.date} role="listitem" title={tip} aria-label={tip} className="flex-1 h-full flex items-end min-w-0">
                  <div className="w-full rounded-t bg-brand/70 hover:bg-brand transition-colors" style={{ height: `${pct}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{byDay[0].date}</span>
            <span>{byDay[byDay.length - 1].date}</span>
          </div>
        </>
      )}
    </div>
  );
}
