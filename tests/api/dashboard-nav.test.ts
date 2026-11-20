import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { findActiveNavItem, isNavActive, localizedHref } from '@/lib/dashboard-nav';

const LOCALES = ['en', 'id', 'zh', 'ko', 'th'];

describe('localizedHref', () => {
  it('prefixes the path with the locale', () => {
    expect(localizedHref('id', '/admin')).toBe('/id/admin');
    expect(localizedHref('en', '/dashboard')).toBe('/en/dashboard');
    for (const l of LOCALES) expect(localizedHref(l, '/settings')).toBe(`/${l}/settings`);
  });
});

describe('isNavActive', () => {
  it('matches the exact page and pages below it, in the same locale', () => {
    expect(isNavActive('/id/admin', 'id', '/admin')).toBe(true);
    expect(isNavActive('/ko/inbox/abc123', 'ko', '/inbox')).toBe(true);
  });

  it('does not match a different locale prefix or an unprefixed path', () => {
    expect(isNavActive('/en/admin', 'id', '/admin')).toBe(false);
    expect(isNavActive('/admin', 'en', '/admin')).toBe(false);
  });

  it('is segment-aware: /admin does not match /administrators, nor the dashboard root', () => {
    expect(isNavActive('/en/administrators', 'en', '/admin')).toBe(false);
    expect(isNavActive('/en/dashboard', 'en', '/admin')).toBe(false);
    expect(isNavActive('/en/admin', 'en', '/dashboard')).toBe(false);
  });

  it('handles a missing pathname', () => {
    expect(isNavActive(null, 'en', '/admin')).toBe(false);
    expect(isNavActive(undefined, 'en', '/admin')).toBe(false);
  });
});

describe('findActiveNavItem', () => {
  const items = [{ href: '/dashboard' }, { href: '/inbox' }, { href: '/admin' }];
  it('returns the owning entry for a localized pathname', () => {
    expect(findActiveNavItem(items, '/th/admin', 'th')).toEqual({ href: '/admin' });
    expect(findActiveNavItem(items, '/th/inbox/1', 'th')).toEqual({ href: '/inbox' });
  });
  it('returns undefined when nothing matches', () => {
    expect(findActiveNavItem(items, '/th/unknown', 'th')).toBeUndefined();
    expect(findActiveNavItem(items, '/en/admin', 'th')).toBeUndefined();
  });
});

describe('dashboard shell wiring', () => {
  const read = (rel: string) => readFileSync(path.resolve(__dirname, '../../', rel), 'utf8');
  it('layout and user menu build their links through localizedHref', () => {
    const layout = read('src/app/[lang]/(dashboard)/layout.tsx');
    expect(layout).toMatch(/href=\{localizedHref\(locale, href\)\}/);
    expect(layout).toMatch(/isNavActive\(pathname, locale, href\)/);
    expect(layout).toMatch(/findActiveNavItem\(NAV_ITEMS, pathname, locale\)/);
    const menu = read('src/components/UserMenu.tsx');
    expect(menu).toMatch(/href=\{localizedHref\(locale, '\/settings'\)\}/);
  });
});
