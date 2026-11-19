'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, AlertTriangle, Download, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { billingCsvFilename, buildBillingCsv, needsRetentionWarning, zonedMidnightToUtc } from '@/lib/admin-billing';
import AdminSummaryCards from '@/components/admin/AdminSummaryCards';
import UsageTrendChart from '@/components/admin/UsageTrendChart';
import TenantBillingTable from '@/components/admin/TenantBillingTable';
import PeriodPicker from '@/components/admin/PeriodPicker';
import type { AdminOverview } from '@/components/admin/shared';

type Period = { from: string; to: string };

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-56 rounded-xl bg-slate-200/70" />
      <div className="h-80 rounded-xl bg-slate-200/70" />
    </div>
  );
}

export default function AdminPage() {
  const { t, locale } = useTranslation();
  const ta = useCallback((key: string, fallback: string) => t('admin', key, fallback), [t]);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  // `query` null = no from/to yet: the server picks the current month in its billing time zone.
  const [query, setQuery] = useState<Period | null>(null);
  const [tz, setTz] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const qs = query ? `?${new URLSearchParams({ from: query.from, to: query.to }).toString()}` : '';
    (async () => {
      try {
        const res = await fetch(`/api/admin/overview${qs}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ? `${body.error} (HTTP ${res.status})` : `HTTP ${res.status}`);
        }
        const json = (await res.json()) as AdminOverview;
        setData(json);
        setTz(json.period.tz);
      } catch (err) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isSuperAdmin, query, reloadKey]);

  const period = data?.period ?? null;
  const ai = data?.ai ?? null;

  const retentionDate = useMemo(() => {
    if (!period || !ai || ai.status !== 'ok' || !ai.oldestAvailable) return null;
    try {
      const start = zonedMidnightToUtc(period.from, period.tz);
      const end = zonedMidnightToUtc(period.to, period.tz);
      if (!needsRetentionWarning({ ...period, start, end }, ai.oldestAvailable)) return null;
      return new Date(ai.oldestAvailable).toLocaleDateString(locale, { timeZone: period.tz });
    } catch {
      return null;
    }
  }, [period, ai, locale]);

  const exportCsv = () => {
    if (!data || data.ai.status !== 'ok') return;
    const csv = '﻿' + buildBillingCsv(data.tenants, data.period);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = billingCsvFilename(data.period);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto mt-16 bg-white rounded-xl border border-slate-200 p-8 text-center">
          <ShieldAlert size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-700 font-medium">{ta('forbidden', '403 — Super Admin only')}</p>
        </div>
      </div>
    );
  }

  const aiUnavailable = ai?.status === 'unavailable';
  const unpriced = ai?.status === 'ok' ? (ai.unpricedModels ?? []) : [];
  const pickerValue: Period | null = query ?? (period ? { from: period.from, to: period.to } : null);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{ta('title', 'Admin · Billing')}</h1>
          <p className="text-slate-500">{ta('subtitle', 'Platform-wide usage and AI cost per tenant for the selected period.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tz && pickerValue && <PeriodPicker value={pickerValue} tz={tz} onChange={setQuery} />}
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || aiUnavailable}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {ta('exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">
            {ta('loadError', 'Failed to load admin data')}: {error}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3 py-1 rounded-lg bg-white border border-red-200 font-medium hover:bg-red-100"
          >
            {ta('retry', 'Try again')}
          </button>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && data && (
        <>
          {retentionDate && (
            <Banner>{ta('warnRetention', 'Token data is available since {date}').replace('{date}', retentionDate)}</Banner>
          )}
          {aiUnavailable && <Banner>{ta('warnAiUnavailable', 'AI service unreachable — token figures are unavailable')}</Banner>}
          {unpriced.length > 0 && (
            <Banner>
              {ta('warnUnpriced', '{count} models without a price (cost not included): {models}')
                .replace('{count}', String(unpriced.length))
                .replace('{models}', unpriced.join(', '))}
            </Banner>
          )}

          <AdminSummaryCards platform={data.platform} ai={data.ai} />
          {data.ai.status === 'ok' && <UsageTrendChart byDay={data.ai.byDay ?? []} />}
          <TenantBillingTable tenants={data.tenants} />
        </>
      )}
    </div>
  );
}
