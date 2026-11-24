/**
 * kb-lib.js
 *
 * Pure helpers (no DB, no network) used by scripts/docker/sync-knowledge.js to turn the files in
 * userjourney/knowledge base/ into chunks. The chunking rules mirror
 * scripts/database/register_all_knowledge_base.js so documents look the same however they were loaded.
 */

const crypto = require('crypto');

const CENTRES_JSON = 'KB - List of Centres.json';
// Superseded by KB - List of Centres.json; its stale pre-parsed chunks must not be re-registered.
const SUPERSEDED = new Set(['KB - List of Centres.xlsx']);
// Spreadsheets cannot be parsed here (no xlsx dependency); their pre-parsed chunks are reused from the DB.
const REUSE_FROM_DB = new Set(['KB - Pricing Table.xlsx']);

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function getCategory(file) {
  if (file.startsWith('L1-faq-')) return 'FAQ';
  if (file.startsWith('L1-playbook-') || file.startsWith('KB-prep-')) return 'Playbook';
  if (file.startsWith('L1-workflow-')) return 'Workflow';
  if (file.startsWith('L2-centre-') || file.includes('Centres') || file.endsWith('.xml')) return 'Centres';
  if (file.startsWith('L2-policy-') || file.includes('commercial-rules')) return 'Policies';
  if (file.startsWith('L2-product-') || file.includes('Pricing')) return 'Products';
  if (file.startsWith('L2-region-')) return 'Regions';
  if (file.startsWith('L2-services-')) return 'Services';
  return 'Knowledge Base';
}

function getMetaName(file) {
  if (file === 'KB - Pricing Table.xlsx') return 'Pricing Table - All Centres';
  if (file === CENTRES_JSON) return 'Directory - List of Centres';
  if (file === 'ceosuite.WordPress.2026-06-24-location.xml') return 'Directory - WordPress Locations';
  if (file === 'README.md') return 'Knowledge Base - Architecture Overview';
  if (file === 'L2-commercial-rules.md') return 'Policy - Commercial Rules';
  if (file === 'KB-prep-conversion-verification.md') return 'Playbook - Conversion Verification';
  if (file === 'KB-prep-to-do-list.md') return 'Playbook - Pre-Launch To-Do List';
  if (file === 'L1-faq-ceosuite-official-website.md') return 'FAQ - CEO SUITE Official Website';

  const base = file.replace(/\.md$/, '');
  const parts = base.split('-');
  const type = parts[1] || '';
  const words = parts.slice(2).map(w => {
    const upper = w.toUpperCase();
    if (['AXA', 'KLCC', 'IDX', 'IT', 'FAQ', 'SOP', 'PIC', 'LKG', 'K11'].includes(upper)) return upper;
    if (w.toLowerCase() === 'ceosuite') return 'CEO SUITE';
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return `${typeLabel} - ${words.join(' ')}`;
}

function getTags(file, category) {
  const base = file.toLowerCase().replace(/\.[^/.]+$/, '');
  const tokens = base.split(/[-_\s]+/).filter(t => t.length > 1 && !['l1', 'l2', 'kb'].includes(t));
  return Array.from(new Set([category.toLowerCase(), ...tokens]));
}

function getDescription(content, file, metaName) {
  if (file === CENTRES_JSON) {
    return 'Official directory of CEO SUITE centres: address, phone, email, map link, operating hours, convenience and amenities.';
  }
  if (file.endsWith('.xlsx')) return `Spreadsheet data for ${metaName}.`;
  if (file.endsWith('.xml')) return 'WordPress location data containing 48 CEO SUITE office centres.';

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('#') && !line.startsWith('---') && line.length > 20) return line.slice(0, 250);
  }
  return `Comprehensive reference document for ${metaName}.`;
}

// Bump when chunkMarkdown / chunksFromCentresJson change what they produce: sync-knowledge.js mixes it into the
// knowledge base hash, so the next start-up reloads (and the proxy re-embeds) the chunks.
const CHUNKER_VERSION = 2;

const HEADING = /^#{1,6}\s/;
// Characters of real text: heading lines and markdown punctuation do not count
const textLength = t => t.split('\n').filter(l => !HEADING.test(l.trim())).join('\n').replace(/[\s\-#*|`>_=:]/g, '').length;
const MIN_TEXT = 20;

// Splits a markdown document at its #, ## and ### headings, then long sections at paragraphs.
// - Horizontal rules (---) only separate sections; they are dropped (they used to become chunks of their own).
// - A section with (almost) no text of its own, e.g. a bare "## 1. Serviced Office" heading, is joined to the next
//   section instead of becoming a chunk that has nothing to answer with.
// - Every continuation chunk of a long section starts with the section's heading, so it still says what it is about.
// Empty or heading-only chunks scored highest for short queries and pushed real answers out of the RAG top 5.
function chunkMarkdown(content, metaName, category, maxChars = 1200) {
  const text = content.replace(/\r\n/g, '\n').replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, '').replace(/\n{3,}/g, '\n\n');
  const sections = text.split(/\n(?=##?#?\s)/).map(s => s.trim()).filter(Boolean);

  // Join sections that have too little text to the next one
  const merged = [];
  let carry = '';
  for (const sec of sections) {
    if (textLength(sec) < MIN_TEXT) { carry = carry ? `${carry}\n\n${sec}` : sec; continue; }
    merged.push({ carry, sec });
    carry = '';
  }
  if (carry) {
    if (merged.length) merged[merged.length - 1].sec += `\n\n${carry}`;
    else merged.push({ carry: '', sec: carry });
  }

  const rawChunks = [];
  for (const { carry: before, sec } of merged) {
    const whole = before ? `${before}\n\n${sec}` : sec;
    if (whole.length <= maxChars) { rawChunks.push(whole); continue; }

    // The section's own heading (and the headings carried in front of it) lead every continuation chunk
    const secLines = sec.split('\n');
    const ownHeading = HEADING.test(secLines[0]) ? secLines[0] : '';
    const carriedHeadings = before.split('\n').filter(l => HEADING.test(l.trim()));
    const head = [...carriedHeadings, ownHeading].filter(Boolean).join('\n').slice(0, Math.floor(maxChars / 4));
    const budget = maxChars - (head ? head.length + 2 : 0);

    const paras = whole.split(/\n\n+/).filter(p => !(HEADING.test(p) && head.split('\n').includes(p.trim())));
    let cur = '';
    const flush = () => { if (cur) rawChunks.push(head ? `${head}\n\n${cur}` : cur); cur = ''; };
    for (const p of paras) {
      if (cur && (cur + '\n\n' + p).length > budget) flush();
      if (p.length > budget) {
        flush();
        // A paragraph longer than a chunk (usually a table): cut at line ends where possible
        let rest = p;
        while (rest.length > budget) {
          let cut = rest.lastIndexOf('\n', budget);
          if (cut < budget / 2) cut = budget;
          cur = rest.slice(0, cut).trim();
          flush();
          rest = rest.slice(cut).trim();
        }
        cur = rest;
      } else {
        cur = cur ? `${cur}\n\n${p}` : p;
      }
    }
    flush();
  }

  const finalChunks = rawChunks.filter(c => textLength(c) >= MIN_TEXT);
  if (!finalChunks.length && textLength(text) > 0) finalChunks.push(text.trim().slice(0, maxChars));
  return finalChunks.map(chunk => `[Document: ${metaName} | Category: ${category}]\n\n${chunk}`);
}

// Older website slugs of centres that KB - List of Centres.json also covers (the WordPress export keeps
// legacy and translated copies of the same centre, which would contradict the JSON).
const LEGACY_XML_SLUGS = [
  'beijing-the-exchange-twin-tower',
  'manila-lkg-tower',
  'lujiazui-financial-plaza',
  'seoul-gangnam-parnas-tower',
  'china-sunshine-financial-center',
];

// Slugs of every centre described by KB - List of Centres.json (taken from its website URLs)
function centreSlugsFromCentresJson(jsonText) {
  const slugs = JSON.parse(jsonText)
    .map(c => ((c.contact_information || {}).website || '').replace(/\/+$/, '').split('/').pop())
    .filter(Boolean);
  return new Set([...slugs, ...LEGACY_XML_SLUGS]);
}

// The export holds several copies of the same location (translations) plus drafts. Index one chunk per
// published slug and leave out centres that KB - List of Centres.json is the source of truth for
// (skipSlugs), so the assistant never sees two versions of the same centre.
// WhatsApp numbers are intentionally not exposed by the bot, so they are not indexed either.
function parseXmlLocations(xmlContent, opts = {}) {
  const skipSlugs = opts.skipSlugs || new Set();
  const seen = new Set();
  const items = xmlContent.split('<item>').slice(1);
  const chunks = [];

  for (const it of items) {
    const itemXml = it.split('</item>')[0];
    const status = (itemXml.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/) || [])[1];
    const slug = (itemXml.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/) || [])[1];
    if (status && status !== 'publish') continue;
    if (slug && (skipSlugs.has(slug) || seen.has(slug))) continue;
    if (slug) seen.add(slug);
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'CEO SUITE Centre';

    const postMeta = {};
    const metaRegex = /<wp:meta_key><!\[CDATA\[(.*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>/g;
    let m;
    while ((m = metaRegex.exec(itemXml)) !== null) postMeta[m[1]] = m[2].trim();

    const fullAddress = [postMeta.address, postMeta.address2].filter(Boolean).join(', ');
    const welcome = (postMeta.welcome_content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    let md = '[Document: Directory - WordPress Locations | Category: Centres]\n\n';
    md += `## Centre: ${title}\n`;
    if (postMeta.area) md += `- **Area/District**: ${postMeta.area}\n`;
    if (fullAddress) md += `- **Address**: ${fullAddress}\n`;
    if (postMeta.phone) md += `- **Phone**: ${postMeta.phone}\n`;
    if (postMeta.email) md += `- **Email**: ${postMeta.email}\n`;
    if (postMeta.latitude && postMeta.longitude) md += `- **Coordinates**: Latitude ${postMeta.latitude}, Longitude ${postMeta.longitude}\n`;
    if (welcome) md += `\n### Overview\n${welcome}\n`;
    chunks.push(md.trim());
  }
  return chunks;
}

const stripMdLinks = t => String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
const usableUrl = u => /^https?:\/\//.test(u || '') && !/\.\.\.$/.test(u);

// One chunk per centre, every KB field included, so retrieval can answer address / hours / email / map link.
function chunksFromCentresJson(jsonText) {
  const centres = JSON.parse(jsonText);
  const metaName = getMetaName(CENTRES_JSON);
  return centres.map(c => {
    const ci = c.contact_information || {};
    const oh = c.operating_hours || {};
    const lines = [`[Document: ${metaName} | Category: Centres]`, '', `## Centre: ${c.centre_name} (${c.brand})`];
    if (ci.address) lines.push(`- **Address**: ${stripMdLinks(ci.address)}`);
    if (usableUrl(ci.location_url)) lines.push(`- **Location map link**: ${ci.location_url}`);
    if (ci.phone) lines.push(`- **Phone**: ${ci.phone}`);
    if (ci.fax) lines.push(`- **Fax**: ${ci.fax}`);
    if (ci.email) lines.push(`- **Email**: ${ci.email}`);
    if (ci.website) lines.push(`- **Website**: ${ci.website}`);
    if (oh.opening_time && oh.closing_time) {
      lines.push(`- **Operating hours**: ${oh.opening_time} - ${oh.closing_time}${oh.timezone ? ` (${oh.timezone})` : ''}`);
    }
    if (c.description) lines.push('', '### Description', c.description);
    if (Array.isArray(c.convenience) && c.convenience.length) {
      lines.push('', '### Convenience', ...c.convenience.map(x => `- ${x}`));
    }
    if (Array.isArray(c.amenities) && c.amenities.length) {
      lines.push('', '### Amenities', ...c.amenities.map(x => `- ${x}`));
    }
    return lines.join('\n');
  });
}

// The AI proxy's RAG isolation migration (ai-agent-proxy migrations/002_rag_isolation.sql) adds these columns.
// Once they exist the proxy searches only chunks whose flow_id/tenant_id columns match the bot, so rows written
// without them are never found. `rows` are information_schema.columns rows (table_name, column_name).
const ISOLATION_KEYS = { flow_id: 'flowId', tenant_id: 'tenantId', bot_name: 'botName' };

function isolationColumns(rows, table, keys) {
  const present = new Set(rows.filter(r => r.table_name === table).map(r => r.column_name));
  const names = Object.keys(ISOLATION_KEYS).filter(c => present.has(c));
  return { names, values: names.map(c => keys[ISOLATION_KEYS[c]]) };
}

module.exports = {
  isolationColumns,
  CENTRES_JSON,
  SUPERSEDED,
  REUSE_FROM_DB,
  sha256,
  getCategory,
  getMetaName,
  getTags,
  getDescription,
  chunkMarkdown,
  CHUNKER_VERSION,
  parseXmlLocations,
  centreSlugsFromCentresJson,
  LEGACY_XML_SLUGS,
  chunksFromCentresJson,
};
