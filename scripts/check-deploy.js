#!/usr/bin/env node
/**
 * Verify what is actually running in each environment.
 *
 *   npm run check:deploy -- --expect 1.2.0 uat=https://uat.example.com prod=https://crm.example.com
 *   DEPLOY_TARGETS="uat=https://uat...,prod=https://crm..." EXPECT_VERSION=1.2.0 npm run check:deploy
 *
 * For every target it calls GET <url>/api/version and reports the server
 * version (CRM_VERSION), API version, commit and build time, and whether the
 * version matches the expected one. --expect defaults to CRM_VERSION from the
 * environment, then package.json. Exit code is 1 if any target is not OK, so it
 * can gate a deploy pipeline.
 */
const path = require('path');

/** Statuses: OK | MISMATCH | NO_ENDPOINT (server predates /api/version) | UNREACHABLE | INVALID */
async function checkTarget(name, baseUrl, expected, fetchImpl = fetch) {
  const url = baseUrl.replace(/\/+$/, '') + '/api/version';
  let res;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return { name, url, status: 'UNREACHABLE', detail: String((e && e.cause && e.cause.code) || (e && e.message) || e) };
  }
  if (res.status === 404) {
    return { name, url, status: 'NO_ENDPOINT', detail: 'HTTP 404 - this server has not been deployed with the versioned build yet' };
  }
  if (!res.ok) return { name, url, status: 'UNREACHABLE', detail: `HTTP ${res.status}` };

  let info;
  try {
    info = await res.json();
  } catch {
    return { name, url, status: 'INVALID', detail: 'response is not JSON' };
  }
  if (!info || typeof info.version !== 'string') return { name, url, status: 'INVALID', detail: 'no "version" in response' };

  const matches = !expected || info.version === expected;
  return {
    name,
    url,
    status: matches ? 'OK' : 'MISMATCH',
    version: info.version,
    apiVersion: info.apiVersion,
    commit: info.commit || null,
    builtAt: info.builtAt || null,
    detail: matches ? '' : `expected ${expected}, running ${info.version}`,
  };
}

function parseTargets(list) {
  return list
    .flatMap((s) => String(s).split(','))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf('=');
      if (i === -1) return { name: s.replace(/^https?:\/\//, ''), url: s };
      return { name: s.slice(0, i), url: s.slice(i + 1) };
    });
}

function defaultExpected() {
  const fromEnv = (process.env.EXPECT_VERSION || process.env.CRM_VERSION || '').trim().replace(/^v/i, '');
  if (fromEnv && fromEnv.toLowerCase() !== 'latest') return fromEnv;
  return require(path.join(__dirname, '..', 'package.json')).version;
}

async function main(argv) {
  const args = argv.slice(2);
  let expected = defaultExpected();
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--expect') expected = String(args[++i] || '').replace(/^v/i, '');
    else rest.push(args[i]);
  }
  const targets = parseTargets(rest.length ? rest : [process.env.DEPLOY_TARGETS || '']);
  if (targets.length === 0) {
    console.error('No targets. Pass name=url arguments or set DEPLOY_TARGETS="uat=https://...,prod=https://..."');
    return 2;
  }

  console.log(`Expected server version: ${expected}\n`);
  const results = await Promise.all(targets.map((t) => checkTarget(t.name, t.url, expected)));
  for (const r of results) {
    const mark = r.status === 'OK' ? 'OK      ' : r.status.padEnd(8);
    const meta = r.version
      ? `v${r.version}  api ${r.apiVersion}  commit ${r.commit || '-'}  built ${r.builtAt || '-'}`
      : '';
    console.log(`${mark} ${r.name.padEnd(10)} ${meta}${r.detail ? `  (${r.detail})` : ''}`);
  }
  return results.every((r) => r.status === 'OK') ? 0 : 1;
}

module.exports = { checkTarget, parseTargets };

if (require.main === module) {
  // exitCode (not process.exit) lets pending fetch handles close first; process.exit()
  // right after fetch aborts with a libuv assertion (exit 127) on Windows.
  main(process.argv).then((code) => {
    process.exitCode = code;
  });
}
