import { NextResponse } from 'next/server';
import { getVersionInfo, getAppVersion, API_VERSION } from '@/lib/version';
import { publicOrigin } from '@/lib/sdk-registry';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * GET /api/version[?sdk=1.0.0]
 *
 * Public, unauthenticated, no tenant data. Lets any client (mobile SDK, web
 * widget, monitoring) read the server/API/SDK versions and, when it reports its
 * own SDK version, whether that SDK is current, outdated or unsupported.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientSdk = searchParams.get('sdk') || request.headers.get('x-sdk-version');

  return NextResponse.json(getVersionInfo(clientSdk, { origin: publicOrigin(request) }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'X-App-Version': getAppVersion(),
      'X-API-Version': API_VERSION,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
