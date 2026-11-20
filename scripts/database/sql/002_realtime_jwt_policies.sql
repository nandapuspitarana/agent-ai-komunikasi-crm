-- =============================================================================
-- 002_realtime_jwt_policies.sql  —  realtime access via server-minted JWTs
-- =============================================================================
-- Run AFTER 001_lockdown_anon_access.sql. Additive and safe to run before or
-- after deploying the app version that uses /api/realtime/token and
-- /api/widget/realtime-token: the temporary anon policies from 001 still work
-- until 003 removes them.
--
-- The Next.js server signs tokens with SUPABASE_JWT_SECRET (src/lib/supabase-jwt.ts):
--   iss = 'crm-agent', role = 'authenticated', plus exactly one scope:
--     crm_role = 'SUPER_ADMIN'                 -> all chats
--     tenant_id = '<tenant id>'                -> that tenant's chats
--     chat_session_id = '<chat session id>'    -> one chat (widget visitor)
-- The `iss` check keeps out tokens issued by Supabase Auth itself (anyone who
-- can sign up there would otherwise also be `authenticated`).
-- =============================================================================

BEGIN;

GRANT USAGE ON SCHEMA crm TO authenticated;
GRANT SELECT ON crm."crm_agent_ChatSession" TO authenticated;
GRANT SELECT ON crm."crm_agent_Message" TO authenticated;

DROP POLICY IF EXISTS "realtime_jwt_read" ON crm."crm_agent_ChatSession";
CREATE POLICY "realtime_jwt_read" ON crm."crm_agent_ChatSession"
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'iss') = 'crm-agent'
    AND (
      (auth.jwt() ->> 'crm_role') = 'SUPER_ADMIN'
      OR "tenantId" = (auth.jwt() ->> 'tenant_id')
      OR id = (auth.jwt() ->> 'chat_session_id')
    )
  );

DROP POLICY IF EXISTS "realtime_jwt_read" ON crm."crm_agent_Message";
CREATE POLICY "realtime_jwt_read" ON crm."crm_agent_Message"
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'iss') = 'crm-agent'
    AND (
      (auth.jwt() ->> 'crm_role') = 'SUPER_ADMIN'
      OR "sessionId" = (auth.jwt() ->> 'chat_session_id')
      OR EXISTS (
        SELECT 1 FROM crm."crm_agent_ChatSession" s
        WHERE s.id = "sessionId"
          AND s."tenantId" = (auth.jwt() ->> 'tenant_id')
      )
    )
  );

-- Supports the per-message tenant lookup above.
CREATE INDEX IF NOT EXISTS "crm_agent_Message_sessionId_idx" ON crm."crm_agent_Message" ("sessionId");

COMMIT;

-- Both tables must be in the realtime publication (they already are if the
-- inbox worked before). Check with:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
