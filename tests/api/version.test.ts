import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const findUnique = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { tenant: { findUnique } } }));

import {
  APP_VERSION,
  API_VERSION,
  SDK_LATEST_VERSION,
  SDK_MIN_SUPPORTED_VERSION,
  compareSemver,
  parseSemver,
  getSdkStatus,
  getVersionInfo,
} from '@/lib/version';
import { GET as versionGet } from '@/app/api/version/route';
import { POST as initPost } from '@/app/api/widget/init/route';

const root = path.resolve(__dirname, '../..');

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
    expect(getSdkStatus(SDK_LATEST_VERSION)).toBe('current');
    expect(getSdkStatus('99.0.0')).toBe('current'); // ahead of the server's knowledge
    expect(getSdkStatus(SDK_MIN_SUPPORTED_VERSION)).toBe(
      compareSemver(SDK_MIN_SUPPORTED_VERSION, SDK_LATEST_VERSION)! < 0 ? 'outdated' : 'current'
    );
    expect(getSdkStatus('0.0.1')).toBe('unsupported');
    expect(getSdkStatus(undefined)).toBe('unknown');
    expect(getSdkStatus('not-a-version')).toBe('unknown');
  });
});

describe('release consistency (fails when versions drift)', () => {
  const sdkPubspec = fs.readFileSync(path.join(root, 'packages/flutter_ai_agent_sdk/pubspec.yaml'), 'utf8');
  const sdkDart = fs.readFileSync(path.join(root, 'packages/flutter_ai_agent_sdk/lib/src/version.dart'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  it('TEST-AI-V04 SDK pubspec, Dart constant and SDK_LATEST_VERSION are the same version', () => {
    const pubspecVersion = /^version:\s*(\S+)/m.exec(sdkPubspec)![1];
    const dartVersion = /aiAgentSdkVersion\s*=\s*'([^']+)'/.exec(sdkDart)![1];
    expect(dartVersion).toBe(pubspecVersion);
    expect(SDK_LATEST_VERSION).toBe(pubspecVersion);
  });

  it('TEST-AI-V05 APP_VERSION follows package.json and the lockfile root', () => {
    expect(APP_VERSION).toBe(pkg.version);
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
  });

  it('minimum supported SDK is never newer than the latest', () => {
    expect(compareSemver(SDK_MIN_SUPPORTED_VERSION, SDK_LATEST_VERSION)!).toBeLessThanOrEqual(0);
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
      version: APP_VERSION,
      apiVersion: API_VERSION,
      sdk: { latest: SDK_LATEST_VERSION, minSupported: SDK_MIN_SUPPORTED_VERSION, client: null, status: 'unknown', updateAvailable: false },
    });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('x-app-version')).toBe(APP_VERSION);
    expect(res.headers.get('x-api-version')).toBe(API_VERSION);
  });

  it('TEST-AI-V07 reports whether the calling SDK is current (?sdk= or X-SDK-Version)', async () => {
    const current = await (await versionGet(new Request(`http://localhost/api/version?sdk=${SDK_LATEST_VERSION}`))).json();
    expect(current.sdk).toMatchObject({ client: SDK_LATEST_VERSION, status: 'current', updateAvailable: false });

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
    expect(json.version).toMatchObject({ version: APP_VERSION, apiVersion: API_VERSION });
    expect(json.version.sdk).toMatchObject({ client: '0.0.1', status: 'unsupported', updateAvailable: true });
  });

  it('older SDK builds that send no version still work (status unknown)', async () => {
    const res = await init({ tenantId: 't1' });
    expect(res.status).toBe(200);
    expect((await res.json()).version.sdk).toMatchObject({ client: null, status: 'unknown' });
  });
});
