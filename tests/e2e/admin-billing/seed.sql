-- E2E seed for the super-admin billing dashboard. LOCAL ONLY: applied by run.sh to the
-- billing-e2e-pg container (127.0.0.1:55440, database crm_e2e, schema crm). Never run elsewhere.
-- Prisma DateTime columns are `timestamp(3) without time zone` holding UTC; values below are UTC.
-- Period "this month" (Asia/Jakarta, UTC+7) = [2026-10-31 17:00, 2026-11-30 17:00) UTC.
-- Tenant ids match the proxy fixture (ai_trace_logs.tenant_id); eeeeeeee-… exists only in the proxy.
SET search_path = crm;
BEGIN;
TRUNCATE "crm_agent_Message", "crm_agent_ChatSession", "crm_agent_VisitorProfile", "crm_agent_AuditLog",
         "crm_agent_PasswordResetToken", "crm_agent_User", "crm_agent_Tenant" CASCADE;

INSERT INTO "crm_agent_Tenant" (id, name, subscription, "aiEnabled", "createdAt", "updatedAt") VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001', 'PT Alpha', 'pro',  true,  '2026-01-10 00:00', now()),
 ('bbbbbbbb-0000-4000-8000-000000000002', 'PT Beta',  'free', true,  '2026-02-10 00:00', now()),
 ('cccccccc-0000-4000-8000-000000000003', '=HYPERLINK("http://evil.example","click")', 'pro', false, '2026-03-10 00:00', now()),
 ('dddddddd-0000-4000-8000-000000000004', 'PT Delta', 'free', true,  '2026-04-10 00:00', now());

-- password for every account: E2e-Pass-123!  (bcryptjs, cost 10, same as prisma/seed.ts)
INSERT INTO "crm_agent_User" (id, email, password, name, role, "tenantId", "isActive", "createdAt", "updatedAt") VALUES
 ('u-sa',  'superadmin@billing-e2e.local', '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Super Admin', 'SUPER_ADMIN', NULL, true, '2026-01-01 00:00', now()),
 ('u-bpa', 'partner@billing-e2e.local',    '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Partner A',   'BUSINESS_PARTNER', 'aaaaaaaa-0000-4000-8000-000000000001', true, '2026-01-11 00:00', now()),
 ('u-ag1', 'agent1@billing-e2e.local',     '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Agent A1',    'AGENT', 'aaaaaaaa-0000-4000-8000-000000000001', true,  '2026-11-03 00:00', now()),
 ('u-ag2', 'agent2@billing-e2e.local',     '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Agent A2',    'AGENT', 'aaaaaaaa-0000-4000-8000-000000000001', false, '2026-05-01 00:00', now()),
 ('u-bpb', 'partnerb@billing-e2e.local',   '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Partner B',   'BUSINESS_PARTNER', 'bbbbbbbb-0000-4000-8000-000000000002', true, '2026-02-11 00:00', now()),
 ('u-ag3', 'agent3@billing-e2e.local',     '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Agent B1',    'AGENT', 'bbbbbbbb-0000-4000-8000-000000000002', true,  '2026-06-01 00:00', now()),
 ('u-bpg', 'partnerg@billing-e2e.local',   '$2b$10$F88vQQq9VYmPzyp8D/Lt7ec8GMJo6yWPqpVTv94te9C5W4yMcEdCW', 'E2E Partner G',   'BUSINESS_PARTNER', 'cccccccc-0000-4000-8000-000000000003', true, '2026-03-11 00:00', now());

INSERT INTO "crm_agent_ChatSession" (id, "tenantId", "contactId", channel, status, "handoffRequested", "createdAt", "updatedAt") VALUES
 -- Tenant A
 ('s-a1-reused', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a1', 'widget',   'bot',   false, '2026-10-10 03:00', now()), -- old session reused in Nov
 ('s-a2-handoff','aaaaaaaa-0000-4000-8000-000000000001', 'c-a2', 'whatsapp', 'agent', true,  '2026-11-03 02:00', now()),
 ('s-a3-botonly','aaaaaaaa-0000-4000-8000-000000000001', 'c-a3', 'widget',   'bot',   false, '2026-11-06 02:00', now()), -- bot-only in Nov
 ('s-a4-oct',    'aaaaaaaa-0000-4000-8000-000000000001', 'c-a4', 'widget',   'bot',   false, '2026-10-05 02:00', now()), -- Oct only
 ('s-a5-second', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a2', 'widget',   'bot',   false, '2026-11-12 02:00', now()), -- c-a2's 2nd session (counted once)
 ('s-a6-edgeout','aaaaaaaa-0000-4000-8000-000000000001', 'c-a5', 'widget',   'bot',   false, '2026-10-31 16:00', now()), -- msg Oct 31 23:59:59 WIB
 ('s-a7-edgein', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a6', 'widget',   'bot',   false, '2026-10-31 16:00', now()), -- msg Nov 1 00:00 WIB
 ('s-a8-shared', 'aaaaaaaa-0000-4000-8000-000000000001', 'shared-contact', 'widget', 'bot', false, '2026-11-07 02:00', now()),
 -- Tenant B
 ('s-b1-handoff','bbbbbbbb-0000-4000-8000-000000000002', 'c-b1', 'whatsapp', 'agent', true,  '2026-11-04 02:00', now()),
 ('s-b2-lastsec','bbbbbbbb-0000-4000-8000-000000000002', 'c-b2', 'widget',   'bot',   false, '2026-11-30 10:00', now()), -- msg Nov 30 23:59:59 WIB
 ('s-b3-dec',    'bbbbbbbb-0000-4000-8000-000000000002', 'c-b3', 'widget',   'bot',   false, '2026-11-30 10:00', now()), -- msg Dec 1 00:00 WIB
 ('s-b4-shared', 'bbbbbbbb-0000-4000-8000-000000000002', 'shared-contact', 'widget', 'bot', false, '2026-11-08 02:00', now()),
 ('s-b5-oldho',  'bbbbbbbb-0000-4000-8000-000000000002', 'c-b5', 'widget',   'agent', true,  '2026-10-02 02:00', now()), -- handoff, Oct only
 -- Tenant G (formula-injection name)
 ('s-g1',        'cccccccc-0000-4000-8000-000000000003', 'c-g1', 'widget',   'bot',   false, '2026-11-09 02:00', now()),
 -- Tenant D (no AI usage; activity only last month)
 ('s-d1-oct',    'dddddddd-0000-4000-8000-000000000004', 'c-d1', 'whatsapp', 'bot',   false, '2026-10-20 02:00', now());

INSERT INTO "crm_agent_Message" (id, "sessionId", "senderType", content, "createdAt") VALUES
 ('m01', 's-a1-reused',  'user',  'hi (october)',       '2026-10-10 03:00'),
 ('m02', 's-a1-reused',  'bot',   'hello (october)',    '2026-10-10 03:01'),
 ('m03', 's-a1-reused',  'user',  'back again (nov)',   '2026-11-05 04:00'),
 ('m04', 's-a1-reused',  'bot',   'welcome back',       '2026-11-05 04:01'),
 ('m05', 's-a2-handoff', 'user',  'need human',         '2026-11-03 02:00'),
 ('m06', 's-a2-handoff', 'bot',   'connecting',         '2026-11-03 02:01'),
 ('m07', 's-a2-handoff', 'agent', 'agent here',         '2026-11-03 02:05'),
 ('m08', 's-a2-handoff', 'user',  'thanks',             '2026-11-03 02:06'),
 ('m09', 's-a3-botonly', 'bot',   'greeting only',      '2026-11-06 02:00'),
 ('m10', 's-a3-botonly', 'bot',   'still there?',       '2026-11-06 02:10'),
 ('m11', 's-a4-oct',     'user',  'october only',       '2026-10-05 02:00'),
 ('m12', 's-a5-second',  'user',  'second session',     '2026-11-12 02:00'),
 ('m13', 's-a6-edgeout', 'user',  'edge out',           '2026-10-31 16:59:59.999'),
 ('m14', 's-a7-edgein',  'user',  'edge in',            '2026-10-31 17:00:00'),
 ('m15', 's-a8-shared',  'user',  'shared contact A',   '2026-11-07 02:00'),
 ('m16', 's-b1-handoff', 'user',  'b1 hello',           '2026-11-04 02:00'),
 ('m17', 's-b1-handoff', 'bot',   'b1 reply',           '2026-11-04 02:01'),
 ('m18', 's-b2-lastsec', 'user',  'last second of nov', '2026-11-30 16:59:59'),
 ('m19', 's-b3-dec',     'user',  'first second of dec','2026-11-30 17:00:00'),
 ('m20', 's-b4-shared',  'user',  'shared contact B',   '2026-11-08 02:00'),
 ('m21', 's-b5-oldho',   'user',  'old handoff',        '2026-10-02 02:00'),
 ('m22', 's-g1',         'user',  'g1 hello',           '2026-11-09 02:00'),
 ('m23', 's-g1',         'bot',   'g1 reply',           '2026-11-09 02:01'),
 ('m24', 's-d1-oct',     'user',  'delta october',      '2026-10-20 02:00'),
 ('m25', 's-d1-oct',     'bot',   'delta reply',        '2026-10-20 02:01'),
 -- Handoffs = distinct sessions with an AGENT message in the period (handoffRequested is not used):
 ('m26', 's-g1',         'agent', 'agent joins g1',     '2026-11-09 02:05'),      -- Nov, flag=false -> counts (G)
 ('m27', 's-b3-dec',     'agent', 'agent at Dec 1 00:00','2026-11-30 17:00:00'),  -- exactly the Nov end -> excluded
 ('m28', 's-a7-edgein',  'agent', 'agent at Nov 1 00:00','2026-10-31 17:00:00'),  -- exactly the Nov start -> counts (A)
 ('m29', 's-b5-oldho',   'agent', 'agent in October',   '2026-10-02 02:05');      -- outside Nov (counts for Oct)
-- s-b1-handoff has handoffRequested=true but NO agent message -> must NOT count

INSERT INTO "crm_agent_VisitorProfile" (id, "tenantId", "contactId", "leadClassification", "topicsDiscussed", "createdAt", "updatedAt") VALUES
 ('vp1', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a1', 'hot_lead', '{}', '2026-10-10 03:00', now()),
 ('vp2', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a2', 'warm',     '{}', '2026-11-03 02:00', now()),
 ('vp3', 'aaaaaaaa-0000-4000-8000-000000000001', 'c-a3', 'cold',     '{}', '2026-11-06 02:00', now()),
 ('vp4', 'bbbbbbbb-0000-4000-8000-000000000002', 'c-b1', 'hot_lead', '{}', '2026-11-04 02:00', now()),
 ('vp5', 'dddddddd-0000-4000-8000-000000000004', 'c-d1', 'cold',     '{}', '2026-10-20 02:00', now());
COMMIT;
