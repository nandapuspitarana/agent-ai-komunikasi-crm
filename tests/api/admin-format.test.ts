import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  TREND_WEEKLY_ABOVE_DAYS,
  bucketUsage,
  formatCost,
  unpricedHint,
  type AdminDayUsage,
} from '@/components/admin/shared';

describe('formatCost', () => {
  it('keeps 2 decimals for normal values', () => {
    expect(formatCost(0, 'en')).toBe('$0.00');
    expect(formatCost(0.01, 'en')).toBe('$0.01');
    expect(formatCost(0.5, 'en')).toBe('$0.50');
    expect(formatCost(41.274, 'en')).toBe('$41.27');
    expect(formatCost(1234.5, 'en')).toBe('$1,234.50');
  });

  it('never shows a positive sub-cent amount as zero', () => {
    expect(formatCost(0.003, 'en')).toBe('$0.003');
    expect(formatCost(0.0034, 'en')).toBe('$0.0034');
    expect(formatCost(0.00996, 'en')).toBe('$0.01');
    expect(formatCost(0.0001, 'en')).toBe('$0.0001');
    expect(formatCost(0.00006, 'en')).toBe('$0.0001');
  });

  it('shows "<$0.0001" below the 4-decimal resolution', () => {
    expect(formatCost(0.00004, 'en')).toBe('<$0.0001');
    expect(formatCost(0.000001, 'en')).toBe('<$0.0001');
  });

  it('follows the locale separators', () => {
    expect(formatCost(0.0034, 'id')).toBe('$0,0034');
    expect(formatCost(1234.5, 'id')).toBe('$1.234,50');
  });
});

describe('unpricedHint', () => {
  it('fills the count into the localized hint', () => {
    const ta = (_key: string, fallback: string) => fallback;
    expect(unpricedHint(ta, 1234, 'en')).toBe('1,234 calls without a price — cost not included');
  });
});

describe('bucketUsage', () => {
  const dayList = (n: number, tokens = 10): AdminDayUsage[] =>
    Array.from({ length: n }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      total_tokens: tokens,
      cost_usd: 0.5,
      request_count: 2,
    }));

  it('keeps one bar per day up to the threshold', () => {
    const { weekly, buckets } = bucketUsage(dayList(TREND_WEEKLY_ABOVE_DAYS));
    expect(weekly).toBe(false);
    expect(buckets).toHaveLength(TREND_WEEKLY_ABOVE_DAYS);
    expect(buckets[0]).toEqual({ from: '2026-01-01', to: '2026-01-01', days: 1, total_tokens: 10, cost_usd: 0.5, request_count: 2 });
  });

  it('switches to weekly totals above the threshold, counted from the first day', () => {
    const { weekly, buckets } = bucketUsage(dayList(TREND_WEEKLY_ABOVE_DAYS + 1));
    expect(weekly).toBe(true);
    expect(buckets[0]).toEqual({ from: '2026-01-01', to: '2026-01-07', days: 7, total_tokens: 70, cost_usd: 3.5, request_count: 14 });
    expect(buckets[1].from).toBe('2026-01-08');
  });

  it('keeps a 400-day range within 58 bars, so bars plus 2px spacing fit a phone card', () => {
    const days = dayList(400);
    const { buckets } = bucketUsage(days);
    expect(buckets).toHaveLength(Math.ceil(400 / 7));
    expect(buckets.length * 2).toBeLessThan(200);
    // Nothing is lost or double counted, and the last bucket is the shorter remainder.
    expect(buckets.reduce((s, b) => s + b.total_tokens, 0)).toBe(4000);
    expect(buckets[buckets.length - 1].to).toBe(days[399].date);
    expect(buckets[buckets.length - 1].total_tokens).toBe(10 * (400 % 7));
    expect(buckets[buckets.length - 1].days).toBe(400 % 7);
    expect(buckets[0].days).toBe(7);
  });

  it('handles an empty range', () => {
    expect(bucketUsage([])).toEqual({ weekly: false, buckets: [] });
  });
});

describe('sidebar menu dictionary keys', () => {
  const LOCALES = ['en', 'id', 'ko', 'th', 'zh'] as const;
  const sidebar = (l: string): Record<string, string> =>
    JSON.parse(readFileSync(path.resolve(__dirname, '../../src/dictionaries', `${l}.json`), 'utf-8')).sidebar;

  it.each(LOCALES)('%s has non-empty openMenu/closeMenu/language and the same sidebar keys as en', (l) => {
    expect(sidebar(l).language?.trim()).toBeTruthy();
    expect(sidebar(l).openMenu?.trim()).toBeTruthy();
    expect(sidebar(l).closeMenu?.trim()).toBeTruthy();
    expect(Object.keys(sidebar(l)).sort()).toEqual(Object.keys(sidebar('en')).sort());
  });

  it.each(['id', 'ko', 'th', 'zh'] as const)('%s translates the menu labels', (l) => {
    expect(sidebar(l).openMenu).not.toBe(sidebar('en').openMenu);
    expect(sidebar(l).closeMenu).not.toBe(sidebar('en').closeMenu);
    expect(sidebar(l).language).not.toBe(sidebar('en').language);
  });
});
