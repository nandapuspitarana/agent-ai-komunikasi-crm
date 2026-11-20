import { createHmac } from 'crypto';

/**
 * Short-lived Supabase JWTs for Realtime, minted by the Next.js server.
 *
 * Browsers no longer read chat tables with the public anon key. Instead they
 * get a token whose claims say exactly what they may see, and the RLS policies
 * in scripts/database/sql/002_realtime_jwt_policies.sql enforce it:
 *   - dashboard user: { crm_role, tenant_id }         -> that tenant's chats
 *   - SUPER_ADMIN:    { crm_role: 'SUPER_ADMIN' }      -> all chats
 *   - widget visitor: { chat_session_id }              -> one chat session
 *
 * Signed HS256 with the project's JWT secret (Supabase dashboard -> Project
 * Settings -> API -> JWT Secret), stored server-side as SUPABASE_JWT_SECRET.
 */

/** Must match the `iss` check in the RLS policies. */
export const REALTIME_TOKEN_ISSUER = 'crm-agent';
export const REALTIME_TOKEN_TTL_SECONDS = 60 * 60;

export type RealtimeClaims =
  | { kind: 'dashboard'; userId: string; crmRole: string; tenantId: string | null }
  | { kind: 'widget'; chatSessionId: string };

export function realtimeJwtConfigured(): boolean {
  return !!process.env.SUPABASE_JWT_SECRET;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

export function signRealtimeToken(
  claims: RealtimeClaims,
  ttlSeconds = REALTIME_TOKEN_TTL_SECONDS
): { token: string; expiresAt: number } {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET must be set');

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const payload: Record<string, unknown> = {
    iss: REALTIME_TOKEN_ISSUER,
    aud: 'authenticated',
    role: 'authenticated',
    iat,
    exp,
  };
  // No `sub`: Supabase's auth.uid() casts sub to uuid, and these are not
  // Supabase Auth users. Every scoping claim is set explicitly (null when not
  // granted) so a token can never carry more than one kind of access.
  if (claims.kind === 'dashboard') {
    payload.user_id = claims.userId;
    payload.crm_role = claims.crmRole;
    payload.tenant_id = claims.tenantId;
    payload.chat_session_id = null;
  } else {
    payload.crm_role = 'VISITOR';
    payload.tenant_id = null;
    payload.chat_session_id = claims.chatSessionId;
  }

  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return { token: `${head}.${body}.${sig}`, expiresAt: exp * 1000 };
}
