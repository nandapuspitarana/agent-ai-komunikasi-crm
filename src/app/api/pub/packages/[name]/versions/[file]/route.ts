import { NextResponse } from 'next/server';
import { checkRegistryAuth, pubError, readArchive, readManifest, SDK_PACKAGE_NAME } from '@/lib/sdk-registry';

/** GET /api/pub/packages/<name>/versions/<version>.tar.gz - the package archive. */
export async function GET(request: Request, { params }: { params: Promise<{ name: string; file: string }> }) {
  const denied = checkRegistryAuth(request);
  if (denied) return denied;

  const { name, file } = await params;
  const manifest = readManifest();
  if (name !== SDK_PACKAGE_NAME || !manifest || file !== `${manifest.version}.tar.gz`) {
    return pubError(404, 'NotFound', `Version "${file}" of "${name}" is not available on this server.`);
  }

  const archive = readArchive(manifest);
  if (!archive) return pubError(404, 'NotFound', 'The SDK archive is missing on this server.');

  return new NextResponse(new Uint8Array(archive), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(archive.length),
      'Cache-Control': 'private, max-age=60',
      ETag: `"${manifest.sha256}"`,
    },
  });
}
