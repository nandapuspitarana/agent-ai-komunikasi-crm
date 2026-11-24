import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { errorCodeOf, errorMessageFor, roleLabel, tenantLabelsFrom } from '@/components/admin/shared';
import { buildBillingCsv, mergeTenantUsage, tenantLabel, type ProxyTenantUsage, type TenantRow } from '@/lib/admin-billing';

const LOCALES = ['en', 'id', 'ko', 'th', 'zh'] as const;

const load = (locale: string): Record<string, string> => {
  const file = path.resolve(__dirname, '../../src/dictionaries', `${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf-8')).admin;
};

const dictionaries = Object.fromEntries(LOCALES.map((l) => [l, load(l)])) as Record<(typeof LOCALES)[number], Record<string, string>>;

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).map((m) => m.slice(1, -1)).sort();

describe('admin dictionaries', () => {
  it('have a non-empty admin block in every locale', () => {
    for (const l of LOCALES) expect(Object.keys(dictionaries[l]).length, l).toBeGreaterThan(0);
  });

  it.each(LOCALES.filter((l) => l !== 'en'))('%s has exactly the same admin keys as en', (locale) => {
    const en = Object.keys(dictionaries.en).sort();
    const keys = Object.keys(dictionaries[locale]).sort();
    expect(keys.filter((k) => !en.includes(k)), `extra in ${locale}`).toEqual([]);
    expect(en.filter((k) => !keys.includes(k)), `missing in ${locale}`).toEqual([]);
  });

  it.each(LOCALES.filter((l) => l !== 'en'))('%s uses the same {placeholders} as en for every key', (locale) => {
    for (const [key, text] of Object.entries(dictionaries.en)) {
      expect(placeholders(dictionaries[locale][key] ?? ''), `${locale}.admin.${key}`).toEqual(placeholders(text));
    }
  });

  it('has no empty or non-string values', () => {
    for (const l of LOCALES) {
      for (const [key, text] of Object.entries(dictionaries[l])) {
        expect(typeof text, `${l}.admin.${key}`).toBe('string');
        expect(text.trim(), `${l}.admin.${key}`).not.toBe('');
      }
    }
  });

  // Values that may legitimately equal the English text (technical tokens or placeholders only).
  // Everything else in ko/th/zh must be translated: a copy of en.json is a regression.
  const SAME_AS_EN_OK = ['httpErrorSuffix'];

  it.each(['ko', 'th', 'zh'] as const)('%s admin values are translated, not copies of en (explicit allowlist only)', (locale) => {
    const untranslated = Object.keys(dictionaries.en).filter(
      (k) => dictionaries[locale][k] === dictionaries.en[k] && !SAME_AS_EN_OK.includes(k)
    );
    expect(untranslated).toEqual([]);
  });

  it('id differs from en except for cognates and initialisms', () => {
    const cognates = ['colTenant', 'colPlan', 'total', 'httpErrorSuffix', 'roleShortSuperAdmin', 'roleShortBusinessPartner', 'roleShortAgent', 'roleSuperAdmin'];
    const same = Object.keys(dictionaries.en).filter((k) => dictionaries.id[k] === dictionaries.en[k]);
    expect(same.filter((k) => !cognates.includes(k))).toEqual([]);
  });

  it('keeps technical tokens in the ko/th/zh export button and AI labels', () => {
    for (const l of ['ko', 'th', 'zh'] as const) {
      expect(dictionaries[l].exportCsv, l).toContain('CSV');
      expect(dictionaries[l].cardCost, l).toContain('AI');
    }
  });

  it('carries every key the error mapping and orphan labels point at', () => {
    const keys = ['httpErrorSuffix', 'roleShortSuperAdmin', 'roleShortBusinessPartner', 'roleShortAgent', 'roleSuperAdmin', 'roleBusinessPartner', 'roleAgent', 'errPeriodIncomplete', 'errPeriodInvalid', 'errPeriodOrder', 'errPeriodTooLong', 'errServerTimezone', 'errGeneric', 'unknownTenant', 'noTenant', 'unknownModel'];
    for (const l of LOCALES) for (const k of keys) expect(dictionaries[l][k], `${l}.admin.${k}`).toBeTruthy();
  });

  it('keeps the {max} placeholder in the too-long message of every locale', () => {
    for (const l of LOCALES) expect(placeholders(dictionaries[l].errPeriodTooLong), l).toEqual(['max']);
  });
});

describe('errorMessageFor', () => {
  it.each([
    ['period_incomplete', 'errPeriodIncomplete'],
    ['period_invalid', 'errPeriodInvalid'],
    ['period_order', 'errPeriodOrder'],
    ['period_too_long', 'errPeriodTooLong'],
    ['server_timezone', 'errServerTimezone'],
  ])('maps %s to %s, which exists in every dictionary', (code, key) => {
    expect(errorMessageFor(code).key).toBe(key);
    for (const l of LOCALES) expect(dictionaries[l][key]).toBeTruthy();
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'])(
    'does not resolve the inherited Object.prototype member %s',
    (code) => {
      const { key, fallback } = errorMessageFor(code);
      expect(key).toBe('errGeneric');
      expect(typeof fallback).toBe('string');
    }
  );

  it('falls back to the generic message for unknown codes, missing codes and other server codes', () => {
    for (const code of ['overview_failed', 'ai_unavailable', 'something_new', '', null, undefined]) {
      expect(errorMessageFor(code).key).toBe('errGeneric');
    }
  });
});

describe('errorCodeOf', () => {
  it('reads the machine code of { error: { code } }', () => {
    expect(errorCodeOf({ error: { code: 'period_order', message: 'x' } })).toBe('period_order');
  });

  it('returns null for string errors (shared auth guard), empty or malformed bodies', () => {
    expect(errorCodeOf({ error: 'Unauthorized' })).toBeNull();
    expect(errorCodeOf({ error: { code: 42 } })).toBeNull();
    expect(errorCodeOf({})).toBeNull();
    expect(errorCodeOf(null)).toBeNull();
  });
});

describe('roleLabel', () => {
  it('localizes known roles from the dictionary in every locale, raw for unknown ones', () => {
    for (const l of LOCALES) {
      const ta = (key: string, fallback: string) => dictionaries[l][key] ?? fallback;
      expect(roleLabel(ta, 'SUPER_ADMIN', 'short')).toBe(dictionaries[l].roleShortSuperAdmin);
      expect(roleLabel(ta, 'BUSINESS_PARTNER', 'name')).toBe(dictionaries[l].roleBusinessPartner);
      expect(roleLabel(ta, 'AGENT', 'name')).toBe(dictionaries[l].roleAgent);
      expect(roleLabel(ta, 'custom_role', 'name')).toBe('custom_role');
      expect(roleLabel(ta, 'constructor', 'short')).toBe('constructor');
    }
  });

  it('keeps the English short forms SA/BP/AG', () => {
    expect(roleLabel((_k, f) => f, 'SUPER_ADMIN', 'short')).toBe('SA');
    expect(roleLabel((_k, f) => f, 'BUSINESS_PARTNER', 'short')).toBe('BP');
    expect(roleLabel((_k, f) => f, 'AGENT', 'short')).toBe('AG');
  });
});

describe('CSV tenant_name matches the table label in every locale (same helpers the page uses)', () => {
  const crm: TenantRow = {
    id: 'A', name: 'Tenant A', plan: 'pro', aiEnabled: true, createdAt: null, lastActivityAt: null,
    staff: { total: 1, active: 1, byRole: {} },
    endUsers: { activeInPeriod: 0, storedProfiles: 0, newProfilesInPeriod: 0 },
    activity: { sessions: 0, messages: 0, handoffs: 0 }, ai: null, known: true,
  };
  const u = (tenant_id: string | null): ProxyTenantUsage => ({
    tenant_id, input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, total_tokens: 2, cost_usd: 0,
    request_count: 1, error_count: 0, unpriced_count: 0, by_type: [], by_model: [],
  });
  const period = { from: '2026-11-01', to: '2026-11-30' };

  it.each(LOCALES)('%s', (locale) => {
    const ta = (key: string, fallback: string) => dictionaries[locale][key] ?? fallback;
    const labels = tenantLabelsFrom(ta);
    const rows = mergeTenantUsage([crm], [u('zzzzzzzz-1111'), u(null)]);
    const csv = buildBillingCsv(rows, period, (r) => tenantLabel(r, labels));
    const cells = csv.split('\r\n').slice(1).map((l) => l.split(',')[1]);
    expect(cells).toEqual(['Tenant A', `${dictionaries[locale].unknownTenant} (zzzzzzzz)`, dictionaries[locale].noTenant]);
    expect(cells.slice(1)).toEqual(rows.slice(1).map((r) => tenantLabel(r, labels))); // identical to the table's label
  });
});

describe('tenantLabelsFrom', () => {
  it('only the id dictionary says "Tanpa tenant" (the old server string no longer leaks into other locales)', () => {
    for (const l of LOCALES.filter((x) => x !== 'id')) expect(dictionaries[l].noTenant).not.toBe('Tanpa tenant');
  });

  it('reads the localized orphan labels from the dictionary of every locale', () => {
    for (const l of LOCALES) {
      const ta = (key: string, fallback: string) => dictionaries[l][key] ?? fallback;
      const labels = tenantLabelsFrom(ta);
      expect(labels.unknown).toBe(dictionaries[l].unknownTenant);
      expect(labels.none).toBe(dictionaries[l].noTenant);
    }
  });

  it('falls back to English when a key is missing', () => {
    expect(tenantLabelsFrom((_k, fallback) => fallback)).toEqual({ unknown: 'Unknown tenant', none: 'No tenant' });
  });
});
