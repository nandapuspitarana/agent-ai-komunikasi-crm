import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkTarget, parseTargets } = require('../../scripts/check-deploy.js');

const ok = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });

const info = { version: '1.2.0', apiVersion: '1.1.0', commit: 'abc123def456', builtAt: '2026-10-01T08:00:00.000Z' };

describe('scripts/check-deploy', () => {
  it('TEST-AI-D01 OK when the running version equals the expected one, and reports commit + build time', async () => {
    const r = await checkTarget('prod', 'https://crm.example.com/', '1.2.0', ok(info));
    expect(r).toMatchObject({ name: 'prod', status: 'OK', version: '1.2.0', commit: 'abc123def456', builtAt: info.builtAt });
    expect(r.url).toBe('https://crm.example.com/api/version'); // trailing slash normalised
  });

  it('TEST-AI-D02 MISMATCH when the environment still runs an older version', async () => {
    const r = await checkTarget('uat', 'https://uat.example.com', '1.2.0', ok({ ...info, version: '1.1.0' }));
    expect(r.status).toBe('MISMATCH');
    expect(r.detail).toBe('expected 1.2.0, running 1.1.0');
  });

  it('TEST-AI-D03 NO_ENDPOINT for a server deployed before /api/version existed', async () => {
    const r = await checkTarget('prod', 'https://old.example.com', '1.2.0', ok({ error: 'not found' }, 404));
    expect(r.status).toBe('NO_ENDPOINT');
  });

  it('TEST-AI-D04 UNREACHABLE on network errors and 5xx; INVALID on non-JSON or a body without version', async () => {
    expect((await checkTarget('x', 'https://x', '1', async () => { throw new Error('boom'); })).status).toBe('UNREACHABLE');
    expect((await checkTarget('x', 'https://x', '1', ok({}, 502))).status).toBe('UNREACHABLE');
    expect((await checkTarget('x', 'https://x', '1', async () => new Response('<html>', { status: 200 }))).status).toBe('INVALID');
    expect((await checkTarget('x', 'https://x', '1', ok({ hello: 'world' }))).status).toBe('INVALID');
  });

  it('TEST-AI-D05 parses name=url pairs from arguments or a comma separated DEPLOY_TARGETS', () => {
    expect(parseTargets(['uat=https://u.example.com,prod=https://p.example.com'])).toEqual([
      { name: 'uat', url: 'https://u.example.com' },
      { name: 'prod', url: 'https://p.example.com' },
    ]);
    expect(parseTargets(['https://only.example.com'])).toEqual([{ name: 'only.example.com', url: 'https://only.example.com' }]);
    expect(parseTargets([''])).toEqual([]);
  });
});
