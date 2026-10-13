import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../../scripts/lib/kb-lib.js');

const root = process.cwd();
const kbDir = path.join(root, 'userjourney', 'knowledge base');
const centresPath = path.join(kbDir, 'KB - List of Centres.json');
const centres: any[] = JSON.parse(fs.readFileSync(centresPath, 'utf8'));

describe('Docker knowledge sync (scripts/docker/sync-knowledge.js)', () => {
  it('TEST-KB-01 Every KB centre becomes a chunk carrying address, phone, email and hours', () => {
    const chunks: string[] = lib.chunksFromCentresJson(fs.readFileSync(centresPath, 'utf8'));
    expect(chunks.length).toBe(centres.length);

    centres.forEach((c, i) => {
      const chunk = chunks[i];
      const ci = c.contact_information;
      expect(chunk).toContain(c.centre_name);
      expect(chunk).toContain(c.brand);
      expect(chunk).toContain(ci.phone);
      expect(chunk).toContain(ci.email);
      expect(chunk).toContain(`${c.operating_hours.opening_time} - ${c.operating_hours.closing_time}`);
      // markdown link artifacts in KB addresses are cleaned
      expect(chunk).not.toMatch(/\]\(https?:/);
      for (const x of c.convenience || []) expect(chunk).toContain(x);
      for (const x of c.amenities || []) expect(chunk).toContain(x);
    });
  });

  it('TEST-KB-02 Truncated or empty map links from the KB are not indexed', () => {
    const chunks: string[] = lib.chunksFromCentresJson(fs.readFileSync(centresPath, 'utf8'));
    centres.forEach((c, i) => {
      const u: string = c.contact_information.location_url || '';
      const broken = !/^https?:\/\//.test(u) || u.endsWith('...');
      if (broken) expect(chunks[i]).not.toContain('Location map link');
      else expect(chunks[i]).toContain(u);
    });
  });

  it('TEST-KB-03 The stale xlsx centre list is superseded by the JSON, the pricing xlsx is reused', () => {
    expect(lib.SUPERSEDED.has('KB - List of Centres.xlsx')).toBe(true);
    expect(lib.REUSE_FROM_DB.has('KB - Pricing Table.xlsx')).toBe(true);
    expect(lib.getMetaName('KB - List of Centres.json')).toBe('Directory - List of Centres');
    expect(lib.getCategory('KB - List of Centres.json')).toBe('Centres');
  });

  it('TEST-KB-04 Dry run plans the flow and all knowledge documents without a database', () => {
    const out = execFileSync('node', ['scripts/docker/sync-knowledge.js', '--dry-run'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: '' },
    });
    expect(out).toContain('230 intents');
    expect(out).toContain('KB - List of Centres.json -> Directory - List of Centres');
    expect(out).toContain('skipped: KB - List of Centres.xlsx');
    expect(out).toContain('KB - Pricing Table.xlsx');
  });

  it('TEST-KB-05 The runner image ships what the sync needs and runs it before start', () => {
    const docker = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
    const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
    expect(docker).toContain('node userjourney/build_cs_support.js');
    expect(docker).toContain('UserJourney-CS-Support.json');
    expect(docker).toContain('userjourney/knowledge base');
    expect(docker).toContain('/app/scripts/docker');
    expect(docker).toContain('/app/scripts/lib');
    expect(docker).toContain('scripts/docker/sync-knowledge.js');
    expect(compose).toContain('scripts/docker/sync-knowledge.js');
    // a failing sync must not stop the web server
    expect(compose).toMatch(/sync-knowledge\.js \|\| echo/);
    expect(compose).toMatch(/npm run start/);
  });
});
