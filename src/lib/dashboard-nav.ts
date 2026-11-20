// Locale-aware link helpers for the dashboard shell (sidebar, breadcrumb, user menu).
// Middleware redirects unprefixed paths using the NEXT_LOCALE cookie or Accept-Language, so a bare "/admin"
// can land on another language than the page the user is on. Links therefore carry the current locale.

/** Prefix an internal path with the locale: ('id', '/admin') -> '/id/admin'. */
export function localizedHref(lang: string, href: string): string {
  return `/${lang}${href}`;
}

/**
 * Whether `pathname` (as reported by usePathname(), locale included) is the nav entry `href` or a page below it.
 * Segment-aware: '/admin' matches '/en/admin' and '/en/admin/x' but not '/en/administrators', and never '/en/dashboard'.
 */
export function isNavActive(pathname: string | null | undefined, lang: string, href: string): boolean {
  if (!pathname) return false;
  const full = localizedHref(lang, href);
  return pathname === full || pathname.startsWith(full + '/');
}

/** The nav entry that owns `pathname`, or undefined. */
export function findActiveNavItem<T extends { href: string }>(
  items: readonly T[],
  pathname: string | null | undefined,
  lang: string
): T | undefined {
  return items.find((item) => isNavActive(pathname, lang, item.href));
}
