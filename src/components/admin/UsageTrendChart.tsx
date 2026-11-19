'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { formatCost, formatInt, formatTokens, type AdminDayUsage } from './shared';

/** Every calendar date `from..to` (inclusive, plain YYYY-MM-DD; no time-zone math needed). */
function datesBetween(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const out: string[] = [];
  const cur = new Date(Date.UTC(fy, fm - 1, fd));
  const last = Date.UTC(ty, tm - 1, td);
  while (cur.getTime() <= last && out.length < 1000) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Daily token bars drawn with plain CSS (height relative to the busiest day); tooltip carries the details. */
export default function UsageTrendChart({
  byDay: sparseByDay,
  period,
}: {
  byDay: AdminDayUsage[];
  period: { from: string; to: string };
}) {
  const { t, locale } = useTranslation();
  const ta = (key: string, fallback: string) => t('admin', key, fallback);

  // The proxy only returns days that have usage; fill the gaps with zero bars so the time axis is honest.
  const byDay = useMemo<AdminDayUsage[]>(() => {
    const known = new Map(sparseByDay.map((d) => [d.date, d]));
    return datesBetween(period.from, period.to).map(
      (date) => known.get(date) ?? { date, total_tokens: 0, cost_usd: 0, request_count: 0 }
    );
  }, [sparseByDay, period.from, period.to]);

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
