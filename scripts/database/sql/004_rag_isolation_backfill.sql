-- 004_rag_isolation_backfill.sql
--
-- Run AFTER the AI proxy's RAG isolation migration (ai-agent-proxy migrations/002_rag_isolation.sql), which adds
-- flow_id / tenant_id (and bot_name) columns to public.crm_documents and public.crm_document_chunks.
--
-- Once those columns exist, the proxy searches only chunks whose columns match the bot (flow) and tenant.
-- Rows written before the migration have the keys only in metadata, so they would never be found. This copies
-- them into the columns. Only NULL columns are filled, so it is safe to run again.
--
-- scripts/docker/sync-knowledge.js writes the columns itself from the version that ships with this file.

BEGIN;

UPDATE public.crm_documents
   SET flow_id   = metadata->>'flow_id',
       tenant_id = metadata->>'tenant_id',
       bot_name  = COALESCE(NULLIF(bot_name, ''), metadata->>'bot_name', '')
 WHERE flow_id IS NULL
   AND metadata ? 'flow_id' AND metadata ? 'tenant_id';

-- Chunks take the keys of their document (chunk metadata from older imports may not carry them).
UPDATE public.crm_document_chunks c
   SET flow_id   = d.flow_id,
       tenant_id = d.tenant_id
  FROM public.crm_documents d
 WHERE c.document_id = d.id
   AND c.flow_id IS NULL
   AND d.flow_id IS NOT NULL;

COMMIT;

-- Check: rows still without keys (documents that never had a flow; the scoped search ignores them).
SELECT 'crm_documents' AS table_name, count(*) FILTER (WHERE flow_id IS NULL) AS without_flow, count(*) AS total
  FROM public.crm_documents
UNION ALL
SELECT 'crm_document_chunks', count(*) FILTER (WHERE flow_id IS NULL), count(*)
  FROM public.crm_document_chunks;
