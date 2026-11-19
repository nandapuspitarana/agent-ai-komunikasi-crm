'use client';

import { Fragment, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { tenantLabel } from '@/lib/admin-billing';
import { NA, formatCost, formatInt, formatTokens, roleLabel, tenantLabelsFrom, type TenantRow } from './shared';

type SortKey = 'costUsd' | 'totalTokens' | 'activeInPeriod' | 'name';
type SortDir = 'asc' | 'desc';

const sortValue = (r: TenantRow, key: Exclude<SortKey, 'name'>): number | null => {
  if (key === 'activeInPeriod') return r.endUsers.activeInPeriod;
  if (!r.ai) return null;
  return key === 'costUsd' ? r.ai.costUsd : r.ai.totalTokens;
};

const rowKey = (r: TenantRow) => r.id ?? '__none__';

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

function relativeTime(iso: string, locale: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'minute');
}

export default function TenantBillingTable({ tenants }: { tenants: TenantRow[] }) {
  const { t, locale } = useTranslation();
  const ta = (key: string, fallback: string) => t('admin', key, fallback);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('costUsd');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Primitive deps: `t` changes identity on every provider render, the label strings do not.
  const { unknown: unknownLabel, none: noneLabel } = tenantLabelsFrom(ta);
  const labels = useMemo(() => ({ unknown: unknownLabel, none: noneLabel }), [unknownLabel, noneLabel]);

  // One displayed name per row (CRM name, or the localized orphan label): shown, searched and sorted by.
  const named = useMemo(() => tenants.map((row) => ({ row, label: tenantLabel(row, labels) })), [tenants, labels]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? named.filter((r) => r.label.toLowerCase().includes(q)) : named;
    const sign = sortDir === 'asc' ? 1 : -1;
    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale);
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return sign * byLabel(a, b);
      const av = sortValue(a.row, sortKey);
      const bv = sortValue(b.row, sortKey);
      if (av === null && bv === null) return byLabel(a, b);
      if (av === null) return 1; // unknown (null) always sorts last
      if (bv === null) return -1;
      return sign * (av - bv) || byLabel(a, b);
    });
  }, [named, query, sortKey, sortDir, locale]);

  // TOTAL covers every tenant row (independent of the search box). Staff is the sum of tenant staff, so it
  // excludes accounts without a tenant (SUPER_ADMIN): the summary card's platform count can be higher.
  const total = useMemo(() => {
    const acc = {
      staffTotal: 0,
      staffActive: 0,
      activeUsers: 0,
      sessions: 0,
      messages: 0,
      tokens: null as number | null,
      cost: null as number | null,
      unpriced: 0,
    };
    for (const r of tenants) {
      acc.staffTotal += r.staff.total;
      acc.staffActive += r.staff.active;
      acc.activeUsers += r.endUsers.activeInPeriod;
      acc.sessions += r.activity.sessions;
      acc.messages += r.activity.messages;
      if (r.ai) {
        acc.tokens = (acc.tokens ?? 0) + r.ai.totalTokens;
        acc.cost = (acc.cost ?? 0) + r.ai.costUsd;
        acc.unpriced += r.ai.unpricedCount;
      }
    }
    return acc;
  }, [tenants]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const sortableTh = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${sortKey === key ? 'text-slate-900' : ''}`}
        aria-label={`${ta('sortBy', 'Sort by')} ${label}`}
      >
        {label}
        {sortKey === key && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  const colCount = 10;
  const unavailableTip = ta('tokensUnavailable', 'Token data unavailable');
  const unpricedTip = (count: number) =>
    ta('unpricedCellHint', '{count} calls without a price — cost not included').replace('{count}', formatInt(count, locale));
  const totalStaffTip = ta('totalStaffHint', 'Excludes accounts without a tenant');

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ta('searchPlaceholder', 'Search tenant…')}
            aria-label={ta('searchPlaceholder', 'Search tenant…')}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="w-8 px-2 py-3" />
              {sortableTh('name', ta('colTenant', 'Tenant'), 'left')}
              <th className="px-4 py-3 font-medium text-left">{ta('colPlan', 'Plan')}</th>
              <th className="px-4 py-3 font-medium text-right">{ta('colStaff', 'Staff')}</th>
              {sortableTh('activeInPeriod', ta('colActiveUsers', 'Active users'))}
              <th className="px-4 py-3 font-medium text-right">{ta('colSessions', 'Sessions')}</th>
              <th className="px-4 py-3 font-medium text-right">{ta('colMessages', 'Messages')}</th>
              {sortableTh('totalTokens', ta('colTokens', 'Tokens'))}
              {sortableTh('costUsd', ta('colCost', 'Cost'))}
              <th className="px-4 py-3 font-medium text-right">{ta('colLastActivity', 'Last active')}</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-slate-400">
                  {tenants.length === 0 ? ta('noData', 'No data') : ta('noMatch', 'No tenant matches your search')}
                </td>
              </tr>
            )}
            {rows.map(({ row: r, label }) => {
              const key = rowKey(r);
              const open = expanded.has(key);
              return (
                <Fragment key={key}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => toggleRow(key)}
                        aria-expanded={open}
                        aria-label={label}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className={r.known ? undefined : 'italic text-slate-600'}>{label}</span>
                    </td>
                    <td className="px-4 py-3">{r.plan ?? NA}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.known ? `${formatInt(r.staff.active, locale)}/${formatInt(r.staff.total, locale)}` : NA}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInt(r.endUsers.activeInPeriod, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInt(r.activity.sessions, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatInt(r.activity.messages, locale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums" title={r.ai ? undefined : unavailableTip}>
                      {r.ai ? formatTokens(r.ai.totalTokens, locale) : NA}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      title={r.ai ? (r.ai.unpricedCount > 0 ? unpricedTip(r.ai.unpricedCount) : undefined) : unavailableTip}
                    >
                      {r.ai ? `${formatCost(r.ai.costUsd, locale)}${r.ai.unpricedCount > 0 ? ' *' : ''}` : NA}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                      {r.lastActivityAt ? relativeTime(r.lastActivityAt, locale) : NA}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td />
                      <td colSpan={colCount - 1} className="px-4 py-4">
                        <TenantDetails row={r} locale={locale} ta={ta} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-900">
              <td />
              <td className="px-4 py-3">{ta('total', 'TOTAL')}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums" title={totalStaffTip}>
                {formatInt(total.staffActive, locale)}/{formatInt(total.staffTotal, locale)}
                <span aria-label={totalStaffTip}> †</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(total.activeUsers, locale)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(total.sessions, locale)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatInt(total.messages, locale)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {total.tokens === null ? NA : formatTokens(total.tokens, locale)}
              </td>
              <td
                className="px-4 py-3 text-right tabular-nums"
                title={total.unpriced > 0 ? unpricedTip(total.unpriced) : undefined}
              >
                {total.cost === null ? NA : `${formatCost(total.cost, locale)}${total.unpriced > 0 ? ' *' : ''}`}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">† {totalStaffTip}</p>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="min-w-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">{NA}</p>
      ) : (
        <ul className="space-y-1">
          {items.map(([k, v], i) => (
            <li key={`${i}-${k}`} className="flex justify-between gap-3 text-xs">
              <span className="text-slate-600 truncate" title={k}>
                {k}
              </span>
              <span className="text-slate-800 tabular-nums shrink-0">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TenantDetails({
  row,
  locale,
  ta,
}: {
  row: TenantRow;
  locale: string;
  ta: (key: string, fallback: string) => string;
}) {
  const byType: Array<[string, string]> = (row.ai?.byType ?? []).map((x) => [
    x.request_type,
    `${formatTokens(x.total_tokens, locale)} · ${formatCost(x.cost_usd, locale)}`,
  ]);
  const byModel: Array<[string, string]> = (row.ai?.byModel ?? []).map((x) => [
    x.model_name ?? ta('unknownModel', '(unknown)'),
    `${formatTokens(x.total_tokens, locale)} · ${formatCost(x.cost_usd, locale)}`,
  ]);
  const byRole: Array<[string, string]> = Object.entries(row.staff.byRole).map(([role, n]) => [
    roleLabel(ta, role, 'name'),
    formatInt(n, locale),
  ]);
  const extra: Array<[string, string]> = [
    [ta('profiles', 'profiles'), formatInt(row.endUsers.storedProfiles, locale)],
    [ta('profilesNew', 'new profiles'), formatInt(row.endUsers.newProfilesInPeriod, locale)],
  ];
  if (row.ai) {
    extra.push([ta('requests', 'requests'), formatInt(row.ai.requests, locale)]);
    extra.push([ta('errors', 'errors'), formatInt(row.ai.errors, locale)]);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <DetailList title={ta('detailByType', 'By type')} items={byType} />
      <DetailList title={ta('detailByModel', 'By model')} items={byModel} />
      <DetailList title={ta('detailStaffByRole', 'Staff by role')} items={byRole} />
      <DetailList title={ta('colActiveUsers', 'Active users')} items={extra} />
    </div>
  );
}
