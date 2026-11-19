'use client';

import { Building2, UserCog, Users, Cpu, DollarSign } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { NA, formatCost, formatInt, formatTokens, roleLabel, unpricedHint, type AdminAi, type PlatformStats } from './shared';

const joinCounts = (record: Record<string, number>, label?: (key: string) => string) =>
  Object.entries(record)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${label ? label(k) : k} ${n}`)
    .join(' · ');

function Card({
  icon,
  label,
  value,
  lines,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  lines: string[];
  /** Accessible explanation of the `*` marker appended to the value (unpriced calls). */
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-brand-bg text-brand flex items-center justify-center shrink-0">{icon}</div>
        <h3 className="text-sm font-medium text-slate-500">{label}</h3>
      </div>
      {/* Values and lines wrap instead of truncating: long ko/th labels must stay readable on a phone. */}
      <p className="text-xl sm:text-2xl font-bold text-slate-900 break-words" title={hint ? `${value} — ${hint}` : undefined}>
        {value}
        {hint && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only">{`, ${hint}`}</span>
          </>
        )}
      </p>
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-slate-500 mt-1 break-words">
          {line || ' '}
        </p>
      ))}
    </div>
  );
}

export default function AdminSummaryCards({ platform, ai }: { platform: PlatformStats; ai: AdminAi }) {
  const { t, locale } = useTranslation();
  const ta = (key: string, fallback: string) => t('admin', key, fallback);
  const totals = ai.status === 'ok' ? ai.totals : null;

  const { tenants, staff, endUsers } = platform;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <Card
        icon={<Building2 size={18} />}
        label={ta('cardTenants', 'Tenants')}
        value={`${formatInt(tenants.total, locale)} (${formatInt(tenants.aiEnabled, locale)} ${ta('aiOn', 'AI on')})`}
        lines={[joinCounts(tenants.byPlan)]}
      />
      <Card
        icon={<UserCog size={18} />}
        label={ta('cardStaff', 'Staff accounts')}
        value={`${formatInt(staff.total, locale)} (${formatInt(staff.active, locale)} ${ta('active', 'active')})`}
        lines={[joinCounts(staff.byRole, (role) => roleLabel(ta, role, 'short'))]}
      />
      <Card
        icon={<Users size={18} />}
        label={ta('cardEndUsers', 'Active users')}
        value={formatInt(endUsers.activeInPeriod, locale)}
        lines={[`+${formatInt(endUsers.newProfilesInPeriod, locale)} ${ta('profilesNew', 'new profiles')}`]}
      />
      <Card
        icon={<Cpu size={18} />}
        label={ta('cardTokens', 'Total tokens')}
        value={totals ? formatTokens(totals.total_tokens, locale) : NA}
        lines={[
          totals
            ? `${ta('tokensIn', 'in')} ${formatTokens(totals.input_tokens, locale)} · ${ta('tokensOut', 'out')} ${formatTokens(totals.output_tokens, locale)}`
            : '',
        ]}
      />
      <Card
        icon={<DollarSign size={18} />}
        label={ta('cardCost', 'Estimated AI cost')}
        value={totals ? formatCost(totals.cost_usd, locale) : NA}
        hint={totals && totals.unpriced_count > 0 ? unpricedHint(ta, totals.unpriced_count, locale) : undefined}
        lines={[
          totals
            ? `${formatInt(totals.request_count, locale)} ${ta('requests', 'requests')} · ${formatInt(totals.error_count, locale)} ${ta('errors', 'errors')}`
            : '',
        ]}
      />
    </div>
  );
}
