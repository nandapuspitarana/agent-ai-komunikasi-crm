/**
 * AI Agent Client
 * Strategy: try a local LLM endpoint first (if configured), then fall back to the Python proxy.
 * The local endpoint must accept a JSON payload and return a JSON `{ reply: string, ... }`.
 */

const AGENT_PROXY_URL = (process.env.AGENT_PROXY_URL || 'http://127.0.0.1:8200').replace('localhost', '127.0.0.1');
const LOCAL_LLM_URL = (process.env.LOCAL_LLM_URL || '').replace('localhost', '127.0.0.1');
const LOCAL_LLM_TYPE = process.env.LOCAL_LLM_TYPE || 'generic';

export interface AgentChatRequest {
  message: string;
  session_id: string;
  user_id?: string;
  tenant_id?: string;
  flow_id?: string;          // RAG isolation: AI Bot (Flow) UUID — pass tenant.activeFlowId
  system_prompt?: string;
  attachments?: Array<{
    filename: string;
    file_type: string;
    bytes_b64: string;
    metadata?: Record<string, any>;
  }>;
  document_ids?: string[];
}

export interface AgentChatResponse {
  session_id: string;
  reply: string;
  intent?: string;
  tool_used?: string | null;
  sources?: Array<{
    document_id: string;
    filename: string;
    page_number?: number;
    snippet: string;
    score: number;
  }> | null;
  metadata?: Record<string, any>;
}

async function callLocalLLM(request: AgentChatRequest): Promise<AgentChatResponse> {
  if (!LOCAL_LLM_URL) throw new Error('LOCAL_LLM_URL not configured');

  // Support a few generic local endpoints by type
  let body: any = {};
  if (LOCAL_LLM_TYPE === 'generic') {
    body = { prompt: request.message, session_id: request.session_id };
  } else if (LOCAL_LLM_TYPE === 'inference') {
    body = { input: request.message, session: request.session_id };
  } else {
    body = { prompt: request.message, session_id: request.session_id };
  }

  const res = await fetch(LOCAL_LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Local LLM error: ${res.status} ${t}`);
  }

  const json = await res.json();

  // Normalize into AgentChatResponse
  const reply = (json.reply || json.output || json.text || json.result || (Array.isArray(json.outputs) && json.outputs[0]?.text)) as string;

  return {
    session_id: request.session_id,
    reply: reply || '[no reply from local model]',
    intent: json.intent || 'local-model',
    tool_used: json.tool_used || null,
    sources: json.sources || null,
    metadata: json.metadata || {},
  };
}

export async function chatWithAgent(request: AgentChatRequest): Promise<AgentChatResponse> {
  // Try local LLM first if configured
  if (LOCAL_LLM_URL) {
    try {
      const local = await callLocalLLM(request);
      return local;
    } catch (err) {
      console.error('[AI Agent] Local model call failed, falling back to proxy:', err);
      // continue to proxy
    }
  }

  // Fallback to Python AI Agent Proxy
  try {
    let response: Response | null = null;
    let lastError: any = null;
    
    // Retry logic (1 retry, 2s delay) for transient connection errors during Uvicorn restart
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await fetch(`${AGENT_PROXY_URL}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(75000), // Increased to 75s for slow local LLMs
        });
        break; // Success, exit retry loop
      } catch (err: any) {
        lastError = err;
        // Only retry on network/connection errors, not timeout or parsing
        if (attempt === 1 && err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed'))) {
          console.warn(`[AI Agent] Proxy unreachable, retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to fetch from proxy');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Agent Proxy error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[AI Agent] Failed to communicate with proxy:', error);
    // Return a graceful offline reply instead of crashing the entire request
    return {
      session_id: request.session_id,
      reply: 'Maaf, sistem AI kami sedang tidak tersedia. Silakan coba beberapa saat lagi, atau ketik "bicara dengan agen" untuk berbicara langsung dengan tim kami. 🙏',
      intent: 'offline_fallback',
      tool_used: null,
      sources: null,
      metadata: { error: 'proxy_unreachable' },
    };
  }
}

/**
 * Lightweight health check: returns which endpoints are reachable.
 */
export async function healthCheck(): Promise<{ local?: boolean; proxy?: boolean }> {
  const result: { local?: boolean; proxy?: boolean } = {};

  if (LOCAL_LLM_URL) {
    try {
      const res = await fetch(LOCAL_LLM_URL, { method: 'HEAD' });
      result.local = res.ok;
    } catch (e) {
      result.local = false;
    }
  }

  try {
    const res = await fetch(`${AGENT_PROXY_URL}/api/health`, { method: 'GET' });
    result.proxy = res.ok;
  } catch (e) {
    result.proxy = false;
  }

  return result;
}