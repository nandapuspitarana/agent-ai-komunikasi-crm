import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key is missing. Using placeholder client for static build.');
}

/**
 * Realtime auth.
 *
 * The anon key alone can no longer read chat tables (RLS). Each page tells
 * this module where to fetch a short-lived server-minted JWT, and supabase-js
 * calls `accessToken` on connect and on every heartbeat, so the token is
 * refreshed before it expires without any extra code in the components.
 */
export type RealtimeToken = { token: string; expiresAt: number };
type TokenFetcher = () => Promise<RealtimeToken | null>;

const REFRESH_MARGIN_MS = 2 * 60 * 1000;

let sourceKey: string | null = null;
let fetcher: TokenFetcher | null = null;
let cached: RealtimeToken | null = null;
let inflight: Promise<string | null> | null = null;
let generation = 0;

async function accessToken(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cached.token;
  if (!fetcher) return null;
  if (!inflight) {
    const gen = generation;
    const current = fetcher;
    inflight = current()
      .then((t) => {
        if (gen === generation) cached = t;
        return t?.token ?? null;
      })
      .catch((err) => {
        console.warn('[Realtime] token refresh failed:', err);
        return cached?.token ?? null;
      })
      .finally(() => {
        if (gen === generation) inflight = null;
      });
  }
  return inflight;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { accessToken });

/**
 * Point realtime at a token source and wait until the token is applied.
 * Calling again with the same key is a no-op, so several components on one
 * page can share it. Subscribe channels only after this resolves.
 */
export async function setRealtimeTokenSource(key: string, next: TokenFetcher): Promise<void> {
  if (key !== sourceKey) {
    sourceKey = key;
    fetcher = next;
    cached = null;
    inflight = null;
    generation++;
  }
  await supabase.realtime.setAuth();
}

/** Fetch helper for JSON token endpoints. */
export async function fetchRealtimeToken(url: string, init?: RequestInit): Promise<RealtimeToken | null> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data?.token === 'string' && typeof data?.expiresAt === 'number' ? data : null;
}
