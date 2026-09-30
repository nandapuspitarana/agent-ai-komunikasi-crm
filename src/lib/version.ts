import pkg from '../../package.json';

/**
 * Single source of truth for versions exposed to clients (GET /api/version and
 * the `version` block of POST /api/widget/init).
 *
 * Release checklist:
 *  - server release  -> bump "version" in package.json
 *  - API contract    -> bump API_VERSION (minor = additive, major = breaking)
 *  - new SDK release -> bump SDK_LATEST_VERSION together with
 *                       packages/flutter_ai_agent_sdk/pubspec.yaml and
 *                       lib/src/version.dart (tests/api/version.test.ts fails if they drift)
 *  - drop support for old SDKs -> raise SDK_MIN_SUPPORTED_VERSION
 */
export const APP_NAME = 'agent-komunikasi';
export const APP_VERSION: string = pkg.version;
export const API_VERSION = '1.1.0';
export const SDK_LATEST_VERSION = '1.1.0';
export const SDK_MIN_SUPPORTED_VERSION = '1.0.0';

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
  const vsLatest = compareSemver(clientVersion, SDK_LATEST_VERSION);
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
    /** Version the caller reported (`sdkVersion` / `?sdk=` / X-SDK-Version), if any. */
    client: string | null;
    status: SdkStatus;
    updateAvailable: boolean;
  };
}

/** Build metadata injected at image build time (see Dockerfile ARGs). */
function buildInfo() {
  const commit = process.env.APP_COMMIT || process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || '';
  const builtAt = process.env.APP_BUILT_AT || '';
  return {
    commit: commit ? commit.slice(0, 12) : null,
    builtAt: builtAt || null,
  };
}

export function getVersionInfo(clientSdkVersion?: unknown): VersionInfo {
  const client = typeof clientSdkVersion === 'string' && clientSdkVersion.trim() ? clientSdkVersion.trim().slice(0, 40) : null;
  const status = getSdkStatus(client);
  return {
    name: APP_NAME,
    version: APP_VERSION,
    apiVersion: API_VERSION,
    ...buildInfo(),
    sdk: {
      latest: SDK_LATEST_VERSION,
      minSupported: SDK_MIN_SUPPORTED_VERSION,
      client,
      status,
      updateAvailable: status === 'outdated' || status === 'unsupported',
    },
  };
}
