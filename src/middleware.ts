import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Basic tenant detection logic
  // In a real SaaS, this would come from a subdomain, custom domain, or session
  const tenantId = request.headers.get('x-tenant-id') || request.cookies.get('tenant_id')?.value;

  // Protect dashboard routes
  if (url.pathname.startsWith('/inbox') || url.pathname.startsWith('/flow-builder') || url.pathname.startsWith('/settings')) {
    if (!tenantId) {
      // For now, if no tenant is found, we might want to redirect to a generic login or error
      // But for development, we'll allow it or set a default
      console.warn('No tenant_id found in request to', url.pathname);
    }
  }

  const response = NextResponse.next();
  
  // Inject tenant context into headers for downstream use
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
