# Source this (Git Bash) before ANY Prisma / Next / Playwright / script command of the billing E2E.
# It overrides every remote host configured in the repo's .env (shared DB, Supabase) with
# localhost values. process.env wins over .env in Next.js, Prisma and dotenv.
export DATABASE_URL='postgresql://postgres:e2epass@127.0.0.1:55440/crm_e2e?schema=crm'
export AGENT_PROXY_URL='http://127.0.0.1:8210'
export AGENT_PROXY_API_KEY='e2e-internal-key'
export AUTH_URL='http://localhost:3901'
export NEXTAUTH_URL='http://localhost:3901'
export NEXT_PUBLIC_BASE_URL='http://localhost:3901'
export PUBLIC_BASE_URL='http://localhost:3901'
export AUTH_SECRET='billing-e2e-throwaway-secret-0123456789abcdef'
export AUTH_TRUST_HOST='true'
export BILLING_TIMEZONE='Asia/Jakarta'
# Browser-side Supabase realtime: point at a closed local port so nothing reaches a real Supabase
export NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:9'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='billing-e2e-dummy-anon-key'
export LOCAL_LLM_URL='http://127.0.0.1:9'
export AZURE_TENANT_ID='billing-e2e-disabled'
export AZURE_CLIENT_ID='billing-e2e-disabled'
export AZURE_CLIENT_SECRET='billing-e2e-disabled'
export AZURE_SENDER_EMAIL='noreply@billing-e2e.local'
export E2E_BASE_URL='http://localhost:3901'
export STUB_URL='http://127.0.0.1:8210'
# Playwright artifacts (screenshots, downloads, traces) outside the repo unless overridden
export BILLING_E2E_OUT="${BILLING_E2E_OUT:-${TMPDIR:-${TEMP:-/tmp}}/billing-e2e-artifacts}"

# Hard guard: refuse to continue unless the DB host is the local test container.
node -e 'const u=new URL(process.env.DATABASE_URL);for(const k of ["AGENT_PROXY_URL","AUTH_URL","NEXTAUTH_URL","NEXT_PUBLIC_BASE_URL","NEXT_PUBLIC_SUPABASE_URL"]){const h=new URL(process.env[k]).hostname;if(!["127.0.0.1","localhost"].includes(h)){console.error("BLOCKED: "+k+" host "+h);process.exit(1)}} if(u.hostname!=="127.0.0.1"||u.port!=="55440"){console.error("BLOCKED: DATABASE_URL host "+u.hostname);process.exit(1)} console.log("[env] DATABASE_URL host="+u.hostname+":"+u.port+u.pathname+" schema="+u.searchParams.get("schema")+" | proxy="+process.env.AGENT_PROXY_URL)' || return 1 2>/dev/null || exit 1
