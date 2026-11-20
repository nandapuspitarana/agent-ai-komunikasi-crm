-- =============================================================================
-- 001_lockdown_anon_access.sql  —  close public (anon key) access to CRM data
-- =============================================================================
-- WHY
--   NEXT_PUBLIC_SUPABASE_ANON_KEY is shipped to every browser. scripts/database/
--   grant_anon.js granted SELECT on *all* tables in schema "crm" to `anon`, and
--   no table has RLS, so anyone could read crm_agent_User (password hashes),
--   PasswordResetToken, Integration credentials, VisitorProfile PII, etc. via
--   the Supabase REST API. The AI proxy tables in "public" (crm_documents,
--   crm_document_chunks, crm_agent_sessions, crm_bookings ...) have the same
--   problem through Supabase's default grants.
--
-- WHAT THIS DOES (safe to run now)
--   * Revokes every privilege of `anon` and `authenticated` on all CRM tables
--     and enables RLS on them (deny-by-default for API roles).
--   * Prisma connects as the table owner and the AI proxy uses `service_role`;
--     both bypass RLS, so the apps keep working.
--   * TEMPORARY EXCEPTION: crm_agent_Message and crm_agent_ChatSession keep
--     anon SELECT, because the inbox, GlobalNotification and the web widget
--     subscribe to them through Supabase Realtime with the anon key. They
--     remain readable by anyone until step 2 (see bottom) is done.
--
-- HOW TO RUN
--   1. Take a backup / snapshot first.
--   2. Run in the Supabase SQL editor (or psql as the postgres user).
--   3. Run the verification query at the end; it must return no rows except
--      the two temporary realtime tables.
--   Do NOT run scripts/database/grant_anon.js again (it re-opens everything).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Next.js CRM tables (schema "crm")
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  crm_tables text[] := ARRAY[
    'crm_agent_User', 'crm_agent_AuditLog', 'crm_agent_PasswordResetToken',
    'crm_agent_Tenant', 'crm_agent_Integration', 'crm_agent_Flow', 'crm_agent_Intent',
    'crm_agent_ChatSession', 'crm_agent_Message', 'crm_agent_KnowledgeDocument',
    'crm_agent_Asset', 'crm_agent_SessionContext', 'crm_agent_MessageQueue',
    'crm_agent_VisitorProfile'
  ];
BEGIN
  FOREACH t IN ARRAY crm_tables LOOP
    IF to_regclass(format('crm.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON crm.%I FROM anon, authenticated', t);
      EXECUTE format('ALTER TABLE crm.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- New tables must not become public automatically.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'crm') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA crm REVOKE ALL ON TABLES FROM anon, authenticated;
  END IF;
END $$;

-- TEMPORARY (until step 2): realtime still subscribes with the anon key.
-- RLS is on, so anon also needs a SELECT policy on these two tables.
DO $$
BEGIN
  IF to_regclass('crm."crm_agent_Message"') IS NOT NULL THEN
    GRANT SELECT ON crm."crm_agent_Message" TO anon;
    DROP POLICY IF EXISTS "tmp_realtime_anon_read" ON crm."crm_agent_Message";
    CREATE POLICY "tmp_realtime_anon_read" ON crm."crm_agent_Message" FOR SELECT TO anon USING (true);
  END IF;
  IF to_regclass('crm."crm_agent_ChatSession"') IS NOT NULL THEN
    GRANT SELECT ON crm."crm_agent_ChatSession" TO anon;
    DROP POLICY IF EXISTS "tmp_realtime_anon_read" ON crm."crm_agent_ChatSession";
    CREATE POLICY "tmp_realtime_anon_read" ON crm."crm_agent_ChatSession" FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. AI proxy tables (schema "public") — only service_role should touch them
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  proxy_tables text[] := ARRAY[
    'crm_rooms', 'crm_bookings', 'crm_agent_sessions', 'crm_documents',
    'crm_document_chunks', 'ai_trace_logs', 'ai_model_pricing'
  ];
BEGIN
  FOREACH t IN ARRAY proxy_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- RAG / maintenance RPCs: callable by service_role only.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('match_document_chunks', 'match_document_chunks_scoped', 'purge_old_trace_logs')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFY: tables anon/authenticated can still read. Expected result: only
-- crm.crm_agent_Message and crm.crm_agent_ChatSession (temporary).
-- ---------------------------------------------------------------------------
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee IN ('anon', 'authenticated')
--   AND table_schema IN ('crm', 'public')
-- ORDER BY 1, 2, 3, 4;

-- =============================================================================
-- NEXT: 002_realtime_jwt_policies.sql (realtime via server-minted JWT), then
-- 003_drop_anon_realtime.sql once the new app version is deployed.
-- =============================================================================
