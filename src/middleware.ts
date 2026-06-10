import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const locales = ['en', 'id', 'zh', 'ko', 'th'];
const defaultLocale = 'en';

function getLocale(request: any) {
  // Check cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  // Check accept-language
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang) {
    if (acceptLang.includes('id')) return 'id';
    if (acceptLang.includes('zh')) return 'zh';
    if (acceptLang.includes('ko')) return 'ko';
    if (acceptLang.includes('th')) return 'th';
  }
  return defaultLocale;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => nextUrl.pathname.startsWith(`/${locale}/`) || nextUrl.pathname === `/${locale}`
  );

  // If missing locale, redirect to localized URL
  if (!pathnameHasLocale && !nextUrl.pathname.startsWith('/api') && !nextUrl.pathname.startsWith('/widget-ui')) {
    const locale = getLocale(req);
    return NextResponse.redirect(new URL(`/${locale}${nextUrl.pathname}${nextUrl.search}`, nextUrl));
  }

  // Get locale from path for auth checks
  const pathname = nextUrl.pathname;
  
  // Create a regex to match the locale prefix
  const localeRegex = new RegExp(`^/(${locales.join('|')})`);
  
  // Strip locale for auth checking logic
  const pathnameWithoutLocale = pathname.replace(localeRegex, '') || '/';

  const isAuthPage = pathnameWithoutLocale.startsWith('/login');
  const isProtectedRoute = 
    pathnameWithoutLocale.startsWith('/inbox') ||
    pathnameWithoutLocale.startsWith('/dashboard') ||
    pathnameWithoutLocale.startsWith('/agent') ||
    pathnameWithoutLocale.startsWith('/integration') ||
    pathnameWithoutLocale.startsWith('/settings');

  // Redirect logged-in users away from login page
  if (isAuthPage && isLoggedIn) {
    const locale = getLocale(req);
    return NextResponse.redirect(new URL(`/${locale}/inbox`, nextUrl));
  }

  // Redirect unauthenticated users to login page
  if (isProtectedRoute && !isLoggedIn) {
    const locale = getLocale(req);
    return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
  }

  // Inject tenant context into headers for downstream use
  const response = NextResponse.next();
  if (req.auth?.user?.tenantId) {
    response.headers.set('x-tenant-id', req.auth.user.tenantId);
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|widget.js).*)',
  ],
};
