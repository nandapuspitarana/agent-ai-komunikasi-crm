import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const findUnique = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { tenant: { findUnique } } }));

import {
  getAppVersion,
  API_VERSION,
  getSdkLatestVersion,
  SDK_MIN_SUPPORTED_VERSION,
  compareSemver,
  parseSemver,
  getSdkStatus,
  getVersionInfo,
} from '@/lib/version';
import { GET as versionGet } from '@/app/api/version/route';
import { POST as initPost } from '@/app/api/widget/init/route';

const root = path.resolve(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// CRM_VERSION may be set in the developer's shell / CI; every test starts without it.
const ORIGINAL_CRM_VERSION = process.env.CRM_VERSION;
const ORIGINAL_SDK_DIST_DIR = process.env.SDK_DIST_DIR;
beforeEach(() => {
  delete process.env.CRM_VERSION;
  process.env.SDK_DIST_DIR = path.join(root, 'tests', '__no_sdk_dist__'); // no SDK built into "this deployment"
});
afterEach(() => {
  if (ORIGINAL_CRM_VERSION === undefined) delete process.env.CRM_VERSION;
  else process.env.CRM_VERSION = ORIGINAL_CRM_VERSION;
  if (ORIGINAL_SDK_DIST_DIR === undefined) delete process.env.SDK_DIST_DIR;
  else process.env.SDK_DIST_DIR = ORIGINAL_SDK_DIST_DIR;
});

describe('semver helpers', () => {
  it('TEST-AI-V01 parses release, build-number and pre-release suffixes; rejects junk', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('v1.2.3+45')).toEqual([1, 2, 3]);
    expect(parseSemver('1.2.3-beta.1')).toEqual([1, 2, 3]);
    for (const bad of ['', 'abc', '1.2', null, undefined, 12, {}]) expect(parseSemver(bad)).toBeNull();
  });

  it('TEST-AI-V02 compares numerically, not lexically (1.10.0 > 1.9.0)', () => {
    expect(compareSemver('1.10.0', '1.9.0')!).toBeGreaterThan(0);
    expect(compareSemver('1.0.9', '1.1.0')!).toBeLessThan(0);
    expect(compareSemver('2.0.0', '1.99.99')!).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.1.0+7')).toBe(0);
    expect(compareSemver('x', '1.0.0')).toBeNull();
  });
});

describe('getSdkStatus', () => {
  it('TEST-AI-V03 maps client versions to current / outdated / unsupported / unknown', () => {
    expect(getSdkStatus(getSdkLatestVersion())).toBe('current');
    expect(getSdkStatus('99.0.0')).toBe('current'); // ahead of the server's knowledge
    expect(getSdkStatus(SDK_MIN_SUPPORTED_VERSION)).toBe(
      compareSemver(SDK_MIN_SUPPORTED_VERSION, getSdkLatestVersion())! < 0 ? 'outdated' : 'current'
    );
    expect(getSdkStatus('0.0.1')).toBe('unsupported');
    expect(getSdkStatus(undefined)).toBe('unknown');
    expect(getSdkStatus('not-a-version')).toBe('unknown');
  });
});

describe('release consistency (fails when versions drift)', () => {
  const sdkPubspec = fs.readFileSync(path.join(root, 'packages/flutter_ai_agent_sdk/pubspec.yaml'), 'utf8');
  const sdkDart = fs.readFileSync(path.join(root, 'packages/flutter_ai_agent_sdk/lib/src/version.dart'), 'utf8');

  it('TEST-AI-V04 SDK source: pubspec version equals the Dart constant (releases are stamped with CRM_VERSION)', () => {
    const pubspecVersion = /^version:\s*(\S+)/m.exec(sdkPubspec)![1];
    const dartVersion = /aiAgentSdkVersion\s*=\s*'([^']+)'/.exec(sdkDart)![1];
    expect(dartVersion).toBe(pubspecVersion);
  });

  it('TEST-AI-V05 without CRM_VERSION the server version falls back to package.json (and the lockfile root matches)', () => {
    expect(getAppVersion()).toBe(pkg.version);
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
  });

  it('minimum supported SDK is never newer than the latest', () => {
    expect(compareSemver(SDK_MIN_SUPPORTED_VERSION, getSdkLatestVersion())!).toBeLessThanOrEqual(0);
  });
});

describe('server version from CRM_VERSION', () => {
  it('TEST-AI-V19 CRM_VERSION wins over package.json, is trimmed and loses a leading v', () => {
    process.env.CRM_VERSION = '2.3.4';
    expect(getAppVersion()).toBe('2.3.4');
    process.env.CRM_VERSION = '  v2.3.5-rc1 ';
    expect(getAppVersion()).toBe('2.3.5-rc1');
  });

  it('TEST-AI-V20 "latest" (docker-compose default) and blank values are ignored', () => {
    for (const v of ['latest', 'LATEST', '', '   ']) {
      process.env.CRM_VERSION = v;
      expect(getAppVersion()).toBe(pkg.version);
    }
  });

  it('TEST-AI-V21 /api/version, its header and /widget/init all report CRM_VERSION, read at request time', async () => {
    findUnique.mockResolvedValue({
      id: 't1', name: 'X', themeBrandColor: null, themeBrandLogo: null, botAvatarUrl: null, visitorConfig: {}, activeFlow: null, flows: [],
    });

    process.env.CRM_VERSION = '3.1.4';
    const res = await versionGet(new Request('http://localhost/api/version'));
    expect((await res.json()).version).toBe('3.1.4');
    expect(res.headers.get('x-app-version')).toBe('3.1.4');

    const init = await (await initPost(new Request('http://localhost/api/widget/init', { method: 'POST', body: JSON.stringify({ tenantId: 't1' }) }))).json();
    expect(init.version.version).toBe('3.1.4');

    process.env.CRM_VERSION = '3.1.5'; // changed after import: no restart of the module needed
    expect((await (await versionGet(new Request('http://localhost/api/version'))).json()).version).toBe('3.1.5');
  });
});

describe('GET /api/version', () => {
  const OLD_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('TEST-AI-V06 returns server, api and sdk versions; not cacheable; CORS open', async () => {
    const res = await versionGet(new Request('http://localhost/api/version'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      name: 'agent-komunikasi',
      version: getAppVersion(),
      apiVersion: API_VERSION,
      sdk: { latest: getSdkLatestVersion(), minSupported: SDK_MIN_SUPPORTED_VERSION, client: null, status: 'unknown', updateAvailable: false, registry: null },
    });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('x-app-version')).toBe(getAppVersion());
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('TEST-AI-V07 reports whether the calling SDK is current (?sdk= or X-SDK-Version)', async () => {
    const current = await (await versionGet(new Request(`http://localhost/api/version?sdk=${getSdkLatestVersion()}`))).json();
    expect(current.sdk).toMatchObject({ client: getSdkLatestVersion(), status: 'current', updateAvailable: false });

    const old = await (await versionGet(new Request('http://localhost/api/version', { headers: { 'x-sdk-version': '0.0.1' } }))).json();
    expect(old.sdk).toMatchObject({ client: '0.0.1', status: 'unsupported', updateAvailable: true });
  });

  it('TEST-AI-V08 exposes build commit / time when provided by the build, otherwise null', async () => {
    delete process.env.APP_COMMIT;
    delete process.env.GIT_COMMIT;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.APP_BUILT_AT;
    expect(getVersionInfo()).toMatchObject({ commit: null, builtAt: null });

    process.env.APP_COMMIT = 'abcdef1234567890abcdef';
    process.env.APP_BUILT_AT = '2026-09-30T10:00:00Z';
    expect(getVersionInfo()).toMatchObject({ commit: 'abcdef123456', builtAt: '2026-09-30T10:00:00Z' });
  });

  it('TEST-AI-V22 build-time BUILD_COMMIT / BUILD_TIME are the fallback; runtime APP_* wins', () => {
    for (const k of ['APP_COMMIT', 'GIT_COMMIT', 'VERCEL_GIT_COMMIT_SHA', 'APP_BUILT_AT']) delete process.env[k];
    process.env.BUILD_COMMIT = 'buildcommit123456789';
    process.env.BUILD_TIME = '2026-10-01T08:00:00.000Z';
    expect(getVersionInfo()).toMatchObject({ commit: 'buildcommit1', builtAt: '2026-10-01T08:00:00.000Z' });

    process.env.APP_COMMIT = 'runtimecommit99';
    process.env.APP_BUILT_AT = '2026-10-02T09:00:00.000Z';
    expect(getVersionInfo()).toMatchObject({ commit: 'runtimecommi', builtAt: '2026-10-02T09:00:00.000Z' });

    delete process.env.BUILD_COMMIT;
    delete process.env.BUILD_TIME;
  });

  it('caps and trims a hostile ?sdk= value', () => {
    const info = getVersionInfo('  ' + 'x'.repeat(500) + '  ');
    expect(info.sdk.client!.length).toBeLessThanOrEqual(40);
    expect(info.sdk.status).toBe('unknown');
  });
});

describe('POST /api/widget/init version block', () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue({
      id: 't1', name: 'CEOSUITE', themeBrandColor: null, themeBrandLogo: null, botAvatarUrl: null,
      visitorConfig: {}, activeFlow: null, flows: [],
    });
  });

  const init = (body: object) => initPost(new Request('http://localhost/api/widget/init', { method: 'POST', body: JSON.stringify(body) }));

  it('TEST-AI-V09 includes version info and the caller SDK status', async () => {
    const json = await (await init({ tenantId: 't1', sdkVersion: '0.0.1' })).json();
    expect(json.version).toMatchObject({ version: getAppVersion(), apiVersion: API_VERSION });
    expect(json.version.sdk).toMatchObject({ client: '0.0.1', status: 'unsupported', updateAvailable: true });
  });

  it('older SDK builds that send no version still work (status unknown)', async () => {
    const res = await init({ tenantId: 't1' });
    expect(res.status).toBe(200);
    expect((await res.json()).version.sdk).toMatchObject({ client: null, status: 'unknown' });
  });
});
