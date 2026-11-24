SET timezone = 'UTC';
TRUNCATE ai_trace_logs;
-- Tenants
--  A aaaaaaaa-0000-4000-8000-000000000001  (CRM: PT Alpha)
--  B bbbbbbbb-0000-4000-8000-000000000002  (CRM: PT Beta, unpriced + NULL model)
--  G cccccccc-0000-4000-8000-000000000003  (CRM: =HYPERLINK tenant, eval)
--  D dddddddd-0000-4000-8000-000000000004  (CRM only, no AI usage)
--  U eeeeeeee-0000-4000-8000-000000000005  (proxy only -> unknown tenant)
--  NULL tenant
-- Nov-2026 Jakarta period = [2026-10-31T17:00Z, 2026-11-30T17:00Z)

-- A: 900 llm_complete rows, every 25 min from Nov 1 00:00 WIB; some errors
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cached_input_tokens, cost_usd, status, created_at, user_message)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini',
       100 + i%50, 20 + i%7, (i%3)*10,
       CASE WHEN i%97=0 THEN NULL ELSE 0.0001*(1+i%5) END,
       CASE WHEN i%97=0 THEN 'error' ELSE 'success' END,
       TIMESTAMPTZ '2026-10-31 17:00:00Z' + (i-1) * INTERVAL '25 minutes', 'hello '||i
FROM generate_series(1,900) i;
-- A: 200 embeddings (output NULL)
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001','embedding','text-embedding-3-small', 300+i, NULL, 0.000002*i,'success',
       TIMESTAMPTZ '2026-11-02 03:00:00Z' + i * INTERVAL '1 hour'
FROM generate_series(1,200) i;
-- B: 50 unpriced success rows, 30 priced rows, 5 NULL-model unpriced rows
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000002','llm_complete','gpt-x-unpriced', 500, 50, NULL,'success',
       TIMESTAMPTZ '2026-11-05 02:00:00Z' + i * INTERVAL '2 hours' FROM generate_series(1,50) i;
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000002','llm_complete','gpt-4o-mini', 200, 40, 0.0005,'success',
       TIMESTAMPTZ '2026-11-08 05:00:00Z' + i * INTERVAL '3 hours' FROM generate_series(1,30) i;
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000002','llm_complete',NULL, 70, 7, NULL,'success',
       TIMESTAMPTZ '2026-11-09 10:00:00Z' + i * INTERVAL '1 hour' FROM generate_series(1,5) i;
-- B: sub-cent day: 4 priced rows on 2026-11-25 WIB, total cost 0.004 (only usage that day)
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'bbbbbbbb-0000-4000-8000-000000000002','llm_complete','gpt-4o-mini', 100, 10, 0.001,'success',
       TIMESTAMPTZ '2026-11-25 02:00:00Z' + i * INTERVAL '1 hour' FROM generate_series(1,4) i;
-- G: 40 eval rows + 20 llm_complete rows
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'cccccccc-0000-4000-8000-000000000003','eval','gpt-4o', 800, 120, 0.004,'success',
       TIMESTAMPTZ '2026-11-10 01:00:00Z' + i * INTERVAL '30 minutes' FROM generate_series(1,40) i;
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'cccccccc-0000-4000-8000-000000000003','llm_complete','gpt-4o', 600, 90, 0.003,'success',
       TIMESTAMPTZ '2026-11-12 01:00:00Z' + i * INTERVAL '30 minutes' FROM generate_series(1,20) i;
-- U: unknown tenant, 25 priced rows
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'eeeeeeee-0000-4000-8000-000000000005','llm_complete','gpt-4o-mini', 150, 30, 0.0002,'success',
       TIMESTAMPTZ '2026-11-14 01:00:00Z' + i * INTERVAL '1 hour' FROM generate_series(1,25) i;
-- NULL tenant: 10 embeddings
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT NULL,'embedding','text-embedding-3-small', 400, 0, 0.000008,'success',
       TIMESTAMPTZ '2026-11-15 01:00:00Z' + i * INTERVAL '1 hour' FROM generate_series(1,10) i;
-- Non-billing types (must be excluded): chat / rag / intent, huge numbers
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001', (ARRAY['chat','rag','intent'])[1+i%3],'gpt-4o', 100000, 100000, 9.99,'success',
       TIMESTAMPTZ '2026-11-03 01:00:00Z' + i * INTERVAL '1 hour' FROM generate_series(1,100) i;
-- Boundary rows (Asia/Jakarta = UTC+7)
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini', 11, 1, 0.111,'success', '2026-10-31 16:59:59.999Z'), -- Oct 31 23:59:59 WIB -> October
 ('aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini', 13, 3, 0.333,'success', '2026-11-30 16:59:59Z'),      -- Nov 30 23:59:59 WIB -> November
 ('aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini', 17, 7, 0.777,'success', '2026-11-30 17:00:00Z'),      -- Dec 1 00:00 WIB -> December
 ('bbbbbbbb-0000-4000-8000-000000000002','llm_complete','gpt-4o-mini', 19, 9, 0.999,'success', '2026-09-30 17:00:00Z'),      -- Oct 1 00:00 WIB -> October
 ('bbbbbbbb-0000-4000-8000-000000000002','llm_complete','gpt-4o-mini', 23, 3, 0.232,'success', '2026-09-30 16:59:59Z');      -- Sep 30 23:59:59 WIB -> September
-- October (last month) bulk
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini', 120, 25, 0.00015,'success',
       TIMESTAMPTZ '2026-10-02 00:00:00Z' + i * INTERVAL '11 hours' FROM generate_series(1,60) i;
-- Old rows relative to now() with content (purge test)
INSERT INTO ai_trace_logs (tenant_id, request_type, model_name, input_tokens, output_tokens, cost_usd, status, created_at,
                           user_message, llm_prompt, llm_response, rag_similarity_scores, rag_sources, eval_notes, session_id)
SELECT 'aaaaaaaa-0000-4000-8000-000000000001','llm_complete','gpt-4o-mini', 10, 10, 0.00001,'success', now() - d * INTERVAL '1 day',
       'msg', '[{"role":"user"}]'::jsonb, 'resp', '[0.9]'::jsonb, '[{"f":"a"}]'::jsonb, 'note', 'purge-'||d
FROM unnest(ARRAY[1, 27, 29, 30, 60, 399, 401, 500]) d;
SELECT count(*) AS total_rows FROM ai_trace_logs;
