// DISABLED: this script granted SELECT on every table in schema "crm" to the
// public `anon` role (readable by anyone holding NEXT_PUBLIC_SUPABASE_ANON_KEY,
// including password hashes). It must not be run again.
// See scripts/database/sql/001_lockdown_anon_access.sql.
console.error('grant_anon.js is disabled for security reasons. See scripts/database/sql/001_lockdown_anon_access.sql');
process.exit(1);
