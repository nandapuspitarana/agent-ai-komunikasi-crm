/**
 * Shared settings for calls from this app to the Python AI proxy (ai-agent-proxy).
 *
 * The proxy requires the `X-Internal-Key` header on every /api/v1/* call; its
 * value must equal the proxy's INTERNAL_API_KEY. Set AGENT_PROXY_API_KEY here.
 */

export function agentProxyUrl(): string {
  return (process.env.AGENT_PROXY_URL || 'http://127.0.0.1:8200').replace('localhost', '127.0.0.1');
}

export function agentProxyHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const key = process.env.AGENT_PROXY_API_KEY;
  if (key) headers['X-Internal-Key'] = key;
  return headers;
}

/** fetch() against the proxy with the internal key attached. `path` starts with `/`. */
export function agentProxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = agentProxyHeaders((init.headers as Record<string, string>) || {});
  return fetch(`${agentProxyUrl()}${path}`, { ...init, headers });
}
