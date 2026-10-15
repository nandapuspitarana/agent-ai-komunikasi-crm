#!/usr/bin/env node
/**
 * Automatically bumps the SemVer version of flutter_ai_agent_sdk.
 *
 * Usage:
 *   node scripts/bump-sdk-version.js            # default: bumps patch (e.g. 1.0.27 -> 1.0.28)
 *   node scripts/bump-sdk-version.js patch      # bumps patch (1.0.27 -> 1.0.28)
 *   node scripts/bump-sdk-version.js minor      # bumps minor (1.0.27 -> 1.1.0)
 *   node scripts/bump-sdk-version.js major      # bumps major (1.0.27 -> 2.0.0)
 *   node scripts/bump-sdk-version.js 1.0.30     # sets explicit version
 *
 * Updates:
 *   - packages/flutter_ai_agent_sdk/pubspec.yaml
 *   - packages/flutter_ai_agent_sdk/lib/src/version.dart
 *   - sdk-dist/ package via scripts/build-sdk-package.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SDK_DIR = path.resolve(__dirname, '..', 'packages', 'flutter_ai_agent_sdk');
const PUBSPEC_PATH = path.join(SDK_DIR, 'pubspec.yaml');
const VERSION_DART_PATH = path.join(SDK_DIR, 'lib', 'src', 'version.dart');

if (!fs.existsSync(PUBSPEC_PATH)) {
  console.error(`[Error] pubspec.yaml not found at: ${PUBSPEC_PATH}`);
  process.exit(1);
}

const pubspecContent = fs.readFileSync(PUBSPEC_PATH, 'utf8');
const versionMatch = pubspecContent.match(/^version:\s*([0-9]+\.[0-9]+\.[0-9]+)/m);

if (!versionMatch) {
  console.error(`[Error] Could not find valid version in: ${PUBSPEC_PATH}`);
  process.exit(1);
}

const currentVersion = versionMatch[1];
const [majorStr, minorStr, patchStr] = currentVersion.split('.');
let major = parseInt(majorStr, 10);
let minor = parseInt(minorStr, 10);
let patch = parseInt(patchStr, 10);

const arg = (process.argv[2] || 'patch').toLowerCase().trim();
let newVersion = '';

if (arg === 'patch') {
  patch += 1;
  newVersion = `${major}.${minor}.${patch}`;
} else if (arg === 'minor') {
  minor += 1;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (arg === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
  newVersion = `${major}.${minor}.${patch}`;
} else if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(arg)) {
  newVersion = arg;
} else {
  console.error(`[Error] Invalid version argument: "${arg}". Use 'patch', 'minor', 'major', or explicit SemVer (e.g. 1.0.28).`);
  process.exit(1);
}

console.log(`[SDK Version Bump] ${currentVersion} -> ${newVersion}`);

// 1. Update pubspec.yaml
const updatedPubspec = pubspecContent.replace(
  /^version:\s*.*$/m,
  `version: ${newVersion}`
);
fs.writeFileSync(PUBSPEC_PATH, updatedPubspec, 'utf8');
console.log(`✓ Updated ${path.relative(process.cwd(), PUBSPEC_PATH)}`);

// 2. Update version.dart
if (fs.existsSync(VERSION_DART_PATH)) {
  const versionDartContent = fs.readFileSync(VERSION_DART_PATH, 'utf8');
  const updatedVersionDart = versionDartContent.replace(
    /(const\s+String\s+aiAgentSdkVersion\s*=\s*)'[^']*'/,
    `$1'${newVersion}'`
  );
  fs.writeFileSync(VERSION_DART_PATH, updatedVersionDart, 'utf8');
  console.log(`✓ Updated ${path.relative(process.cwd(), VERSION_DART_PATH)}`);
}

// 3. Rebuild SDK distribution archive
try {
  console.log(`\nRebuilding SDK archive for version ${newVersion}...`);
  execSync(`node scripts/build-sdk-package.js`, { stdio: 'inherit', env: { ...process.env, CRM_VERSION: newVersion } });
} catch (err) {
  console.warn(`[Warning] Rebuilding SDK distribution archive failed: ${err.message}`);
}

console.log(`\n🎉 Successfully bumped SDK to v${newVersion}!`);
console.log(`\nNext steps:`);
console.log(`  git add packages/flutter_ai_agent_sdk`);
console.log(`  git commit -m "chore(sdk): bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin ceosuite --tags && git push ceosuite ceosuite --tags`);
