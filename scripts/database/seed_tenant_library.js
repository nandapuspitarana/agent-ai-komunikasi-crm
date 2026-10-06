const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING TENANT DOCUMENT LIBRARIES ---');

  // 1. Fetch 71 distinct KB documents from public.crm_documents
  const docs71 = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (filename) id, filename, file_type, metadata, chunk_count
    FROM public.crm_documents
    WHERE metadata->>'category' IS NOT NULL
    ORDER BY filename, created_at DESC
  `);
  console.log(`Found ${docs71.length} KB documents in public.crm_documents.`);

  // 2. Fetch all tenants
  const tenants = await prisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants:`, tenants.map(t => `${t.name} (${t.id})`));

  // 3. Fetch active flow
  const activeFlow = await prisma.flow.findFirst();
  console.log(`Active Flow: ${activeFlow?.name} (${activeFlow?.id})`);

  // Clear existing KnowledgeDocuments to prevent duplicates
  await prisma.knowledgeDocument.deleteMany({});
  console.log('Cleared old KnowledgeDocument records.');

  let totalLibraryInserted = 0;
  let totalFlowInserted = 0;

  // 4. For every tenant, insert the 71 documents as MASTER LIBRARY DOCUMENTS (flowId = null)
  for (const tenant of tenants) {
    console.log(`Seeding library for tenant: "${tenant.name}" (${tenant.id})...`);
    for (const doc of docs71) {
      const meta = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
      await prisma.knowledgeDocument.create({
        data: {
          id: crypto.randomUUID(),
          flowId: null, // MASTER LIBRARY: NEVER CASCADE DELETED!
          tenantId: tenant.id,
          metaName: meta.name || doc.filename,
          description: meta.description || null,
          category: meta.category || 'Knowledge Base',
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          filename: doc.filename,
          fileType: doc.file_type || 'md',
          status: 'ready',
          chunkCount: doc.chunk_count || 0,
          proxyDocId: doc.id,
          errorMsg: null,
        }
      });
      totalLibraryInserted++;
    }
  }

  // 5. If active flow exists, link tenant and seed documents for this flow
  if (activeFlow) {
    console.log(`Linking flow ${activeFlow.id} to tenant ${activeFlow.tenantId}...`);
    await prisma.tenant.update({
      where: { id: activeFlow.tenantId },
      data: {
        activeFlowId: activeFlow.id,
        aiEnabled: true
      }
    });

    console.log(`Populating documents for active flow: ${activeFlow.name}...`);
    for (const doc of docs71) {
      const meta = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
      await prisma.knowledgeDocument.create({
        data: {
          id: crypto.randomUUID(),
          flowId: activeFlow.id,
          tenantId: activeFlow.tenantId,
          metaName: meta.name || doc.filename,
          description: meta.description || null,
          category: meta.category || 'Knowledge Base',
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          filename: doc.filename,
          fileType: doc.file_type || 'md',
          status: 'ready',
          chunkCount: doc.chunk_count || 0,
          proxyDocId: doc.id,
          errorMsg: null,
        }
      });
      totalFlowInserted++;
    }

    // Update flow_id in public.crm_documents and crm_document_chunks for RAG
    await prisma.$executeRawUnsafe(`
      UPDATE public.crm_documents
      SET metadata = jsonb_set(metadata, '{flow_id}', $1::jsonb)
      WHERE metadata->>'category' IS NOT NULL
    `, JSON.stringify(activeFlow.id));

    await prisma.$executeRawUnsafe(`
      UPDATE public.crm_document_chunks
      SET metadata = jsonb_set(metadata, '{flow_id}', $1::jsonb)
      WHERE metadata->>'category' IS NOT NULL
    `, JSON.stringify(activeFlow.id));
    console.log(`Updated flow_id in public.crm_documents and chunks to ${activeFlow.id}.`);
  }

  console.log('\n--- VERIFICATION ---');
  const countLibrary = await prisma.knowledgeDocument.count({ where: { flowId: null } });
  const countInFlow = await prisma.knowledgeDocument.count({ where: { flowId: activeFlow ? activeFlow.id : '' } });
  const total = await prisma.knowledgeDocument.count();

  console.log({
    'Master Library Docs (flowId = null)': countLibrary,
    'Active Flow Docs': countInFlow,
    'Total KnowledgeDocuments': total
  });

  console.log('SUCCESS: Tenant libraries seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
