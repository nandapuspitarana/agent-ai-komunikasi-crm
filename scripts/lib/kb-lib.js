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

function chunkMarkdown(content, metaName, category, maxChars = 1200) {
  const sections = content.split(/\n(?=##?#?\s)/);
  const rawChunks = [];

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      rawChunks.push(trimmed);
      continue;
    }
    const paras = trimmed.split(/\n\n+/);
    let cur = '';
    for (const p of paras) {
      if ((cur + '\n\n' + p).length <= maxChars) {
        cur = cur ? cur + '\n\n' + p : p;
      } else {
        if (cur) rawChunks.push(cur);
        if (p.length > maxChars) {
          for (let i = 0; i < p.length; i += maxChars - 100) rawChunks.push(p.slice(i, i + maxChars));
          cur = '';
        } else {
          cur = p;
        }
      }
    }
    if (cur) rawChunks.push(cur);
  }

  const finalChunks = rawChunks.length > 0 ? rawChunks : [content.trim()];
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

module.exports = {
  CENTRES_JSON,
  SUPERSEDED,
  REUSE_FROM_DB,
  sha256,
  getCategory,
  getMetaName,
  getTags,
  getDescription,
  chunkMarkdown,
  parseXmlLocations,
  centreSlugsFromCentresJson,
  LEGACY_XML_SLUGS,
  chunksFromCentresJson,
};
