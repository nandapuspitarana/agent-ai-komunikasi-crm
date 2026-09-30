import { NextResponse } from 'next/server';
import { checkRegistryAuth, publicOrigin, pubError, readManifest, SDK_PACKAGE_NAME } from '@/lib/sdk-registry';

/** GET /api/pub/api/packages/<name> - pub repository spec v2 package listing. */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const denied = checkRegistryAuth(request);
  if (denied) return denied;

  const { name } = await params;
  const manifest = readManifest();
  if (name !== SDK_PACKAGE_NAME || !manifest) {
    return pubError(404, 'NotFound', `Package "${name}" is not available on this server.`);
  }

  const version = {
    version: manifest.version,
    archive_url: `${publicOrigin(request)}/api/pub/packages/${manifest.name}/versions/${manifest.version}.tar.gz`,
    archive_sha256: manifest.sha256,
    pubspec: manifest.pubspec,
  };

  return new NextResponse(JSON.stringify({ name: manifest.name, isDiscontinued: false, latest: version, versions: [version] }), {
    status: 200,
    headers: { 'Content-Type': 'application/vnd.pub.v2+json', 'Cache-Control': 'no-store' },
  });
}
