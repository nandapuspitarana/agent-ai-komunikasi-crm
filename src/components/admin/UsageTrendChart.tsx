'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { bucketUsage, formatCost, formatInt, formatTokens, type AdminDayUsage } from './shared';

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

  // Long ranges are drawn as weekly totals (see bucketUsage): a bar per day would be sub-pixel on a phone.
  const { weekly, buckets } = useMemo(() => bucketUsage(byDay), [byDay]);
  const max = buckets.reduce((m, b) => Math.max(m, b.total_tokens), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{ta('trendTitle', 'Daily token & cost trend')}</h3>
        {weekly && <span className="text-xs text-slate-400">{ta('trendWeekly', 'Weekly totals')}</span>}
      </div>
      {byDay.length === 0 || max === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">{ta('trendEmpty', 'No AI usage in this period yet')}</p>
      ) : (
        <>
          {/* No flex gap: each bar's wrapper pads 1px per side instead, so at most 62 bars (2px each) always fit. */}
          <div className="flex items-end h-40 overflow-hidden" role="list">
            {buckets.map((b) => {
              const pct = b.total_tokens > 0 ? Math.max((b.total_tokens / max) * 100, 2) : 0;
              const range = b.from === b.to ? b.from : `${b.from} – ${b.to}`;
              // A short (partial) weekly bucket says how many days it covers, so it is not read as a usage drop.
              const when = weekly && b.days < 7 ? `${range} (${ta('trendDays', '{count} days').replace('{count}', String(b.days))})` : range;
              const tip = `${when}\n${formatTokens(b.total_tokens, locale)} ${ta('colTokens', 'Tokens').toLowerCase()} · ${formatCost(b.cost_usd, locale)}\n${formatInt(b.request_count, locale)} ${ta('requests', 'requests')}`;
              return (
                <div key={b.from} role="listitem" title={tip} aria-label={tip} className="flex-1 h-full flex items-end min-w-0 px-px">
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
