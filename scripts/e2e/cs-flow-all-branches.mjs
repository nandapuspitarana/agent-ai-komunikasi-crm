// Walks EVERY button branch of the CS flow on a live widget, one widget session per path:
//   hi -> button -> button -> ... until a card (end of journey).
// Each reply is compared with the deployed flow JSON: same intent text, same buttons, cards have no buttons.
// Usage: node scripts/e2e/cs-flow-all-branches.mjs <baseUrl> <tenantId> [flow.json]
//   e.g. node scripts/e2e/cs-flow-all-branches.mjs https://cb242.ceosuite.com <tenant id>
// The flow defaults to userjourney/UserJourney-CS-Support.json (run it from the repo root, on the deployed commit).
import fs from 'fs';
const [base, tenantId, flowPath = 'userjourney/UserJourney-CS-Support.json'] = process.argv.slice(2);
if (!base || !tenantId) { console.error('usage: node scripts/e2e/cs-flow-all-branches.mjs <baseUrl> <tenantId> [flow.json]'); process.exit(2); }
const intents = JSON.parse(fs.readFileSync(flowPath, 'utf8')).data.intents;
const byName = new Map(intents.map((i) => [i.name, i]));
const START = 'Start / Main Menu';

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (h) => dec((h || '').replace(/<div class="flex flex-wrap[\s\S]*$/, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const btns = (h) => [...(h || '').matchAll(/text: &quot;(.*?)&quot;/g)].map((m) => dec(m[1]));
const targets = (i) => (i.options ? i.options.split(', ').map((o) => o.split('|')[1]) : []);

async function send(state, message) {
  const res = await fetch(`${base}/api/widget/message`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId, message, sessionId: state.sessionId, visitorToken: state.visitorToken }) });
  const j = await res.json().catch(() => ({}));
  if (j.sessionId) state.sessionId = j.sessionId;
  if (j.visitorToken) state.visitorToken = j.visitorToken;
  return { http: res.status, type: j.responseType, handoff: j.handoffOccurred, raw: j.reply || '', error: j.error };
}

// All paths from Start to a leaf
const paths = [];
const walk = (name, path) => {
  const t = targets(byName.get(name));
  if (!t.length) return paths.push(path);
  for (const n of t) walk(n, [...path, n]);
};
walk(START, []);

const visited = new Set([START]);
const failures = [];
let checked = 0;
const check = (where, intent, r) => {
  checked++;
  const problems = [];
  if (r.http !== 200) problems.push(`http ${r.http} ${r.error || ''}`);
  if (r.handoff) problems.push('handoff');
  if (text(r.raw) !== text(intent.response)) problems.push(`text differs: got "${text(r.raw).slice(0, 120)}"`);
  const want = targets(intent), got = btns(r.raw);
  if (JSON.stringify(want) !== JSON.stringify(got)) problems.push(`buttons differ: want ${want.length} [${want.slice(0, 3).join(' | ')}...], got ${got.length} [${got.slice(0, 3).join(' | ')}...]`);
  if (intent.responseType === 'card' && got.length) problems.push('card has buttons');
  if (got.some((b) => /start again|main menu|back/i.test(b))) problems.push('loop button');
  if (problems.length) failures.push(`${where}\n    ${problems.join('\n    ')}`);
};

const t0 = Date.now();
// Run paths a few at a time
const queue = [...paths];
async function worker() {
  while (queue.length) {
    const path = queue.shift();
    const state = {};
    check('hi', byName.get(START), await send(state, 'hi'));
    for (let k = 0; k < path.length; k++) {
      const intent = byName.get(path[k]);
      visited.add(intent.name);
      check(['hi', ...path.slice(0, k + 1)].join(' > '), intent, await send(state, path[k]));
    }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));

const unreachable = intents.filter((i) => !visited.has(i.name)).map((i) => i.name);
console.log(`paths: ${paths.length} (city -> centre: ${paths.filter((p) => p[0].startsWith('City')).length}, FAQ -> topic -> answer: ${paths.filter((p) => p[0] === 'FAQ').length})`);
console.log(`replies checked: ${checked}, intents reached: ${visited.size}/${intents.length}, unreachable: ${unreachable.length ? unreachable.join(', ') : 'none'}`);
console.log(`time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(failures.length ? `FAILURES (${failures.length}):\n${failures.join('\n')}` : 'ALL BRANCHES PASS');
process.exit(failures.length || unreachable.length ? 1 : 0);
