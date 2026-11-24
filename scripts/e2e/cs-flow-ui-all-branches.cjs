// Clicks EVERY button path of the CS flow in the real widget UI (one fresh browser context per path).
// After each click: the visitor bubble must equal the button label (never an intent name), and the bot's reply
// must show the next buttons or, at the end, the card title. At the end of each path the messages stored on the
// server (what the agent inbox shows) must be the clicked labels too.
// Usage (from the repo root, on the deployed commit):
//   node scripts/e2e/cs-flow-ui-all-branches.cjs . https://cb242.ceosuite.com <tenant id> <screenshot dir>
const fs = require('fs');
const [, , repo, base, tenantId, outDir] = process.argv;
if (!repo || !base || !tenantId || !outDir) { console.error('usage: node scripts/e2e/cs-flow-ui-all-branches.cjs <repo> <baseUrl> <tenantId> <outDir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const path = require('path');
const { chromium } = require(path.resolve(repo, 'node_modules/@playwright/test'));
const intents = JSON.parse(fs.readFileSync(path.resolve(repo, 'userjourney/UserJourney-CS-Support.json'), 'utf8')).data.intents;
const byName = new Map(intents.map((i) => [i.name, i]));
const opts = (i) => (i.options ? i.options.split(', ').map((o) => { const [label, target] = o.split('|'); return { label, target }; }) : []);
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const cardTitle = (i) => dec((/card-title'>(.*?)<\/div>/.exec(i.response) || [])[1] || '');
const INTENT_NAME = /^(City Directory|Centre|Center|FAQ|Start \/ Main Menu)\b.*:/;

const paths = [];
const walk = (name, path) => { const o = opts(byName.get(name)); if (!o.length) return paths.push(path); for (const x of o) walk(x.target, [...path, x]); };
walk('Start / Main Menu', []);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = []; let clicks = 0, done = 0;
  const queue = [...paths];
  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      const ctx = await browser.newContext({ viewport: { width: 420, height: 820 } });
      const page = await ctx.newPage();
      const where = path.map((p) => p.label).join(' > ');
      let sessionId = null;
      page.on('response', (r) => {
        if (r.request().method() === 'POST' && r.url().includes('/api/widget/message')) {
          r.json().then((j) => { if (j && j.sessionId) sessionId = j.sessionId; }).catch(() => {});
        }
      });
      try {
        await page.goto(`${base}/widget-ui?tenantId=${tenantId}`, { waitUntil: 'domcontentloaded' });
        const first = page.getByRole('button', { name: path[0].label, exact: true }).last();
        if (!(await first.isVisible({ timeout: 8000 }).catch(() => false))) {
          await page.locator('button').last().click().catch(() => {});
        }
        await first.waitFor({ timeout: 20000 });
        for (let k = 0; k < path.length; k++) {
          const step = path[k];
          const bubbles = page.locator('.rounded-br-sm p');
          const before = await bubbles.count();
          await page.getByRole('button', { name: step.label, exact: true }).last().click();
          clicks++;
          await page.waitForFunction((n) => document.querySelectorAll('.rounded-br-sm p').length > n, before, { timeout: 20000 });
          const shown = (await bubbles.last().innerText()).trim();
          if (shown !== step.label) failures.push(`${where}: clicked "${step.label}", bubble shows "${shown}"`);
          const target = byName.get(step.target);
          const next = opts(target);
          if (next.length) await page.getByRole('button', { name: next[0].label, exact: true }).last().waitFor({ timeout: 20000 });
          else await page.getByText(cardTitle(target), { exact: true }).last().waitFor({ timeout: 20000 });
        }
        const all = (await page.locator('.rounded-br-sm p').allInnerTexts()).map((t) => t.trim());
        const leaked = all.filter((t) => INTENT_NAME.test(t));
        if (leaked.length) failures.push(`${where}: intent names in bubbles: ${leaked.join(' | ')}`);
        if (!sessionId) failures.push(`${where}: no sessionId seen`);
        else {
          const res = await ctx.request.get(`${base}/api/widget/message?sessionId=${sessionId}&tenantId=${tenantId}`);
          const stored = ((await res.json()).messages || []).filter((m) => m.senderType === 'user').map((m) => m.content);
          const want = path.map((p) => p.label);
          if (JSON.stringify(stored) !== JSON.stringify(want)) failures.push(`${where}: stored ${JSON.stringify(stored)}, want ${JSON.stringify(want)}`);
        }
        if (done < 2 || /Jakarta > Axa|Meeting Rooms & Events > How can I book/.test(where)) await page.screenshot({ path: `${outDir}/ui-branch-${done}.png` });
      } catch (e) {
        failures.push(`${where}: ${e.message.split('\n')[0]}`);
        await page.screenshot({ path: `${outDir}/ui-fail-${done}.png` }).catch(() => {});
      }
      done++;
      await ctx.close();
    }
  }
  const t0 = Date.now();
  await Promise.all([1, 2, 3, 4].map(worker));
  console.log(`UI paths: ${paths.length}, clicks: ${clicks}, time: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(failures.length ? `FAILURES (${failures.length}):\n` + failures.join('\n') : 'ALL UI BRANCHES PASS (every bubble and every stored message is the clicked label)');
  await browser.close();
  process.exit(failures.length ? 1 : 0);
})();
