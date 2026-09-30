import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readTarGz } from './helpers/tar';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildSdkPackage, resolveVersion, createTarGz } = require('../../scripts/build-sdk-package.js');

const root = path.resolve(__dirname, '../..');
const srcDir = path.join(root, 'packages', 'flutter_ai_agent_sdk');

let out: string;
beforeEach(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-dist-'));
});
afterEach(() => {
  fs.rmSync(out, { recursive: true, force: true });
});

const build = (crmVersion?: string) => buildSdkPackage({ srcDir, outDir: out, crmVersion });
const files = (m: { file: string }) => readTarGz(fs.readFileSync(path.join(out, m.file)));
const text = (entries: { name: string; data: Buffer }[], name: string) => entries.find((e) => e.name === name)!.data.toString('utf8');

describe('scripts/build-sdk-package', () => {
  it('TEST-AI-S01 the archive carries the CRM version: file name, manifest, pubspec.yaml and the Dart constant', () => {
    const m = build('9.8.7');
    expect(m).toMatchObject({ name: 'flutter_ai_agent_sdk', version: '9.8.7', file: 'flutter_ai_agent_sdk-9.8.7.tar.gz' });

    const entries = files(m);
    expect(text(entries, 'pubspec.yaml')).toMatch(/^version: 9\.8\.7$/m);
    expect(text(entries, 'lib/src/version.dart')).toContain("aiAgentSdkVersion = '9.8.7'");
    expect(m.pubspec.version).toBe('9.8.7');
  });

  it('TEST-AI-S02 stamping never touches the SDK source tree', () => {
    const before = fs.readFileSync(path.join(srcDir, 'pubspec.yaml'), 'utf8');
    const dart = fs.readFileSync(path.join(srcDir, 'lib/src/version.dart'), 'utf8');
    build('9.8.7');
    expect(fs.readFileSync(path.join(srcDir, 'pubspec.yaml'), 'utf8')).toBe(before);
    expect(fs.readFileSync(path.join(srcDir, 'lib/src/version.dart'), 'utf8')).toBe(dart);
  });

  it('TEST-AI-S03 contains the library, pubspec and README - and no tests, lock files or dotfiles', () => {
    const names = files(build('1.2.3')).map((e) => e.name);
    expect(names).toContain('pubspec.yaml');
    expect(names).toContain('README.md');
    expect(names).toContain('lib/flutter_ai_agent_sdk.dart');
    expect(names).toContain('lib/src/ui/widgets/chat_bubble.dart');
    expect(names.filter((n) => n.startsWith('test/') || n.includes('pubspec.lock') || n.split('/').some((p) => p.startsWith('.')))).toEqual([]);
  });

  it('TEST-AI-S04 falls back to the version in the SDK source when CRM_VERSION is unset, "latest" or not a version', () => {
    const sourceVersion = /^version:\s*(\S+)/m.exec(fs.readFileSync(path.join(srcDir, 'pubspec.yaml'), 'utf8'))![1];
    for (const v of [undefined, '', 'latest', 'not-a-version', '1.2']) {
      expect(build(v).version).toBe(sourceVersion);
    }
    expect(resolveVersion('v2.0.1')).toBe('2.0.1');
    expect(resolveVersion('2.0.1-rc.1')).toBe('2.0.1-rc.1');
  });

  it('TEST-AI-S05 manifest sha256 and size describe the archive on disk; pubspec JSON keeps the dependencies', () => {
    const m = build('4.5.6');
    const bytes = fs.readFileSync(path.join(out, m.file));
    expect(m.sha256).toBe(crypto.createHash('sha256').update(bytes).digest('hex'));
    expect(m.size).toBe(bytes.length);
    expect(m.pubspec.dependencies.flutter).toEqual({ sdk: 'flutter' });
    expect(m.pubspec.dependencies.http).toBeTruthy();
    expect(JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).version).toBe('4.5.6');
  });

  it('TEST-AI-S06 builds are reproducible and a rebuild replaces the previous archive', () => {
    const a = build('1.0.24');
    const b = build('1.0.24');
    expect(b.sha256).toBe(a.sha256);

    build('1.0.25');
    expect(fs.readdirSync(out).sort()).toEqual(['flutter_ai_agent_sdk-1.0.25.tar.gz', 'manifest.json']);
  });

  it('TEST-AI-S07 returns null (no failure) when the SDK folder is absent', () => {
    expect(buildSdkPackage({ srcDir: path.join(os.tmpdir(), 'nope-' + Date.now()), outDir: out, crmVersion: '1.0.0' })).toBeNull();
    expect(fs.readdirSync(out)).toEqual([]);
  });

  it('TEST-AI-S07b the CLI still creates an (empty) output folder when the SDK source is missing, so Docker COPY does not fail', () => {
    const target = path.join(out, 'empty-dist');
    const run = spawnSync(process.execPath, [path.join(root, 'scripts/build-sdk-package.js'), '--src', path.join(out, 'no-such-sdk'), '--out', target], { encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.readdirSync(target)).toEqual([]);
  });

  it('TEST-AI-S08 tar writer: long paths use the ustar prefix, file sizes on block boundaries and empty files round-trip', () => {
    const longDir = 'lib/' + 'a'.repeat(60) + '/' + 'b'.repeat(60);
    const inputs = [
      { name: `${longDir}/file.dart`, data: Buffer.from('x'.repeat(512)) }, // exactly one block
      { name: 'empty.txt', data: Buffer.alloc(0) },
      { name: 'odd.txt', data: Buffer.from('y'.repeat(513)) },
    ];
    const back = readTarGz(createTarGz(inputs));
    expect(back.map((e) => e.name)).toEqual(inputs.map((e) => e.name));
    expect(back.map((e) => e.data.length)).toEqual([512, 0, 513]);
    expect(() => createTarGz([{ name: 'z'.repeat(300), data: Buffer.from('') }])).toThrow(/too long/);
  });

  it('TEST-AI-S09 a real tar binary can list and extract the archive (interoperability)', () => {
    const m = build('7.7.7');
    const probe = spawnSync('tar', ['--version']);
    if (probe.error || probe.status !== 0) return; // no tar on this machine: S08 already covers the format

    // relative name + cwd: GNU tar on Windows reads "C:\\..." as a remote host
    const listing = spawnSync('tar', ['-tzf', m.file], { encoding: 'utf8', cwd: out });
    expect(listing.status).toBe(0);
    expect(listing.stdout).toContain('lib/flutter_ai_agent_sdk.dart');

    const extracted = spawnSync('tar', ['-xzOf', m.file, 'pubspec.yaml'], { encoding: 'utf8', cwd: out });
    expect(extracted.stdout).toMatch(/^version: 7\.7\.7$/m);
  });
});
