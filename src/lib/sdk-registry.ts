import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Minimal pub repository (https://github.com/dart-lang/pub/blob/master/doc/repository-spec-v2.md)
 * that serves the Flutter SDK built by scripts/build-sdk-package.js, so apps can
 * depend on it as
 *
 *   flutter_ai_agent_sdk:
 *     hosted: { name: flutter_ai_agent_sdk, url: https://<crm-host>/api/pub }
 *     version: ^1.0.24
 *
 * The archive is stamped with CRM_VERSION at build time, so SDK and CRM share a
 * version number. Closed by default: requests need `Authorization: Bearer
 * $SDK_REGISTRY_TOKEN`; without that variable the registry answers 503.
 */
export const SDK_PACKAGE_NAME = 'flutter_ai_agent_sdk';

export interface SdkManifest {
  name: string;
  version: string;
  file: string;
  sha256: string;
  size: number;
  builtAt: string;
  pubspec: Record<string, unknown>;
}

export function distDir(): string {
  return process.env.SDK_DIST_DIR || path.join(process.cwd(), 'sdk-dist');
}

export function readManifest(): SdkManifest | null {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(distDir(), 'manifest.json'), 'utf8'));
    if (m && typeof m.version === 'string' && typeof m.file === 'string' && typeof m.sha256 === 'string' && m.pubspec) {
      return m as SdkManifest;
    }
  } catch {
    // no SDK built into this deployment
  }
  return null;
}

export function readArchive(manifest: SdkManifest): Buffer | null {
  try {
    // manifest.file is written by our build script, but never trust a path blindly
    return fs.readFileSync(path.join(distDir(), path.basename(manifest.file)));
  } catch {
    return null;
  }
}

export function pubError(status: number, code: string, message: string, extra: Record<string, string> = {}) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

/** Returns an error response when the caller may not use the registry, otherwise null. */
export function checkRegistryAuth(request: Request): NextResponse | null {
  const token = process.env.SDK_REGISTRY_TOKEN;
  if (!token) {
    return pubError(503, 'RegistryDisabled', 'SDK registry is not configured on this server (SDK_REGISTRY_TOKEN is not set).');
  }
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  const provided = match ? match[1].trim() : '';
  // hash both sides so lengths match and the comparison is constant-time
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(token).digest();
  if (!provided || !crypto.timingSafeEqual(a, b)) {
    return pubError(401, 'Unauthorized', 'A valid registry token is required.', { 'WWW-Authenticate': 'Bearer realm="sdk-registry"' });
  }
  return null;
}

/** External origin of this server (works behind Cloudflare / a reverse proxy). */
export function publicOrigin(request: Request): string {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || url.host;
  return `${proto}://${host}`;
}
