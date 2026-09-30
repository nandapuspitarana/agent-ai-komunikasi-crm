import pkg from '../../package.json';
import { readManifest } from '@/lib/sdk-registry';

/**
 * Single source of truth for versions exposed to clients (GET /api/version and
 * the `version` block of POST /api/widget/init).
 *
 * Release checklist:
 *  - server release  -> set CRM_VERSION in .env (also the docker image tag in
 *                       docker-compose); package.json "version" is the fallback
 *  - API contract    -> bump API_VERSION (minor = additive, major = breaking)
 *  - SDK release     -> nothing to bump: the SDK archive is stamped with CRM_VERSION at
 *                       build time (scripts/build-sdk-package.js) and served from /api/pub;
 *                       the version in the SDK source is only the fallback
 *  - drop support for old SDKs -> raise SDK_MIN_SUPPORTED_VERSION
 */
export const APP_NAME = 'agent-komunikasi';
export const API_VERSION = '1.1.0';
export const SDK_MIN_SUPPORTED_VERSION = '1.0.0';

/**
 * Server version. Taken from CRM_VERSION (the variable docker-compose already
 * uses for the image tag, so tag and reported version cannot disagree) and read
 * on every call so it reflects the running container's environment. Falls back
 * to package.json when unset; "latest" (compose's default tag) is not a version
 * and is ignored. A leading "v" is dropped.
 */
export function getAppVersion(): string {
  const raw = (process.env.CRM_VERSION || '').trim().replace(/^v/i, '');
  if (raw && raw.toLowerCase() !== 'latest') return raw.slice(0, 40);
  return pkg.version;
}

/**
 * Newest SDK the server can hand out: the version of the archive built into
 * this deployment (which equals CRM_VERSION at build time), otherwise the CRM
 * version itself.
 */
export function getSdkLatestVersion(): string {
  return readManifest()?.version ?? getAppVersion();
}

/** `current` = latest (or newer), `outdated` = works but an update exists, `unsupported` = below the minimum, `unknown` = client did not say. */
export type SdkStatus = 'current' | 'outdated' | 'unsupported' | 'unknown';

/** Parses "1.2.3", "1.2.3+45" or "1.2.3-beta.1" into [1, 2, 3]. Suffixes are ignored. */
export function parseSemver(version: unknown): [number, number, number] | null {
  if (typeof version !== 'string') return null;
  const m = /^\s*v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Negative if a < b, 0 if equal, positive if a > b; null when either is not a version. */
export function compareSemver(a: unknown, b: unknown): number | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function getSdkStatus(clientVersion: unknown): SdkStatus {
  const vsMin = compareSemver(clientVersion, SDK_MIN_SUPPORTED_VERSION);
  const vsLatest = compareSemver(clientVersion, getSdkLatestVersion());
  if (vsMin === null || vsLatest === null) return 'unknown';
  if (vsMin < 0) return 'unsupported';
  return vsLatest < 0 ? 'outdated' : 'current';
}

export interface VersionInfo {
  name: string;
  version: string;
  apiVersion: string;
  commit: string | null;
  builtAt: string | null;
  sdk: {
    latest: string;
    minSupported: string;
    /** pub repository URL to depend on (null when no SDK is built into this deployment or the origin is unknown). */
    registry: string | null;
    /** Version the caller reported (`sdkVersion` / `?sdk=` / X-SDK-Version), if any. */
    client: string | null;
    status: SdkStatus;
    updateAvailable: boolean;
  };
}

/** Build metadata injected at image build time (see Dockerfile ARGs). */
function buildInfo() {
  // Runtime env wins; BUILD_* are inlined by next.config.js at build time (literal
  // property access is required for Next to replace them).
  const commit =
    process.env.APP_COMMIT || process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_COMMIT || '';
  const builtAt = process.env.APP_BUILT_AT || process.env.BUILD_TIME || '';
  return {
    commit: commit ? commit.slice(0, 12) : null,
    builtAt: builtAt || null,
  };
}

export function getVersionInfo(clientSdkVersion?: unknown, opts: { origin?: string } = {}): VersionInfo {
  const client = typeof clientSdkVersion === 'string' && clientSdkVersion.trim() ? clientSdkVersion.trim().slice(0, 40) : null;
  const status = getSdkStatus(client);
  return {
    name: APP_NAME,
    version: getAppVersion(),
    apiVersion: API_VERSION,
    ...buildInfo(),
    sdk: {
      latest: getSdkLatestVersion(),
      minSupported: SDK_MIN_SUPPORTED_VERSION,
      registry: opts.origin && readManifest() ? `${opts.origin}/api/pub` : null,
      client,
      status,
      updateAvailable: status === 'outdated' || status === 'unsupported',
    },
  };
}
