#!/usr/bin/env node
/**
 * Packages the Flutter SDK (packages/flutter_ai_agent_sdk) as a pub archive that
 * the server hands out from its own pub repository (/api/pub), versioned to
 * match the CRM:
 *
 *   sdk-dist/flutter_ai_agent_sdk-<CRM_VERSION>.tar.gz
 *   sdk-dist/manifest.json   { name, version, file, sha256, size, builtAt, pubspec }
 *
 * The SDK version is stamped from CRM_VERSION (pubspec.yaml `version:` and the
 * `aiAgentSdkVersion` constant), so the SDK and the CRM always carry the same
 * number. Without a valid CRM_VERSION the version in the SDK source is kept.
 * No external tar binary is needed (a small ustar writer is included), so this
 * runs the same on Windows, macOS and the Docker build stage.
 *
 * Usage: node scripts/build-sdk-package.js [--src <dir>] [--out <dir>]
 * Runs automatically before `npm run build` (npm "prebuild" hook).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PACKAGE_NAME = 'flutter_ai_agent_sdk';
const SEMVER = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)*$/;

/** CRM_VERSION -> a version pub accepts, or null ("latest", empty, junk). */
function resolveVersion(raw) {
  const v = String(raw || '').trim().replace(/^v/i, '');
  return v && SEMVER.test(v) ? v : null;
}

function stampPubspec(text, version) {
  if (!/^version:.*$/m.test(text)) throw new Error('pubspec.yaml has no "version:" line');
  return text.replace(/^version:.*$/m, `version: ${version}`);
}

function stampDartVersion(text, version) {
  const re = /(const\s+String\s+aiAgentSdkVersion\s*=\s*)'[^']*'/;
  if (!re.test(text)) throw new Error("lib/src/version.dart has no aiAgentSdkVersion constant");
  return text.replace(re, `$1'${version}'`);
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

// --- minimal ustar writer ----------------------------------------------------
function octal(value, length) {
  return value.toString(8).padStart(length - 1, '0') + '\0';
}

function tarHeader(name, size) {
  let prefix = '';
  let base = name;
  if (Buffer.byteLength(name) > 100) {
    let cut = -1;
    for (let i = name.length - 1; i > 0; i--) {
      if (name[i] === '/' && Buffer.byteLength(name.slice(i + 1)) <= 100 && Buffer.byteLength(name.slice(0, i)) <= 155) {
        cut = i;
        break;
      }
    }
    if (cut === -1) throw new Error(`path too long for tar: ${name}`);
    prefix = name.slice(0, cut);
    base = name.slice(cut + 1);
  }

  const h = Buffer.alloc(512);
  h.write(base, 0, 100);
  h.write(octal(0o644, 8), 100);
  h.write(octal(0, 8), 108); // uid
  h.write(octal(0, 8), 116); // gid
  h.write(octal(size, 12), 124);
  h.write(octal(946684800, 12), 136); // fixed mtime (2000-01-01) keeps archives reproducible
  h.write('        ', 148); // checksum placeholder (8 spaces)
  h.write('0', 156); // regular file
  h.write('ustar\0', 257);
  h.write('00', 263);
  h.write(prefix, 345, 155);

  let sum = 0;
  for (const byte of h) sum += byte;
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return h;
}

function createTarGz(files) {
  const chunks = [];
  for (const { name, data } of files) {
    chunks.push(tarHeader(name, data.length), data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) chunks.push(Buffer.alloc(pad));
  }
  chunks.push(Buffer.alloc(1024)); // end-of-archive
  return zlib.gzipSync(Buffer.concat(chunks), { level: 9 });
}

/**
 * Builds the archive + manifest. Returns the manifest, or null when the SDK
 * source folder does not exist (deployments without packages/ keep working).
 */
function buildSdkPackage({ srcDir, outDir, crmVersion, now = new Date() }) {
  if (!fs.existsSync(path.join(srcDir, 'pubspec.yaml'))) return null;

  const YAML = require('yaml');
  const sourcePubspec = fs.readFileSync(path.join(srcDir, 'pubspec.yaml'), 'utf8');
  const sourceVersion = YAML.parse(sourcePubspec).version;
  const version = resolveVersion(crmVersion) || String(sourceVersion);

  const files = [];
  const add = (name, data) => files.push({ name, data: Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8') });

  const pubspecText = stampPubspec(sourcePubspec, version);
  add('pubspec.yaml', pubspecText);
  for (const optional of ['README.md', 'CHANGELOG.md', 'LICENSE']) {
    if (fs.existsSync(path.join(srcDir, optional))) add(optional, fs.readFileSync(path.join(srcDir, optional)));
  }
  for (const rel of listFiles(path.join(srcDir, 'lib'), srcDir)) {
    const data = fs.readFileSync(path.join(srcDir, rel));
    add(rel, rel === 'lib/src/version.dart' ? stampDartVersion(data.toString('utf8'), version) : data);
  }

  const archive = createTarGz(files);
  const file = `${PACKAGE_NAME}-${version}.tar.gz`;
  fs.mkdirSync(outDir, { recursive: true });
  for (const old of fs.readdirSync(outDir)) {
    if (old.endsWith('.tar.gz') || old === 'manifest.json') fs.rmSync(path.join(outDir, old));
  }
  fs.writeFileSync(path.join(outDir, file), archive);

  const manifest = {
    name: YAML.parse(pubspecText).name || PACKAGE_NAME,
    version,
    file,
    sha256: crypto.createHash('sha256').update(archive).digest('hex'),
    size: archive.length,
    builtAt: now.toISOString(),
    pubspec: YAML.parse(pubspecText),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

module.exports = { buildSdkPackage, resolveVersion, stampPubspec, stampDartVersion, createTarGz, tarHeader };

if (require.main === module) {
  const arg = (flag, fallback) => {
    const i = process.argv.indexOf(flag);
    return i !== -1 ? path.resolve(process.argv[i + 1]) : fallback;
  };
  const root = path.join(__dirname, '..');
  const srcDir = arg('--src', path.join(root, 'packages', PACKAGE_NAME));
  const outDir = arg('--out', path.join(root, 'sdk-dist'));

  const crm = process.env.CRM_VERSION;
  const manifest = buildSdkPackage({ srcDir, outDir, crmVersion: crm });
  if (!manifest) {
    // keep `COPY --from=builder /app/sdk-dist` in the Dockerfile working with an empty registry
    fs.mkdirSync(outDir, { recursive: true });
    console.warn(`[sdk] ${srcDir} not found - skipping SDK package (the /api/pub registry will be empty)`);
  } else {
    const source = resolveVersion(crm) ? 'CRM_VERSION' : 'SDK source (CRM_VERSION unset/invalid)';
    console.log(`[sdk] ${manifest.file}  version ${manifest.version} (from ${source})  sha256 ${manifest.sha256.slice(0, 12)}...  ${manifest.size} bytes`);
  }
}
