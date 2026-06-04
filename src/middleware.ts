import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthPage = nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = 
    nextUrl.pathname.startsWith('/inbox') ||
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/agent') ||
    nextUrl.pathname.startsWith('/settings');

  // Redirect logged-in users away from login page
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/inbox', nextUrl));
  }

  // Redirect unauthenticated users to login page
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
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
