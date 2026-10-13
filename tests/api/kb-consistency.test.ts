import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../../scripts/lib/kb-lib.js');

const root = process.cwd();
const kbDir = path.join(root, 'userjourney', 'knowledge base');
const centresText = fs.readFileSync(path.join(kbDir, 'KB - List of Centres.json'), 'utf8');
const centres: any[] = JSON.parse(centresText);
const byBrand = (b: string) => centres.find((c) => c.brand === b);
const digits = (s: string) => s.replace(/\D/g, '');

describe('Knowledge base has one consistent version of every centre', () => {
  it('TEST-KB-10 No phrase, name or response is duplicated across intents of the CS flow', () => {
    const flow = JSON.parse(fs.readFileSync(path.join(root, 'userjourney', 'UserJourney-CS-Support.json'), 'utf8'));
    const intents: any[] = flow.data.intents;

    const names = intents.map((i) => i.name.toLowerCase().trim());
    expect(names.length).toBe(new Set(names).size);

    const owners = new Map<string, string[]>();
    for (const i of intents) {
      const seen = new Set<string>();
      for (const p of i.trainingPhrases || []) {
        const k = String(p).toLowerCase().trim();
        expect(seen.has(k), `"${k}" listed twice in ${i.name}`).toBe(false);
        seen.add(k);
        owners.set(k, [...(owners.get(k) || []), i.name]);
      }
    }
    const shared = Array.from(owners.entries()).filter(([, v]) => v.length > 1);
    expect(shared.map(([k, v]) => `${k} -> ${v.join(' | ')}`)).toEqual([]);
  });

  it('TEST-KB-11 A centre name opens that centre card (not the city list), a city name opens the city list', () => {
    const flow = JSON.parse(fs.readFileSync(path.join(root, 'userjourney', 'UserJourney-CS-Support.json'), 'utf8'));
    const intents: any[] = flow.data.intents;
    const owner = (q: string) =>
      intents.find((i) => i.name.toLowerCase() === q) ||
      intents.find((i) => (i.trainingPhrases || []).some((p: string) => p.toLowerCase().trim() === q));

    for (const [q, name] of [
      ['centennial tower', 'PO Centre: Centennial Tower'],
      ['lotte center', 'PO Centre: Hanoi Lotte Center'],
      ['athenee tower', 'PO Centre: Athenee Tower'],
      ['lkg tower', 'PO Centre: Lkg Tower'],
      ['ping an finance center', 'PO Centre: Ping An Finance Center'],
      ['vietcombank tower', 'PO Centre: Vietcombank Tower'],
      ['jakarta', 'City Directory: Jakarta'],
      ['singapore', 'City Directory: Singapore'],
      ['hangzhou', 'City Directory: Hangzhou'],
    ]) {
      expect(owner(q)?.name, q).toBe(name);
    }
  });

  it('TEST-KB-12 WordPress export: no drafts, no duplicate slugs, nothing the centres JSON already covers', () => {
    const xml = fs.readFileSync(path.join(kbDir, 'ceosuite.WordPress.2026-06-24-location.xml'), 'utf8');
    const skip: Set<string> = lib.centreSlugsFromCentresJson(centresText);
    const chunks: string[] = lib.parseXmlLocations(xml, { skipSlugs: skip });

    const publishedSlugs = new Set<string>();
    for (const raw of xml.split('<item>').slice(1)) {
      const it = raw.split('</item>')[0];
      const status = (it.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/) || [])[1];
      const slug = (it.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/) || [])[1];
      if (status === 'publish' && slug && !skip.has(slug)) publishedSlugs.add(slug);
    }
    // exactly one chunk per remaining published slug, and far fewer than the 48 raw items
    expect(chunks.length).toBe(publishedSlugs.size);
    expect(chunks.length).toBeLessThan(10);
    // every KB centre website slug is skipped
    for (const c of centres) {
      const slug = c.contact_information.website.replace(/\/+$/, '').split('/').pop();
      expect(skip.has(slug), `${c.brand} slug ${slug}`).toBe(true);
    }
    expect(chunks.join('\n')).not.toMatch(/whatsapp/i);
  });

  // KB markdown file -> brand code in KB - List of Centres.json
  const mdToBrand: Record<string, string> = {
    'L2-centre-bangkok-athenee-tower.md': 'ATT',
    'L2-centre-beijing-sunshine-financial-center.md': 'SUN',
    'L2-centre-beijing-the-exchange-twin-towers.md': 'LGT',
    'L2-centre-hangzhou-ping-an-finance-center-tower-b.md': 'PAN',
    'L2-centre-hanoi-lotte-center-east-tower.md': 'LCH',
    'L2-centre-ho-chi-minh-city-vietcombank-tower.md': 'VCB',
    'L2-centre-hongkong-k11-atelier-victoria-dockside.md': 'KHK',
    'L2-centre-jakarta-axa-tower.md': 'AXA',
    'L2-centre-jakarta-idx.md': 'IDX',
    'L2-centre-jakarta-one-pacific-place.md': 'OPP',
    'L2-centre-jakarta-sahid-sudirman-center.md': 'SSC',
    'L2-centre-kuala-lumpur-axiata-tower.md': 'QU7',
    'L2-centre-kuala-lumpur-menara-maxis-26th-floor.md': 'MKL',
    'L2-centre-kuala-lumpur-menara-maxis-36th-floor.md': 'MMX',
    'L2-centre-kuala-lumpur-q-sentral-east-wing.md': 'QSE',
    'L2-centre-manila-lkg-tower.md': 'LKG',
    'L2-centre-seoul-kyobo-building.md': 'KYB',
    'L2-centre-seoul-parnas-tower.md': 'PNS',
    'L2-centre-shanghai-hongkong-new-world-tower-k11.md': 'HKN',
    'L2-centre-shanghai-lujiazui-finance-plaza.md': 'LJZ',
    'L2-centre-shanghai-world-financial-center.md': 'SWF',
    'L2-centre-singapore-centennial-tower.md': 'CTN',
  };

  it('TEST-KB-13 Every L2 centre document quotes the same phone and email as the centres JSON', () => {
    const failures: string[] = [];
    for (const [file, brand] of Object.entries(mdToBrand)) {
      const c = byBrand(brand);
      const text = fs.readFileSync(path.join(kbDir, file), 'utf8');
      const phone = text.match(/^- Telepon:\s*(.+)$/m)?.[1];
      const email = text.match(/^- Email:\s*(.+)$/m)?.[1]?.trim();
      if (phone && digits(phone) !== digits(c.contact_information.phone)) {
        failures.push(`${file}: phone ${phone} != ${c.contact_information.phone}`);
      }
      if (email && email.toLowerCase() !== c.contact_information.email.toLowerCase()) {
        failures.push(`${file}: email ${email} != ${c.contact_information.email}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('TEST-KB-14 No WhatsApp numbers anywhere in the knowledge base documents', () => {
    const offenders: string[] = [];
    for (const f of fs.readdirSync(kbDir).filter((x) => x.endsWith('.md'))) {
      const lines = fs.readFileSync(path.join(kbDir, f), 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (/whatsapp\s*:\s*\+?\d/i.test(l) || /wa\.me\//i.test(l)) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('TEST-KB-15 Superseded sources are not shipped to the vector store', () => {
    expect(lib.SUPERSEDED.has('KB - List of Centres.xlsx')).toBe(true);
    const ignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');
    // legacy per-centre copies (md_locations/) are not registered anywhere; keep them out of the image
    expect(ignore).toContain('userjourney/knowledge base/md_locations');
  });
});
