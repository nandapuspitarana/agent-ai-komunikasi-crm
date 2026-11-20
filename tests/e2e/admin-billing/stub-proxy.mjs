// Stub of the ai-agent-proxy usage endpoint for the billing E2E. Binds 127.0.0.1 only.
//   GET /api/v1/observability/usage-by-tenant?from&to&tz  -> fixture JSON produced in Phase A from REAL
//       SQL function output (ai_usage_by_tenant / ai_usage_daily / ai_usage_oldest) fed through the proxy's
//       build_usage_response(). Periods without a fixture get an empty (but well-formed) response.
//   GET /__mode?set=ok|500|hang|slow switch mode (slow = answer after 3 s)      GET /__log   request log (query + key header)
//   GET /__reset                     clear log, mode=ok
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.STUB_PORT || 8210);
const fixtures = {};
for (const name of ['this_month', 'last_month', 'custom', 'retention', 'subcent', 'long']) {
  const p = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', `${name}.json`), 'utf8'));
  fixtures[`${p.period.from}|${p.period.to}`] = p;
}

let mode = 'ok';
let log = [];
const hung = new Set();

const empty = (from, to, tz) => ({
  period: { from, to, tz },
  totals: { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0, request_count: 0, error_count: 0, unpriced_count: 0 },
  tenants: [],
  by_day: [],
  unpriced_models: [],
  retention: { metrics_days: 400, oldest_available: '2025-10-16T09:05:01.02168+00:00' },
});

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/__mode') {
    mode = url.searchParams.get('set') || 'ok';
    return json(res, 200, { mode });
  }
  if (url.pathname === '/__log') return json(res, 200, { mode, log });
  if (url.pathname === '/__reset') {
    mode = 'ok';
    log = [];
    for (const r of hung) r.destroy();
    hung.clear();
    return json(res, 200, { ok: true });
  }
  if (url.pathname === '/api/v1/observability/usage-by-tenant') {
    const q = Object.fromEntries(url.searchParams);
    const entry = { at: new Date().toISOString(), path: url.pathname, search: url.search, query: q, internalKey: req.headers['x-internal-key'] ?? null, mode };
    log.push(entry);
    console.log('[stub]', JSON.stringify(entry));
    if (mode === '500') return json(res, 500, { detail: 'usage aggregation failed' });
    if (mode === 'hang') {
      hung.add(res);
      res.on('close', () => hung.delete(res));
      return; // never respond
    }
    const body = fixtures[`${q.from}|${q.to}`] ?? empty(q.from, q.to, q.tz);
    const send = () => json(res, 200, { ...body, period: { from: q.from, to: q.to, tz: q.tz } });
    if (mode === 'slow') return void setTimeout(send, 3000);
    return send();
  }
  json(res, 404, { detail: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`[stub] listening on http://127.0.0.1:${PORT}`));
