import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { errorCodeOf, errorMessageFor, tenantLabelsFrom } from '@/components/admin/shared';

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

  it('carries every key the error mapping and orphan labels point at', () => {
    const keys = ['errPeriodIncomplete', 'errPeriodInvalid', 'errPeriodOrder', 'errPeriodTooLong', 'errServerTimezone', 'errGeneric', 'unknownTenant', 'noTenant', 'unknownModel'];
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
