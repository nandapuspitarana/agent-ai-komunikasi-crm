-- =============================================================================
-- 003_drop_anon_realtime.sql  —  remove the temporary anon read access
-- =============================================================================
-- Run ONLY after:
--   1. 002_realtime_jwt_policies.sql has been applied, and
--   2. the app version that fetches realtime tokens is deployed and
--      SUPABASE_JWT_SECRET is set (check: inbox and widget still update live).
-- After this, the public anon key can read no CRM table at all.
-- Rollback (re-opens the leak!): re-run the TEMPORARY block of 001.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "tmp_realtime_anon_read" ON crm."crm_agent_Message";
DROP POLICY IF EXISTS "tmp_realtime_anon_read" ON crm."crm_agent_ChatSession";
REVOKE ALL ON crm."crm_agent_Message" FROM anon;
REVOKE ALL ON crm."crm_agent_ChatSession" FROM anon;

COMMIT;

-- VERIFY: must return no rows for grantee 'anon'; 'authenticated' should only
-- have SELECT on crm_agent_ChatSession and crm_agent_Message.
-- SELECT table_schema, table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee IN ('anon', 'authenticated')
--   AND table_schema IN ('crm', 'public')
-- ORDER BY 1, 2, 3, 4;
