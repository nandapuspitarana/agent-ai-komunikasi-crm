import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Realtime access no longer relies on the public anon key: the server mints
 * short-lived Supabase JWTs whose claims the RLS policies (002_*.sql) enforce.
 * Also covers who may receive a visitorToken.
 */

const prismaMock = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  chatSession: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
  message: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  knowledgeDocument: { findMany: vi.fn() },
  visitorProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/ai-agent', () => ({ chatWithAgent: vi.fn().mockResolvedValue({ reply: 'LLM reply' }) }));
vi.mock('@/modules/ai/agent-proxy', () => ({ agentEngine: { processMessage: vi.fn().mockResolvedValue({ reply: 'x' }) } }));
vi.mock('@/lib/email-service', () => ({ sendInquiryNotificationToTenant: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/visitor-service', () => ({
  updateVisitorFromExtraction: vi.fn().mockResolvedValue(undefined),
  upsertVisitorProfile: vi.fn().mockResolvedValue(undefined),
  updateVisitorClassification: vi.fn().mockResolvedValue(undefined),
  shouldTriggerLeadForm: vi.fn().mockResolvedValue(false),
}));

import * as dashboardToken from '@/app/api/realtime/token/route';
import * as widgetToken from '@/app/api/widget/realtime-token/route';
import * as widgetMessage from '@/app/api/widget/message/route';
import * as widgetInit from '@/app/api/widget/init/route';
import * as contactSubmit from '@/app/api/widget/contact-submit/route';
import { checkSessionTenant } from '@/app/actions/notification';
import { signRealtimeToken } from '@/lib/supabase-jwt';
import { signVisitorToken } from '@/lib/visitor-token';

const JWT_SECRET = 'test-supabase-jwt-secret';

const json = (url: string, body: any, method = 'POST') =>
  new NextRequest(url, { method, body: JSON.stringify(body) });

function decodeVerified(token: string) {
  const [head, body, sig] = token.split('.');
  const expected = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  expect(sig).toBe(expected);
  expect(JSON.parse(Buffer.from(head, 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT' });
  return JSON.parse(Buffer.from(body, 'base64url').toString());
}

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) => Object.values(m).forEach((fn: any) => fn.mockReset()));
  authMock.mockReset();
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.WIDGET_LEGACY_CONTACT_LOOKUP;
});

describe('signRealtimeToken', () => {
  it('dashboard token is HS256-signed, short-lived and scoped to one tenant', () => {
    const { token, expiresAt } = signRealtimeToken({ kind: 'dashboard', userId: 'u1', crmRole: 'AGENT', tenantId: 'tA' });
    const claims = decodeVerified(token);
    expect(claims).toMatchObject({ iss: 'crm-agent', role: 'authenticated', tenant_id: 'tA', crm_role: 'AGENT', chat_session_id: null });
    expect(claims.sub).toBeUndefined();
    expect(claims.exp - claims.iat).toBe(3600);
    expect(expiresAt).toBe(claims.exp * 1000);
  });

  it('widget token grants one chat session and no tenant', () => {
    const claims = decodeVerified(signRealtimeToken({ kind: 'widget', chatSessionId: 's1' }).token);
    expect(claims).toMatchObject({ chat_session_id: 's1', tenant_id: null, crm_role: 'VISITOR' });
  });

  it('refuses to sign without a secret', () => {
    delete process.env.SUPABASE_JWT_SECRET;
    expect(() => signRealtimeToken({ kind: 'widget', chatSessionId: 's1' })).toThrow();
  });
});

describe('GET /api/realtime/token (dashboard)', () => {
  it('requires a session', async () => {
    authMock.mockResolvedValue(null);
    expect((await dashboardToken.GET()).status).toBe(401);
  });

  it('scopes the token to the user\'s own tenant', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', tenantId: 'tA' } });
    const res = await dashboardToken.GET();
    expect(res.status).toBe(200);
    const claims = decodeVerified((await res.json()).token);
    expect(claims.tenant_id).toBe('tA');
    expect(claims.crm_role).toBe('AGENT');
  });

  it('returns 503 when the JWT secret is not configured', async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', tenantId: 'tA' } });
    expect((await dashboardToken.GET()).status).toBe(503);
  });
});

describe('POST /api/widget/realtime-token (public)', () => {
  const url = 'http://localhost/api/widget/realtime-token';

  it('rejects a session of another tenant', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue({ id: 's-b', tenantId: 'tB' });
    const res = await widgetToken.POST(json(url, { tenantId: 'tA', sessionId: 's-b' }));
    expect(res.status).toBe(404);
  });

  it('rejects an unknown session and missing fields', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue(null);
    expect((await widgetToken.POST(json(url, { tenantId: 'tA', sessionId: 'nope' }))).status).toBe(404);
    expect((await widgetToken.POST(json(url, { tenantId: 'tA' }))).status).toBe(400);
  });

  it('issues a token for exactly that session, with CORS', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue({ id: 's-a', tenantId: 'tA' });
    const res = await widgetToken.POST(json(url, { tenantId: 'tA', sessionId: 's-a' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const claims = decodeVerified((await res.json()).token);
    expect(claims.chat_session_id).toBe('s-a');
    expect(claims.tenant_id).toBeNull();
  });
});

describe('visitorToken issuance', () => {
  const tenant = {
    id: 'tA', name: 'A', aiEnabled: false, visitorConfig: { enabled: false },
    activeFlow: { id: 'f1', name: 'Bot', config: {}, intents: [] }, flows: [],
  };
  const postMessage = async (body: any) => {
    const res = await widgetMessage.POST(json('http://localhost/api/widget/message', { tenantId: 'tA', message: 'hello', ...body }));
    expect(res.status).toBe(200);
    return res;
  };

  beforeEach(() => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant);
    prismaMock.chatSession.create.mockImplementation(async ({ data }: any) => ({ id: 's-new', status: 'bot', ...data }));
    prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm', ...data }));
    prismaMock.message.findMany.mockResolvedValue([]);
    prismaMock.message.findFirst.mockResolvedValue(null);
    prismaMock.knowledgeDocument.findMany.mockResolvedValue([]);
  });

  it('message POST: a contactId that already has chats does not get a token', async () => {
    prismaMock.chatSession.count.mockResolvedValue(1);
    const body = await (await postMessage({ contactId: 'victim' })).json();
    expect(prismaMock.chatSession.count).toHaveBeenCalled();
    expect(body.sessionId).toBe('s-new');
    expect(body.visitorToken).toBeUndefined();
  });

  it('message POST: first use of a contactId gets a token', async () => {
    prismaMock.chatSession.count.mockResolvedValue(0);
    const body = await (await postMessage({ contactId: 'fresh' })).json();
    expect(body.visitorToken).toBe(signVisitorToken('tA', 'fresh'));
  });

  it('message POST: a caller that already holds the token keeps getting it', async () => {
    prismaMock.chatSession.count.mockResolvedValue(3);
    const token = signVisitorToken('tA', 'returning');
    const body = await (await postMessage({ contactId: 'returning', visitorToken: token })).json();
    expect(body.visitorToken).toBe(token);
  });

  it('init: no token for a contactId that already has chats', async () => {
    prismaMock.chatSession.count.mockResolvedValue(2);
    const res = await widgetInit.POST(json('http://localhost/api/widget/init', { tenantId: 'tA', contactId: 'victim' }) as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.visitorToken).toBeUndefined();
  });

  it('init: token on first use', async () => {
    prismaMock.chatSession.count.mockResolvedValue(0);
    const body = await (await widgetInit.POST(json('http://localhost/api/widget/init', { tenantId: 'tA', contactId: 'fresh' }) as any)).json();
    expect(body.visitorToken).toBe(signVisitorToken('tA', 'fresh'));
  });
});

describe('POST /api/widget/contact-submit', () => {
  const url = 'http://localhost/api/widget/contact-submit';
  const base = { tenantId: 'tA', category: 'General', description: 'help' };
  const submit = async (body: any) => {
    const res = await contactSubmit.POST(json(url, { ...base, ...body }));
    expect(res.status).toBe(200);
    return res.json();
  };

  beforeEach(() => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: 'tA', name: 'A', fallbackEmail: null, visitorConfig: {}, activeFlow: null });
    prismaMock.chatSession.create.mockImplementation(async ({ data }: any) => ({ id: 's-new', status: 'bot', ...data }));
    prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm', ...data }));
    prismaMock.visitorProfile.findUnique.mockResolvedValue(null);
    prismaMock.visitorProfile.create.mockResolvedValue({});
  });

  it('does not write into another tenant\'s session', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue({ id: 's-b', tenantId: 'tB', contactId: 'c-b' });
    const body = await submit({ sessionId: 's-b' });
    expect(body.sessionId).toBe('s-new');
    const written = prismaMock.message.create.mock.calls.map((c: any) => c[0].data.sessionId);
    expect(written).not.toContain('s-b');
  });

  it('does not reveal a visitor\'s sessionId from a bare contactId', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue({ id: 's-victim', tenantId: 'tA', contactId: 'victim' });
    const body = await submit({ contactId: 'victim' });
    expect(prismaMock.chatSession.findFirst).not.toHaveBeenCalled();
    expect(body.sessionId).toBe('s-new');
  });

  it('continues the visitor\'s session when the visitor token is presented', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue({ id: 's-own', tenantId: 'tA', contactId: 'me' });
    const body = await submit({ contactId: 'me', visitorToken: signVisitorToken('tA', 'me') });
    expect(body.sessionId).toBe('s-own');
  });
});

describe('checkSessionTenant server action', () => {
  it('answers nothing to anonymous callers or about other tenants', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue({ tenantId: 'tB' });
    authMock.mockResolvedValue(null);
    expect(await checkSessionTenant('s-b')).toBeNull();
    authMock.mockResolvedValue({ user: { id: 'u1', role: 'AGENT', tenantId: 'tA' } });
    expect(await checkSessionTenant('s-b')).toBeNull();
    prismaMock.chatSession.findUnique.mockResolvedValue({ tenantId: 'tA' });
    expect(await checkSessionTenant('s-a')).toBe('tA');
  });
});
