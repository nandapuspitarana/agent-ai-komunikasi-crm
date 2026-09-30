import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { readTarGz } from './helpers/tar';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildSdkPackage } = require('../../scripts/build-sdk-package.js');

import { GET as listPackage } from '@/app/api/pub/api/packages/[name]/route';
import { GET as downloadArchive } from '@/app/api/pub/packages/[name]/versions/[file]/route';
import { GET as versionGet } from '@/app/api/version/route';
import { readArchive, publicOrigin } from '@/lib/sdk-registry';
import { getSdkLatestVersion } from '@/lib/version';

const TOKEN = 'test-registry-token-123';
const BASE = 'https://crm.example.com';
let dist: string;
let manifest: { version: string; sha256: string; file: string };

beforeAll(() => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-registry-'));
  manifest = buildSdkPackage({
    srcDir: path.resolve(__dirname, '../../packages/flutter_ai_agent_sdk'),
    outDir: dist,
    crmVersion: '2.5.1',
  });
});
afterAll(() => fs.rmSync(dist, { recursive: true, force: true }));

const ENV_KEYS = ['SDK_DIST_DIR', 'SDK_REGISTRY_TOKEN', 'PUBLIC_BASE_URL', 'CRM_VERSION'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.SDK_DIST_DIR = dist;
  process.env.SDK_REGISTRY_TOKEN = TOKEN;
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.CRM_VERSION;
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const auth = (token = TOKEN) => ({ authorization: `Bearer ${token}` });
const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });
const list = (name = 'flutter_ai_agent_sdk', headers: Record<string, string> = auth()) =>
  listPackage(req(`${BASE}/api/pub/api/packages/${name}`, headers), { params: Promise.resolve({ name }) });
const download = (file: string, name = 'flutter_ai_agent_sdk', headers: Record<string, string> = auth()) =>
  downloadArchive(req(`${BASE}/api/pub/packages/${name}/versions/${file}`, headers), { params: Promise.resolve({ name, file }) });

describe('pub registry: access control', () => {
  it('TEST-AI-S10 disabled (503) when SDK_REGISTRY_TOKEN is not configured - closed by default', async () => {
    delete process.env.SDK_REGISTRY_TOKEN;
    expect((await list()).status).toBe(503);
    expect((await download('2.5.1.tar.gz')).status).toBe(503);
  });

  it('TEST-AI-S11 401 with a WWW-Authenticate hint for a missing, malformed or wrong token', async () => {
    for (const headers of [{}, { authorization: 'Basic abc' }, auth('wrong'), { authorization: 'Bearer ' }]) {
      const r = await list('flutter_ai_agent_sdk', headers);
      expect(r.status).toBe(401);
      expect(r.headers.get('www-authenticate')).toContain('Bearer');
    }
    expect((await download('2.5.1.tar.gz', 'flutter_ai_agent_sdk', auth('wrong'))).status).toBe(401);
  });

  it('a token that is only a prefix / superset of the real one is rejected', async () => {
    expect((await list('flutter_ai_agent_sdk', auth(TOKEN.slice(0, -1)))).status).toBe(401);
    expect((await list('flutter_ai_agent_sdk', auth(TOKEN + 'x'))).status).toBe(401);
  });
});

describe('pub registry: package listing (repository spec v2)', () => {
  it('TEST-AI-S12 lists the SDK at the CRM version with archive url, sha256 and pubspec', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/vnd.pub.v2+json');

    const json = await res.json();
    expect(json.name).toBe('flutter_ai_agent_sdk');
    expect(json.latest.version).toBe('2.5.1');
    expect(json.versions.map((v: { version: string }) => v.version)).toEqual(['2.5.1']);
    expect(json.latest.archive_sha256).toBe(manifest.sha256);
    expect(json.latest.pubspec).toMatchObject({ name: 'flutter_ai_agent_sdk', version: '2.5.1' });
    expect(json.latest.archive_url).toBe(`${BASE}/api/pub/packages/flutter_ai_agent_sdk/versions/2.5.1.tar.gz`);
  });

  it('TEST-AI-S13 archive_url uses the external origin behind a proxy, or PUBLIC_BASE_URL when set', async () => {
    const proxied = await (await list('flutter_ai_agent_sdk', { ...auth(), 'x-forwarded-proto': 'https', 'x-forwarded-host': 'cb242.ceosuite.com' })).json();
    expect(proxied.latest.archive_url).toBe('https://cb242.ceosuite.com/api/pub/packages/flutter_ai_agent_sdk/versions/2.5.1.tar.gz');

    process.env.PUBLIC_BASE_URL = 'https://fixed.example.com/';
    const fixed = await (await list('flutter_ai_agent_sdk', { ...auth(), 'x-forwarded-host': 'ignored.example.com' })).json();
    expect(fixed.latest.archive_url.startsWith('https://fixed.example.com/api/pub/')).toBe(true);
    expect(publicOrigin(req('http://internal:8201/x'))).toBe('https://fixed.example.com');
  });

  it('404 for other packages and when no SDK is built into this deployment', async () => {
    expect((await list('some_other_package')).status).toBe(404);
    process.env.SDK_DIST_DIR = path.join(dist, 'missing');
    expect((await list()).status).toBe(404);
  });
});

describe('pub registry: archive download', () => {
  it('TEST-AI-S14 serves bytes whose sha256 matches the listing, and they unpack to the stamped SDK', async () => {
    const res = await download('2.5.1.tar.gz');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');

    const bytes = Buffer.from(await res.arrayBuffer());
    expect(Number(res.headers.get('content-length'))).toBe(bytes.length);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe((await (await list()).json()).latest.archive_sha256);

    const entries = readTarGz(bytes);
    expect(entries.find((e) => e.name === 'pubspec.yaml')!.data.toString()).toMatch(/^version: 2\.5\.1$/m);
    expect(entries.find((e) => e.name === 'lib/src/version.dart')!.data.toString()).toContain("'2.5.1'");
  });

  it('TEST-AI-S15 404 for a version that is not built here, another package, or a crafted file name', async () => {
    expect((await download('9.9.9.tar.gz')).status).toBe(404);
    expect((await download('2.5.1.tar.gz', 'other')).status).toBe(404);
    expect((await download('../manifest.json')).status).toBe(404);
    expect((await download('2.5.1.zip')).status).toBe(404);
  });

  it('a manifest pointing outside the dist folder cannot be used to read other files', () => {
    const evil = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-evil-'));
    fs.writeFileSync(path.join(evil, 'secret.txt'), 'top secret');
    const m = { ...manifest, name: 'x', size: 1, builtAt: '', pubspec: {}, file: `../${path.basename(evil)}/secret.txt` };
    expect(readArchive(m as never)).toBeNull(); // basename() confines the lookup to SDK_DIST_DIR
    fs.rmSync(evil, { recursive: true, force: true });
  });
});

describe('/api/version with a built SDK', () => {
  it('TEST-AI-S16 sdk.latest is the archive that can really be downloaded, not just the CRM version', async () => {
    process.env.CRM_VERSION = '2.5.2'; // runtime env moved on, archive still 2.5.1
    expect(getSdkLatestVersion()).toBe('2.5.1');

    const json = await (await versionGet(req(`${BASE}/api/version?sdk=2.5.0`, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'cb242.ceosuite.com' }))).json();
    expect(json.version).toBe('2.5.2');
    expect(json.sdk).toMatchObject({ latest: '2.5.1', client: '2.5.0', status: 'outdated', registry: 'https://cb242.ceosuite.com/api/pub' });
  });

  it('TEST-AI-S17 without a built SDK, latest follows the CRM version and no registry is advertised', async () => {
    process.env.SDK_DIST_DIR = path.join(dist, 'missing');
    process.env.CRM_VERSION = '3.0.0';
    const json = await (await versionGet(req(`${BASE}/api/version?sdk=3.0.0`))).json();
    expect(json.sdk).toMatchObject({ latest: '3.0.0', status: 'current', registry: null });
  });
});
