/**
 * register_all_knowledge_base.js
 * 
 * Registers and uploads all 71 Knowledge Base documents from userjourney/knowledge base/
 * into Supabase 242 PostgreSQL database:
 *   1. public.crm_documents (proxy document metadata, flow_id, tenant_id)
 *   2. public.crm_document_chunks (RAG vector chunks joined with crm_documents)
 *   3. public.documents (general documents table for compatibility)
 *   4. crm.crm_agent_KnowledgeDocument (Prisma CRM UI and widget knowledge documents)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'd7413c9e-84ba-4457-8677-77d679065a8e';
const TARGET_FLOW_ID = 'f074efea-83d9-4894-bc58-0edc9f73e67a';
const BOT_NAME = 'Claire CEOSUITE';
const KB_DIR = path.join(__dirname, '../../userjourney/knowledge base');

// 1. Categorization
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

// 2. Human-readable display title
function getMetaName(file) {
  if (file === 'KB - Pricing Table.xlsx') return 'Pricing Table - All Centres';
  if (file === 'KB - List of Centres.xlsx') return 'Directory - List of Centres';
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

// 3. Relevant tags
function getTags(file, category) {
  const base = file.toLowerCase().replace(/\.[^/.]+$/, '');
  const tokens = base.split(/[-_\s]+/).filter(t => t.length > 1 && !['l1', 'l2', 'kb'].includes(t));
  const tagSet = new Set([category.toLowerCase(), ...tokens]);
  return Array.from(tagSet);
}

// 4. Description generator
function getDescription(content, file, metaName) {
  if (file.endsWith('.xlsx')) return `Spreadsheet data for ${metaName}.`;
  if (file.endsWith('.xml')) return `WordPress location data containing 48 CEO SUITE office centres.`;

  // Look for first paragraph after H1
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('#') && !line.startsWith('---') && line.length > 20) {
      return line.slice(0, 250);
    }
  }
  return `Comprehensive reference document for ${metaName}.`;
}

// 5. Markdown chunker
function chunkMarkdown(content, metaName, category, maxChars = 1200) {
  const sections = content.split(/\n(?=##?#?\s)/);
  const rawChunks = [];

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      rawChunks.push(trimmed);
    } else {
      const paras = trimmed.split(/\n\n+/);
      let cur = '';
      for (const p of paras) {
        if ((cur + '\n\n' + p).length <= maxChars) {
          cur = cur ? cur + '\n\n' + p : p;
        } else {
          if (cur) rawChunks.push(cur);
          if (p.length > maxChars) {
            for (let i = 0; i < p.length; i += maxChars - 100) {
              rawChunks.push(p.slice(i, i + maxChars));
            }
            cur = '';
          } else {
            cur = p;
          }
        }
      }
      if (cur) rawChunks.push(cur);
    }
  }

  const finalChunks = rawChunks.length > 0 ? rawChunks : [content.trim()];
  return finalChunks.map(chunk => `[Document: ${metaName} | Category: ${category}]\n\n${chunk}`);
}

// 6. XML Location Parser
function parseXmlLocations(xmlContent) {
  const items = xmlContent.split('<item>').slice(1);
  const chunks = [];

  for (const it of items) {
    const itemXml = it.split('</item>')[0];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'CEO SUITE Centre';

    const postMeta = {};
    const metaRegex = /<wp:meta_key><!\[CDATA\[(.*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>/g;
    let m;
    while ((m = metaRegex.exec(itemXml)) !== null) {
      postMeta[m[1]] = m[2].trim();
    }

    const addr = postMeta.address || '';
    const addr2 = postMeta.address2 || '';
    const fullAddress = [addr, addr2].filter(Boolean).join(', ');
    const phone = postMeta.phone || '';
    const email = postMeta.email || '';
    const wa = postMeta.whatsapp || '';
    const lat = postMeta.latitude || '';
    const lng = postMeta.longitude || '';
    const welcome = (postMeta.welcome_content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const area = postMeta.area || '';

    let md = `[Document: Directory - WordPress Locations | Category: Centres]\n\n`;
    md += `## Centre: ${title}\n`;
    if (area) md += `- **Area/District**: ${area}\n`;
    if (fullAddress) md += `- **Address**: ${fullAddress}\n`;
    if (phone) md += `- **Phone**: ${phone}\n`;
    if (wa) md += `- **WhatsApp**: ${wa}\n`;
    if (email) md += `- **Email**: ${email}\n`;
    if (lat && lng) md += `- **Coordinates**: Latitude ${lat}, Longitude ${lng}\n`;
    if (welcome) md += `\n### Overview\n${welcome}\n`;

    chunks.push(md.trim());
  }

  return chunks;
}

async function main() {
  console.log('====================================================');
  console.log('   REGISTER KNOWLEDGE BASE ON SUPABASE 242');
  console.log('====================================================');
  console.log(`Target Tenant ID : ${TARGET_TENANT_ID}`);
  console.log(`Target Flow ID   : ${TARGET_FLOW_ID}`);
  console.log(`Bot Name         : ${BOT_NAME}`);
  console.log(`KB Directory     : ${KB_DIR}`);

  // Step 1: Ensure tenant and flow exist
  const tenant = await prisma.tenant.findUnique({ where: { id: TARGET_TENANT_ID } });
  if (!tenant) throw new Error(`Tenant ${TARGET_TENANT_ID} not found!`);

  const flow = await prisma.flow.findUnique({ where: { id: TARGET_FLOW_ID } });
  if (!flow) throw new Error(`Flow ${TARGET_FLOW_ID} not found!`);

  console.log(`\nVerified Tenant : "${tenant.name}"`);
  console.log(`Verified Flow   : "${flow.name}"`);

  // Ensure tenant activeFlowId and aiEnabled
  await prisma.tenant.update({
    where: { id: TARGET_TENANT_ID },
    data: {
      activeFlowId: TARGET_FLOW_ID,
      aiEnabled: true,
    }
  });
  console.log('Updated Tenant: activeFlowId linked and aiEnabled = true.');

  // Step 2: Fetch existing excel chunks from database
  console.log('\nFetching existing pre-parsed Excel chunks from Supabase...');
  const pricingChunksRaw = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (chunk_index) chunk_index, content
    FROM public.crm_document_chunks
    WHERE metadata->>'filename' = 'KB - Pricing Table.xlsx'
    ORDER BY chunk_index
  `);
  console.log(`Found ${pricingChunksRaw.length} chunks for KB - Pricing Table.xlsx`);

  const centresChunksRaw = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (chunk_index) chunk_index, content
    FROM public.crm_document_chunks
    WHERE metadata->>'filename' = 'KB - List of Centres.xlsx'
    ORDER BY chunk_index
  `);
  console.log(`Found ${centresChunksRaw.length} chunks for KB - List of Centres.xlsx`);

  // Step 3: Clean up any previous records for TARGET_FLOW_ID to ensure idempotency
  console.log('\nCleaning up old documents for flow in all tables...');
  
  // 3a. Prisma KnowledgeDocument
  const delPrisma = await prisma.knowledgeDocument.deleteMany({
    where: { flowId: TARGET_FLOW_ID }
  });
  console.log(`Deleted ${delPrisma.count} old records from crm.crm_agent_KnowledgeDocument.`);

  // 3b. Find old crm_documents for flow
  const oldCrmDocs = await prisma.$queryRawUnsafe(`
    SELECT id FROM public.crm_documents
    WHERE metadata->>'flow_id' = $1
  `, TARGET_FLOW_ID);

  if (oldCrmDocs.length > 0) {
    const oldIds = oldCrmDocs.map(d => d.id);
    await prisma.$executeRawUnsafe(`
      DELETE FROM public.crm_document_chunks
      WHERE document_id = ANY($1::uuid[])
    `, oldIds);
    await prisma.$executeRawUnsafe(`
      DELETE FROM public.crm_documents
      WHERE id = ANY($1::uuid[])
    `, oldIds);
    console.log(`Deleted ${oldCrmDocs.length} old records from public.crm_documents & public.crm_document_chunks.`);
  }

  // 3c. Delete old public.documents for flow
  await prisma.$executeRawUnsafe(`
    DELETE FROM public.documents
    WHERE metadata->>'flow_id' = $1
  `, TARGET_FLOW_ID);
  console.log('Cleaned up public.documents for flow.');

  // Step 4: Scan and sort all files in KB_DIR
  const files = fs.readdirSync(KB_DIR)
    .filter(f => fs.statSync(path.join(KB_DIR, f)).isFile())
    .sort();
  console.log(`\nFound ${files.length} knowledge base files to register.`);

  let totalChunksInserted = 0;
  let totalDocsInserted = 0;
  const categoryCounts = {};

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const filePath = path.join(KB_DIR, file);
    const ext = path.extname(file).replace('.', '').toLowerCase();
    const category = getCategory(file);
    const metaName = getMetaName(file);
    const tags = getTags(file, category);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    let chunks = [];
    let description = '';

    if (file === 'KB - Pricing Table.xlsx') {
      chunks = pricingChunksRaw.map(c => c.content);
      description = 'Official pricing table for all CEO SUITE centres, services, and packages.';
    } else if (file === 'KB - List of Centres.xlsx') {
      chunks = centresChunksRaw.map(c => c.content);
      description = 'Complete directory and list of CEO SUITE business centres across Asia.';
    } else if (file.endsWith('.xml')) {
      const xmlRaw = fs.readFileSync(filePath, 'utf8');
      chunks = parseXmlLocations(xmlRaw);
      description = 'Official WordPress location database containing 48 CEO SUITE office centres.';
    } else {
      // Markdown files
      const content = fs.readFileSync(filePath, 'utf8');
      chunks = chunkMarkdown(content, metaName, category);
      description = getDescription(content, file, metaName);
    }

    const docUuid = crypto.randomUUID();
    const prismaDocId = crypto.randomUUID();

    const docMetadata = {
      name: metaName,
      flow_id: TARGET_FLOW_ID,
      tenant_id: TARGET_TENANT_ID,
      bot_name: BOT_NAME,
      category: category,
      tags: tags,
      description: description,
    };

    // Insert into public.crm_documents
    await prisma.$executeRawUnsafe(`
      INSERT INTO public.crm_documents (
        id, filename, file_type, source_url, metadata, status, chunk_count, error_message, created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, NULL, $4::jsonb, 'ready', $5, NULL, NOW(), NOW()
      )
    `, docUuid, file, ext, JSON.stringify(docMetadata), chunks.length);

    // Insert chunks into public.crm_document_chunks & public.documents
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunkText = chunks[cIdx];
      const chunkUuid = crypto.randomUUID();
      const chunkMetadata = {
        document_id: docUuid,
        filename: file,
        name: metaName,
        flow_id: TARGET_FLOW_ID,
        tenant_id: TARGET_TENANT_ID,
        chunk_index: cIdx,
        category: category,
        tags: tags,
      };

      await prisma.$executeRawUnsafe(`
        INSERT INTO public.crm_document_chunks (
          id, document_id, chunk_index, content, embedding, metadata, created_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, NULL, $5::jsonb, NOW()
        )
      `, chunkUuid, docUuid, cIdx, chunkText, JSON.stringify(chunkMetadata));

      // Also add to public.documents for general compatibility
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.documents (
          content, metadata, embedding
        ) VALUES (
          $1, $2::jsonb, NULL
        )
      `, chunkText, JSON.stringify(chunkMetadata));
    }

    // Insert into crm.crm_agent_KnowledgeDocument
    await prisma.knowledgeDocument.create({
      data: {
        id: prismaDocId,
        flowId: TARGET_FLOW_ID,
        tenantId: TARGET_TENANT_ID,
        metaName: metaName,
        description: description,
        category: category,
        tags: tags,
        filename: file,
        fileType: ext,
        status: 'ready',
        chunkCount: chunks.length,
        proxyDocId: docUuid,
        errorMsg: null,
      }
    });

    totalDocsInserted++;
    totalChunksInserted += chunks.length;

    process.stdout.write(
      `[${String(idx + 1).padStart(2)}/${files.length}] ` +
      `Registered: ${metaName.padEnd(45).slice(0, 45)} ` +
      `[${category.padEnd(10)}] ` +
      `-> ${chunks.length} chunks\n`
    );
  }

  // Step 5: Verification & Summary
  console.log('\n====================================================');
  console.log('   REGISTRATION COMPLETED - RUNNING VERIFICATION');
  console.log('====================================================');

  const countPrisma = await prisma.knowledgeDocument.count({
    where: { flowId: TARGET_FLOW_ID }
  });
  const countCrmDocs = await prisma.$queryRawUnsafe(`
    SELECT count(*) as count FROM public.crm_documents
    WHERE metadata->>'flow_id' = $1
  `, TARGET_FLOW_ID);
  const countCrmChunks = await prisma.$queryRawUnsafe(`
    SELECT count(*) as count FROM public.crm_document_chunks
    WHERE metadata->>'flow_id' = $1
  `, TARGET_FLOW_ID);
  const countPublicDocs = await prisma.$queryRawUnsafe(`
    SELECT count(*) as count FROM public.documents
    WHERE metadata->>'flow_id' = $1
  `, TARGET_FLOW_ID);

  console.log({
    'crm.crm_agent_KnowledgeDocument (Prisma)': countPrisma,
    'public.crm_documents': Number(countCrmDocs[0].count),
    'public.crm_document_chunks': Number(countCrmChunks[0].count),
    'public.documents': Number(countPublicDocs[0].count),
  });

  console.log('\nBreakdown by Category:');
  console.table(categoryCounts);

  console.log(`\nSUCCESS: All ${totalDocsInserted} knowledge base documents (${totalChunksInserted} chunks) are registered on Supabase 242!`);
}

main()
  .catch((err) => {
    console.error('Fatal error during registration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
