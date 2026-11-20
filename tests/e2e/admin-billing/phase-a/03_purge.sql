\echo '== A. Direct calls under each role (anon/authenticated must be denied)'
\set ON_ERROR_STOP 0
SET ROLE anon;
SELECT purge_old_trace_logs();
SELECT ai_usage_by_tenant(now() - interval '1 day', now());
RESET ROLE;
SET ROLE authenticated;
SELECT purge_old_trace_logs();
SELECT ai_usage_oldest();
RESET ROLE;
\set ON_ERROR_STOP 1

\echo '== B. Before purge: the purge-* marker rows'
SELECT session_id, (now() - created_at) > interval '28 days' AS gt28, (now() - created_at) > interval '400 days' AS gt400,
       user_message IS NOT NULL AS has_msg, llm_prompt IS NOT NULL AS has_prompt, llm_response IS NOT NULL AS has_resp,
       rag_similarity_scores IS NOT NULL AS has_scores, rag_sources IS NOT NULL AS has_sources, eval_notes IS NOT NULL AS has_notes,
       input_tokens, output_tokens, cost_usd
FROM ai_trace_logs WHERE session_id LIKE 'purge-%' ORDER BY created_at DESC;
SELECT count(*) AS rows_before, count(*) FILTER (WHERE created_at < now() - interval '400 days') AS older_400,
       count(*) FILTER (WHERE created_at < now() - interval '28 days' AND (user_message IS NOT NULL OR llm_prompt IS NOT NULL OR llm_response IS NOT NULL OR rag_similarity_scores IS NOT NULL OR rag_sources IS NOT NULL OR eval_notes IS NOT NULL) AND created_at >= now() - interval '400 days') AS to_scrub
FROM ai_trace_logs;
CREATE TEMP TABLE metrics_before AS SELECT id, input_tokens, output_tokens, cost_usd, status, tenant_id, request_type, model_name, created_at FROM ai_trace_logs;

\echo '== C. Purge as service_role'
SET ROLE service_role;
SELECT purge_old_trace_logs() AS purge_return_1;
SELECT purge_old_trace_logs() AS purge_return_2_should_be_0;
RESET ROLE;

\echo '== D. After purge'
SELECT session_id, user_message IS NOT NULL AS has_msg, llm_prompt IS NOT NULL AS has_prompt, llm_response IS NOT NULL AS has_resp,
       rag_similarity_scores IS NOT NULL AS has_scores, rag_sources IS NOT NULL AS has_sources, eval_notes IS NOT NULL AS has_notes,
       input_tokens, output_tokens, cost_usd
FROM ai_trace_logs WHERE session_id LIKE 'purge-%' ORDER BY created_at DESC;
SELECT count(*) AS rows_after FROM ai_trace_logs;
\echo '   metrics changed on surviving rows (must be 0):'
SELECT count(*) AS metric_changes FROM metrics_before b JOIN ai_trace_logs a USING (id)
WHERE (a.input_tokens, a.output_tokens, a.cost_usd, a.status, a.tenant_id, a.request_type, a.model_name, a.created_at)
      IS DISTINCT FROM (b.input_tokens, b.output_tokens, b.cost_usd, b.status, b.tenant_id, b.request_type, b.model_name, b.created_at);
\echo '   deleted rows were exactly those older than 400 days:'
SELECT count(*) AS deleted, bool_and(created_at < now() - interval '400 days') AS all_older_400
FROM metrics_before b WHERE NOT EXISTS (SELECT 1 FROM ai_trace_logs a WHERE a.id = b.id);
\echo '   bulk rows < 28 days still hold content:'
SELECT count(*) FILTER (WHERE user_message IS NOT NULL) AS recent_with_content FROM ai_trace_logs WHERE created_at >= now() - interval '28 days';
SELECT ai_usage_oldest() AS oldest_after_purge, now() - ai_usage_oldest() AS age;
