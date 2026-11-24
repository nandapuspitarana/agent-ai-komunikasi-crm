'use client';

import { useEffect, useState } from 'react';
import { MAX_BILLING_DAYS, presetPeriod, validatePeriodRange } from '@/lib/admin-billing';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { errorMessageFor } from './shared';

type Period = { from: string; to: string };
type Mode = 'this_month' | 'last_month' | 'custom';

const sameRange = (a: Period, b: Period) => a.from === b.from && a.to === b.to;

export default function PeriodPicker({
  value,
  tz,
  onChange,
}: {
  value: Period;
  tz: string;
  onChange: (value: Period) => void;
}) {
  const { t } = useTranslation();
  const ta = (key: string, fallback: string) => t('admin', key, fallback);

  // Not memoised: the presets must follow the clock (a tab left open across a month boundary).
  const presets = { this_month: presetPeriod('this_month', tz), last_month: presetPeriod('last_month', tz) };

  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);

  useEffect(() => {
    setDraftFrom(value.from);
    setDraftTo(value.to);
  }, [value.from, value.to]);

  const matched: Mode = sameRange(value, presets.this_month)
    ? 'this_month'
    : sameRange(value, presets.last_month)
      ? 'last_month'
      : 'custom';
  const active: Mode = customOpen ? 'custom' : matched;
  // Same rule as the API (resolvePeriod): both dates set, from <= to, at most MAX_BILLING_DAYS inclusive.
  const rangeError = validatePeriodRange(draftFrom, draftTo);
  const invalid = rangeError !== null;
  const errorMeta = rangeError ? errorMessageFor(rangeError) : null;
  const errorText = errorMeta ? ta(errorMeta.key, errorMeta.fallback).replace('{max}', String(MAX_BILLING_DAYS)) : '';

  const pick = (mode: 'this_month' | 'last_month') => {
    setCustomOpen(false);
    onChange(presetPeriod(mode, tz)); // fresh at click time, not the render-time snapshot
  };

  const segment = (mode: Mode) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      active === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit max-w-full">
        <button type="button" className={segment('this_month')} aria-pressed={active === 'this_month'} onClick={() => pick('this_month')}>
          {ta('periodThisMonth', 'This month')}
        </button>
        <button type="button" className={segment('last_month')} aria-pressed={active === 'last_month'} onClick={() => pick('last_month')}>
          {ta('periodLastMonth', 'Last month')}
        </button>
        <button type="button" className={segment('custom')} aria-pressed={active === 'custom'} onClick={() => setCustomOpen(true)}>
          {ta('periodCustom', 'Custom')}
        </button>
      </div>

      {active === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="admin-period-from">
            {ta('periodFrom', 'From')}
          </label>
          <input
            id="admin-period-from"
            type="date"
            value={draftFrom}
            max={draftTo || undefined}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'admin-period-error' : undefined}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
          />
          <span className="text-slate-400">–</span>
          <label className="sr-only" htmlFor="admin-period-to">
            {ta('periodTo', 'To')}
          </label>
          <input
            id="admin-period-to"
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            aria-invalid={invalid}
            aria-describedby={invalid ? 'admin-period-error' : undefined}
            onChange={(e) => setDraftTo(e.target.value)}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white"
          />
          <button
            type="button"
            disabled={invalid}
            onClick={() => !invalid && onChange({ from: draftFrom, to: draftTo })}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ta('apply', 'Apply')}
          </button>
          {invalid && (
            <p id="admin-period-error" role="alert" className="basis-full text-xs text-red-600">
              {errorText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
