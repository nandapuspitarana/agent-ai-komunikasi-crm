SET timezone = 'UTC';
CREATE TEMP TABLE periods(name text, p_from timestamptz, p_to timestamptz);
-- boundaries computed by hand with a fixed +07:00 offset (independent of the tz database)
INSERT INTO periods VALUES
 ('nov2026', '2026-11-01 00:00:00+07', '2026-12-01 00:00:00+07'),
 ('oct2026', '2026-10-01 00:00:00+07', '2026-11-01 00:00:00+07'),
 ('custom_nov30', '2026-11-30 00:00:00+07', '2026-12-01 00:00:00+07'),
 ('max400', '2025-10-26 00:00:00+07', '2026-11-30 00:00:00+07');

CREATE TEMP VIEW direct_groups AS
SELECT p.name, tenant_id, request_type, model_name,
       COALESCE(SUM(input_tokens),0)::bigint AS input_tokens, COALESCE(SUM(cached_input_tokens),0)::bigint AS cached_input_tokens,
       COALESCE(SUM(output_tokens),0)::bigint AS output_tokens, round(COALESCE(SUM(cost_usd),0),6) AS cost_usd, COUNT(*)::bigint AS request_count,
       SUM(CASE WHEN status='error' THEN 1 ELSE 0 END)::bigint AS error_count,
       SUM(CASE WHEN cost_usd IS NULL AND status='success' THEN 1 ELSE 0 END)::bigint AS unpriced_count
FROM periods p JOIN ai_trace_logs l ON l.created_at >= p.p_from AND l.created_at < p.p_to
WHERE request_type IN ('llm_complete','embedding','eval')
GROUP BY 1,2,3,4;

CREATE TEMP VIEW fn_groups AS
SELECT p.name, x.tenant_id, x.request_type, x.model_name, x.input_tokens, x.cached_input_tokens, x.output_tokens,
       round(x.cost_usd,6) AS cost_usd, x.request_count, x.error_count, x.unpriced_count
FROM periods p, jsonb_to_recordset(ai_usage_by_tenant(p.p_from, p.p_to)) AS x(tenant_id text, request_type text, model_name text,
        input_tokens bigint, cached_input_tokens bigint, output_tokens bigint, cost_usd numeric, request_count bigint, error_count bigint, unpriced_count bigint);

CREATE TEMP VIEW direct_days AS
SELECT p.name, ((l.created_at AT TIME ZONE 'UTC') + interval '7 hours')::date AS day,
       SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0))::bigint AS total_tokens,
       round(COALESCE(SUM(cost_usd),0),6) AS cost_usd, COUNT(*)::bigint AS request_count
FROM periods p JOIN ai_trace_logs l ON l.created_at >= p.p_from AND l.created_at < p.p_to
WHERE request_type IN ('llm_complete','embedding','eval')
GROUP BY 1,2;

CREATE TEMP VIEW fn_days AS
SELECT p.name, x.date::date AS day, x.total_tokens, round(x.cost_usd,6) AS cost_usd, x.request_count
FROM periods p, jsonb_to_recordset(ai_usage_daily(p.p_from, p.p_to, 'Asia/Jakarta')) AS x(date text, total_tokens bigint, cost_usd numeric, request_count bigint);

\echo '== 1. ai_usage_by_tenant vs direct GROUP BY (mismatch must be 0)'
SELECT p.name,
  (SELECT count(*) FROM ((SELECT * FROM fn_groups WHERE name=p.name EXCEPT SELECT * FROM direct_groups WHERE name=p.name)
                         UNION ALL (SELECT * FROM direct_groups WHERE name=p.name EXCEPT SELECT * FROM fn_groups WHERE name=p.name)) d) AS mismatched_groups,
  (SELECT count(*) FROM fn_groups WHERE name=p.name) AS fn_groups
FROM periods p;

\echo '== 2. ai_usage_daily (Asia/Jakarta) vs direct +7h bucketing (mismatch must be 0)'
SELECT p.name,
  (SELECT count(*) FROM ((SELECT * FROM fn_days WHERE name=p.name EXCEPT SELECT * FROM direct_days WHERE name=p.name)
                         UNION ALL (SELECT * FROM direct_days WHERE name=p.name EXCEPT SELECT * FROM fn_days WHERE name=p.name)) d) AS mismatched_days,
  (SELECT count(*) FROM fn_days WHERE name=p.name) AS fn_days
FROM periods p;

\echo '== 3. Period totals: function vs direct SQL; non-billing / NULL tenant / NULL model groups'
SELECT p.name,
  (SELECT SUM(input_tokens+output_tokens) FROM fn_groups WHERE name=p.name) AS fn_tokens,
  (SELECT SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0)) FROM ai_trace_logs WHERE created_at>=p.p_from AND created_at<p.p_to AND request_type IN ('llm_complete','embedding','eval')) AS sql_tokens,
  (SELECT SUM(cost_usd) FROM fn_groups WHERE name=p.name) AS fn_cost,
  (SELECT SUM(cost_usd) FROM ai_trace_logs WHERE created_at>=p.p_from AND created_at<p.p_to AND request_type IN ('llm_complete','embedding','eval')) AS sql_cost,
  (SELECT SUM(request_count) FROM fn_groups WHERE name=p.name) AS fn_req,
  (SELECT count(*) FROM ai_trace_logs WHERE created_at>=p.p_from AND created_at<p.p_to AND request_type IN ('llm_complete','embedding','eval')) AS sql_req,
  (SELECT SUM(unpriced_count) FROM fn_groups WHERE name=p.name) AS fn_unpriced,
  (SELECT count(*) FROM ai_trace_logs WHERE created_at>=p.p_from AND created_at<p.p_to AND request_type IN ('llm_complete','embedding','eval') AND cost_usd IS NULL AND status='success') AS sql_unpriced,
  (SELECT SUM(error_count) FROM fn_groups WHERE name=p.name) AS fn_err,
  (SELECT count(*) FROM fn_groups WHERE name=p.name AND request_type NOT IN ('llm_complete','embedding','eval')) AS nonbilling_groups,
  (SELECT count(*) FROM fn_groups WHERE name=p.name AND tenant_id IS NULL) AS null_tenant_groups,
  (SELECT count(*) FROM fn_groups WHERE name=p.name AND model_name IS NULL) AS null_model_groups
FROM periods p;
\echo '   non-billing rows present in table inside nov2026 (proves exclusion matters):'
SELECT request_type, count(*), SUM(total_tokens) FROM ai_trace_logs WHERE created_at >= '2026-10-31 17:00Z' AND created_at < '2026-11-30 17:00Z' AND request_type NOT IN ('llm_complete','embedding','eval') GROUP BY 1;

\echo '== 4. Boundary rows (marker input_tokens 11,13,17,19,23) and the periods/days they land in'
SELECT l.created_at, l.input_tokens,
  (SELECT string_agg(f.name, ',') FROM fn_groups f WHERE false) AS _unused,
  (SELECT string_agg(p.name, ',' ORDER BY p.name) FROM periods p WHERE p.name <> 'max400' AND l.created_at >= p.p_from AND l.created_at < p.p_to) AS in_periods
FROM ai_trace_logs l WHERE l.input_tokens IN (11,13,17,19,23) ORDER BY l.created_at;
\echo '   ai_usage_daily around boundaries:'
SELECT 'sep30/oct1' AS win, e->>'date' AS day, e->>'total_tokens' AS tokens, e->>'request_count' AS n
FROM jsonb_array_elements(ai_usage_daily('2026-09-30 16:00Z','2026-09-30 18:00Z','Asia/Jakarta')) e
UNION ALL
SELECT 'oct31/nov1', e->>'date', e->>'total_tokens', e->>'request_count'
FROM jsonb_array_elements(ai_usage_daily('2026-10-31 16:59Z','2026-10-31 17:01Z','Asia/Jakarta')) e
UNION ALL
SELECT 'nov30/dec1', e->>'date', e->>'total_tokens', e->>'request_count'
FROM jsonb_array_elements(ai_usage_daily('2026-11-30 16:00Z','2026-11-30 18:00Z','Asia/Jakarta')) e;

\echo '== 5. ai_usage_oldest'
SELECT ai_usage_oldest() AS fn_oldest, (SELECT MIN(created_at) FROM ai_trace_logs) AS sql_oldest,
       ai_usage_oldest() = (SELECT MIN(created_at) FROM ai_trace_logs) AS ok;

\echo '== 6. One jsonb value (not SETOF) even for >1000 rows'
SELECT (SELECT count(*) FROM (SELECT ai_usage_by_tenant('2025-01-01Z','2027-01-01Z')) s) AS rows_returned,
       jsonb_array_length(ai_usage_by_tenant('2025-01-01Z','2027-01-01Z')) AS groups,
       (SELECT SUM((e->>'request_count')::int) FROM jsonb_array_elements(ai_usage_by_tenant('2025-01-01Z','2027-01-01Z')) e) AS requests_in_one_value,
       (SELECT count(*) FROM ai_trace_logs) AS table_rows;

\echo '== 7. Empty period returns [] (not NULL)'
SELECT ai_usage_by_tenant('2030-01-01Z','2030-02-01Z') AS by_tenant, ai_usage_daily('2030-01-01Z','2030-02-01Z','Asia/Jakarta') AS daily, ai_usage_oldest() IS NOT NULL AS oldest_not_null;

\echo '== 8. Function attributes'
SELECT p.proname, p.prosecdef AS security_definer, p.provolatile, p.proconfig
FROM pg_proc p WHERE p.proname IN ('ai_usage_by_tenant','ai_usage_daily','ai_usage_oldest','purge_old_trace_logs') ORDER BY 1;

\echo '== 9. EXECUTE privilege per role (anon/authenticated/public must be f, service_role t)'
SELECT f, r, has_function_privilege(r, f, 'EXECUTE') AS can_execute
FROM unnest(ARRAY['purge_old_trace_logs()','ai_usage_by_tenant(timestamptz,timestamptz)','ai_usage_daily(timestamptz,timestamptz,text)','ai_usage_oldest()']) f,
     unnest(ARRAY['anon','authenticated','service_role','public']) r
ORDER BY f, r;
