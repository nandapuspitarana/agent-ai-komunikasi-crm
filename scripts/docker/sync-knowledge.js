/**
 * sync-knowledge.js
 *
 * Runs on every container start (see Dockerfile / docker-compose.yml) so that an admin only has to
 * `docker compose up --build`: the CS flow (intents) and the knowledge base files that were baked into
 * the image are loaded into the database.
 *
 *   - Idempotent. Flow intents are only rewritten when UserJourney-CS-Support.json changed since the last
 *     sync, KB documents only when the knowledge base folder changed. Edits an admin makes in the builder
 *     therefore survive restarts until a new image carries new content.
 *   - Never blocks the web server: the caller ignores a non-zero exit.
 *
 * Environment:
 *   KB_SYNC            "false" to skip everything (default: true)
 *   KB_TENANT_ID       tenant to load into. Default: the tenant that already owns the flow, else the only tenant.
 *   KB_ALIGN_LANGUAGE  "false" to leave tenant.visitorConfig.language alone (default: true = when this flow is the
 *                      tenant's active flow, the tenant language follows the flow's language, so the report form,
 *                      handoff texts and bot replies are not a mix of English and Indonesian)
 *   KB_ACTIVATE_FLOW   "true"  - activate the flow when it is created (default)
 *                      "force" - activate on every sync
 *                      "false" - never touch the tenant's active flow
 *
 * Flags: --dry-run  build the plan from the files and print it, without touching the database.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('../lib/kb-lib');

const ROOT = path.join(__dirname, '..', '..');
const FLOW_FILE = path.join(ROOT, 'userjourney', 'UserJourney-CS-Support.json');
const KB_DIR = path.join(ROOT, 'userjourney', 'knowledge base');
const BOT_NAME = 'Claire CEOSUITE';

const DRY_RUN = process.argv.includes('--dry-run');
const log = (...a) => console.log('[sync-knowledge]', ...a);

function buildPlan() {
  const flowText = fs.readFileSync(FLOW_FILE, 'utf8');
  const flowJson = JSON.parse(flowText);
  if (flowJson.type !== 'agent_flow' || !flowJson.data) throw new Error(`${FLOW_FILE} is not an agent_flow export`);

  const files = fs.readdirSync(KB_DIR).filter(f => fs.statSync(path.join(KB_DIR, f)).isFile()).sort();
  const hasCentresJson = files.includes(lib.CENTRES_JSON);

  const docs = [];
  const skipped = [];
  const kbHasher = crypto.createHash('sha256');

  for (const file of files) {
    const filePath = path.join(KB_DIR, file);
    const raw = fs.readFileSync(filePath);
    kbHasher.update(file).update(raw);

    if (lib.SUPERSEDED.has(file) && hasCentresJson) {
      skipped.push(`${file} (superseded by ${lib.CENTRES_JSON})`);
      continue;
    }

    const ext = path.extname(file).replace('.', '').toLowerCase();
    const category = lib.getCategory(file);
    const metaName = lib.getMetaName(file);
    const doc = { file, ext, category, metaName, tags: lib.getTags(file, category), chunks: null, reuseFromDb: false };

    if (lib.REUSE_FROM_DB.has(file)) {
      doc.reuseFromDb = true;
      doc.description = 'Official pricing table for all CEO SUITE centres, services, and packages.';
    } else if (file === lib.CENTRES_JSON) {
      doc.chunks = lib.chunksFromCentresJson(raw.toString('utf8'));
      doc.description = lib.getDescription('', file, metaName);
    } else if (ext === 'xml') {
      const skipSlugs = hasCentresJson
        ? lib.centreSlugsFromCentresJson(fs.readFileSync(path.join(KB_DIR, lib.CENTRES_JSON), 'utf8'))
        : new Set();
      doc.chunks = lib.parseXmlLocations(raw.toString('utf8'), { skipSlugs });
      doc.description = 'WordPress location data for centres that are not in KB - List of Centres.json.';
    } else if (ext === 'md') {
      const content = raw.toString('utf8');
      doc.chunks = lib.chunkMarkdown(content, metaName, category);
      doc.description = lib.getDescription(content, file, metaName);
    } else {
      skipped.push(`${file} (unsupported type .${ext})`);
      continue;
    }
    docs.push(doc);
  }

  return {
    flowJson,
    flowHash: lib.sha256(flowText),
    kbHash: kbHasher.digest('hex'),
    docs,
    skipped,
  };
}

async function resolveTenant(prisma, flowNames) {
  const wanted = process.env.KB_TENANT_ID;
  if (wanted) {
    const t = await prisma.tenant.findUnique({ where: { id: wanted } });
    if (!t) throw new Error(`KB_TENANT_ID=${wanted} does not exist`);
    return t;
  }
  const owned = await prisma.flow.findFirst({ where: { name: { in: flowNames } }, include: { tenant: true } });
  if (owned) return owned.tenant;
  const tenants = await prisma.tenant.findMany({ take: 2 });
  if (tenants.length === 1) return tenants[0];
  if (tenants.length === 0) return null;
  throw new Error('More than one tenant exists and none owns the flow yet - set KB_TENANT_ID');
}

async function syncFlow(prisma, plan, tenant) {
  const { name, description, config, metadata, intents } = plan.flowJson.data;
  const flowNames = [name, `${name} (Imported)`];
  const activate = (process.env.KB_ACTIVATE_FLOW || 'true').toLowerCase();

  let flow = await prisma.flow.findFirst({ where: { tenantId: tenant.id, name: { in: flowNames } } });
  const created = !flow;
  const meta = (flow && flow.metadata) || {};

  const cfg = { ...(config || {}) };
  const start = (intents || []).find(i => i.name === 'Start / Main Menu' || i.name === 'Start');
  if (start) {
    cfg.welcomeMessage = start.response;
    cfg.welcomeMessageType = start.responseType || 'text';
    cfg.welcomeMessageOptions = start.options || '';
  }

  if (!flow || meta.sourceHash !== plan.flowHash) {
    flow = await prisma.$transaction(async tx => {
      const data = {
        name,
        description: description || null,
        config: cfg,
        metadata: { ...(metadata || {}), ...meta, sourceHash: plan.flowHash },
      };
      const f = flow
        ? await tx.flow.update({ where: { id: flow.id }, data })
        : await tx.flow.create({ data: { ...data, tenantId: tenant.id } });
      await tx.intent.deleteMany({ where: { flowId: f.id } });
      await tx.intent.createMany({
        data: intents.map(i => ({
          flowId: f.id,
          name: i.name || 'Unnamed Intent',
          trainingPhrases: i.trainingPhrases || [],
          responseType: i.responseType || 'text',
          response: i.response || '',
          options: i.options || null,
          metadata: i.metadata || {},
        })),
      });
      return f;
    });
    log(`flow "${name}" ${created ? 'created' : 'updated'} with ${intents.length} intents (${flow.id})`);
  } else {
    log(`flow "${name}" already up to date (${intents.length} intents)`);
  }

  // A second flow with the same content would give the tenant two near-identical bots to choose from.
  const twins = await prisma.flow.findMany({
    where: { tenantId: tenant.id, name: { in: flowNames }, id: { not: flow.id } },
    select: { id: true, name: true },
  });
  for (const t of twins) {
    log(`WARNING: duplicate flow "${t.name}" (${t.id}) also exists for this tenant; delete the one you do not use in the admin UI`);
  }

  if (activate === 'force' || (activate === 'true' && created)) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { activeFlowId: flow.id, aiEnabled: true } });
    log(`tenant "${tenant.name}" now uses this flow as its active flow`);
  } else if (!tenant.activeFlowId && activate !== 'false') {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { activeFlowId: flow.id, aiEnabled: true } });
    log(`tenant "${tenant.name}" had no active flow; set it to this flow`);
  }

  // Keep the tenant language in step with the flow it uses.
  if ((process.env.KB_ALIGN_LANGUAGE || 'true').toLowerCase() !== 'false') {
    const fresh = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    if (fresh && fresh.activeFlowId === flow.id) {
      const flowLang = String(cfg.language || 'en').toLowerCase().startsWith('id') ? 'id' : 'en';
      const vc = fresh.visitorConfig && typeof fresh.visitorConfig === 'object' && !Array.isArray(fresh.visitorConfig)
        ? fresh.visitorConfig : {};
      if (String(vc.language || '').toLowerCase() !== flowLang) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { visitorConfig: { ...vc, language: flowLang } },
        });
        log(`tenant language set to "${flowLang}" to match the flow (was "${vc.language || 'unset'}")`);
      }
    }
  }
  return flow;
}

async function syncKnowledge(prisma, plan, tenant, flow) {
  const meta = flow.metadata || {};
  const hasDocs = await prisma.knowledgeDocument.count({ where: { flowId: flow.id } });
  if (meta.kbHash === plan.kbHash && hasDocs > 0) {
    log(`knowledge base already up to date (${hasDocs} documents)`);
    return;
  }

  const tables = await prisma.$queryRawUnsafe(`
    SELECT to_regclass('public.crm_documents') AS docs, to_regclass('public.crm_document_chunks') AS chunks,
           to_regclass('public.documents') AS legacy
  `);
  if (!tables[0].docs || !tables[0].chunks || !tables[0].legacy) {
    log('WARNING: public.crm_documents / crm_document_chunks / documents not found in this database.');
    log('         They belong to the AI agent proxy; start it against this database, then restart this container.');
    return;
  }

  // Pre-parsed spreadsheet chunks already in the vector store (taken before this flow's rows are cleared).
  const reused = {};
  for (const d of plan.docs.filter(x => x.reuseFromDb)) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT ON (chunk_index) chunk_index, content FROM public.crm_document_chunks
       WHERE metadata->>'filename' = $1 ORDER BY chunk_index`, d.file);
    reused[d.file] = rows.map(r => r.content);
    if (!rows.length) log(`WARNING: no existing chunks for ${d.file}; it is skipped (upload it through the admin UI)`);
  }

  // Replace this flow's documents (same scoping as scripts/database/register_all_knowledge_base.js)
  await prisma.knowledgeDocument.deleteMany({ where: { flowId: flow.id } });
  const old = await prisma.$queryRawUnsafe(`SELECT id FROM public.crm_documents WHERE metadata->>'flow_id' = $1`, flow.id);
  if (old.length) {
    const ids = old.map(o => o.id);
    await prisma.$executeRawUnsafe(`DELETE FROM public.crm_document_chunks WHERE document_id = ANY($1::uuid[])`, ids);
    await prisma.$executeRawUnsafe(`DELETE FROM public.crm_documents WHERE id = ANY($1::uuid[])`, ids);
  }
  await prisma.$executeRawUnsafe(`DELETE FROM public.documents WHERE metadata->>'flow_id' = $1`, flow.id);

  let docCount = 0;
  let chunkTotal = 0;
  for (const d of plan.docs) {
    const chunks = d.reuseFromDb ? reused[d.file] : d.chunks;
    if (!chunks || !chunks.length) continue;

    const docUuid = crypto.randomUUID();
    const docMeta = {
      name: d.metaName, flow_id: flow.id, tenant_id: tenant.id, bot_name: BOT_NAME,
      category: d.category, tags: d.tags, description: d.description,
    };
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.crm_documents (id, filename, file_type, source_url, metadata, status, chunk_count, error_message, created_at, updated_at)
      VALUES ($1::uuid, $2, $3, NULL, $4::jsonb, 'ready', $5, NULL, NOW(), NOW())`,
      docUuid, d.file, d.ext, JSON.stringify(docMeta), chunks.length);

    for (let i = 0; i < chunks.length; i++) {
      const chunkMeta = JSON.stringify({
        document_id: docUuid, filename: d.file, name: d.metaName, flow_id: flow.id, tenant_id: tenant.id,
        chunk_index: i, category: d.category, tags: d.tags,
      });
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.crm_document_chunks (id, document_id, chunk_index, content, embedding, metadata, created_at)
        VALUES ($1::uuid, $2::uuid, $3, $4, NULL, $5::jsonb, NOW())`,
        crypto.randomUUID(), docUuid, i, chunks[i], chunkMeta);
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.documents (content, metadata, embedding) VALUES ($1, $2::jsonb, NULL)`, chunks[i], chunkMeta);
    }

    await prisma.knowledgeDocument.create({
      data: {
        id: crypto.randomUUID(), flowId: flow.id, tenantId: tenant.id, metaName: d.metaName,
        description: d.description, category: d.category, tags: d.tags, filename: d.file, fileType: d.ext,
        status: 'ready', chunkCount: chunks.length, proxyDocId: docUuid, errorMsg: null,
      },
    });
    docCount++;
    chunkTotal += chunks.length;
  }

  await prisma.flow.update({
    where: { id: flow.id },
    data: { metadata: { ...meta, kbHash: plan.kbHash } },
  });
  log(`knowledge base synced: ${docCount} documents, ${chunkTotal} chunks`);
}

async function main() {
  if ((process.env.KB_SYNC || 'true').toLowerCase() === 'false') {
    log('KB_SYNC=false, skipping');
    return;
  }

  const plan = buildPlan();
  log(`flow "${plan.flowJson.data.name}": ${plan.flowJson.data.intents.length} intents, hash ${plan.flowHash.slice(0, 12)}`);
  log(`knowledge base: ${plan.docs.length} documents, hash ${plan.kbHash.slice(0, 12)}`);
  for (const s of plan.skipped) log(`skipped: ${s}`);

  if (DRY_RUN) {
    for (const d of plan.docs) {
      log(`  ${d.file} -> ${d.metaName} [${d.category}] ${d.reuseFromDb ? 'reuses existing DB chunks' : d.chunks.length + ' chunks'}`);
    }
    return;
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const flowNames = [plan.flowJson.data.name, `${plan.flowJson.data.name} (Imported)`];
    const tenant = await resolveTenant(prisma, flowNames);
    if (!tenant) {
      log('No tenant exists yet. Create the tenant/admin first, then restart the container to load the flow and knowledge base.');
      return;
    }
    log(`tenant: "${tenant.name}" (${tenant.id})`);
    const flow = await syncFlow(prisma, plan, tenant);
    await syncKnowledge(prisma, plan, tenant, await prisma.flow.findUnique({ where: { id: flow.id } }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('[sync-knowledge] failed:', err && err.message ? err.message : err);
  process.exit(1);
});
