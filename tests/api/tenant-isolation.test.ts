import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Security regression tests: a user / visitor of tenant A must never read or
 * modify tenant B's data, and unauthenticated callers must be rejected.
 */

const prismaMock = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  flow: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  intent: { deleteMany: vi.fn(), create: vi.fn() },
  chatSession: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  message: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  knowledgeDocument: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), delete: vi.fn(), create: vi.fn() },
  visitorProfile: { update: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
const authMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/audit-logger', () => ({
  logDocumentDeleted: vi.fn(),
  logDocumentUploaded: vi.fn(),
  logChatMessageSent: vi.fn(),
  logAIAgentCreated: vi.fn(),
  logAIAgentUpdated: vi.fn(),
  logAIAgentDeleted: vi.fn(),
}));
vi.mock('@/lib/ai-agent', () => ({ chatWithAgent: vi.fn().mockResolvedValue({ reply: 'LLM reply' }) }));
vi.mock('@/modules/ai/agent-proxy', () => ({ agentEngine: { processMessage: vi.fn().mockResolvedValue({ reply: 'x' }) } }));
vi.mock('@/lib/visitor-service', () => ({
  updateVisitorFromExtraction: vi.fn().mockResolvedValue(undefined),
  upsertVisitorProfile: vi.fn().mockResolvedValue(undefined),
  updateVisitorClassification: vi.fn().mockResolvedValue(undefined),
  shouldTriggerLeadForm: vi.fn().mockResolvedValue(false),
  cleanUpStaleVisitors: vi.fn().mockResolvedValue({ success: true, deletedCount: 0 }),
}));

import * as widgetMessage from '@/app/api/widget/message/route';
import * as flowById from '@/app/api/flows/[flowId]/route';
import * as flows from '@/app/api/flows/route';
import * as agentRoute from '@/app/api/agent/route';
import * as testChat from '@/app/api/agent/test-chat/route';
import * as docDelete from '@/app/api/agent/documents/[documentId]/route';
import * as sendResponse from '@/app/api/chat/send-response/route';
import * as cron from '@/app/api/cron/visitor-retention/route';
import { signVisitorToken } from '@/lib/visitor-token';

const userOf = (role: string, tenantId: string | null = 'tA') => ({
  user: { id: `u-${role}`, role, tenantId, email: 'x@example.test' },
});
const params = <T>(p: T) => ({ params: Promise.resolve(p) });
const json = (url: string, body: any, method = 'POST') =>
  new NextRequest(url, { method, body: JSON.stringify(body) });

const fetchMock = vi.fn();

beforeEach(() => {
  Object.values(prismaMock).forEach((m: any) =>
    typeof m === 'function' ? m.mockReset() : Object.values(m).forEach((fn: any) => fn.mockReset())
  );
  authMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CRON_SECRET;
  delete process.env.WIDGET_LEGACY_CONTACT_LOOKUP;
});

describe('widget message API (public) — tenant & visitor isolation', () => {
  const session = { id: 's-b', tenantId: 'tB', contactId: 'c-b', status: 'bot', assignedAgentId: null, handoffRequested: false };

  it('GET by contactId without a visitor token does not return history', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue(session);
    const res = await widgetMessage.GET(
      new NextRequest('http://localhost/api/widget/message?tenantId=tB&contactId=c-b')
    );
    expect(res.status).toBe(404);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('GET by contactId with a forged token is rejected', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue(session);
    const res = await widgetMessage.GET(
      new NextRequest('http://localhost/api/widget/message?tenantId=tB&contactId=c-b&visitorToken=forged')
    );
    expect(res.status).toBe(404);
  });

  it('GET by contactId with the issued token returns history', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue(session);
    prismaMock.message.findMany.mockResolvedValue([]);
    const token = signVisitorToken('tB', 'c-b');
    const res = await widgetMessage.GET(
      new NextRequest(`http://localhost/api/widget/message?tenantId=tB&contactId=c-b&visitorToken=${token}`)
    );
    expect(res.status).toBe(200);
  });

  it('a token issued for tenant A does not unlock the same contactId in tenant B', async () => {
    prismaMock.chatSession.findFirst.mockResolvedValue(session);
    const token = signVisitorToken('tA', 'c-b');
    const res = await widgetMessage.GET(
      new NextRequest(`http://localhost/api/widget/message?tenantId=tB&contactId=c-b&visitorToken=${token}`)
    );
    expect(res.status).toBe(404);
  });

  it('legacy contact lookup works only when explicitly enabled', async () => {
    process.env.WIDGET_LEGACY_CONTACT_LOOKUP = 'true';
    prismaMock.chatSession.findFirst.mockResolvedValue(session);
    prismaMock.message.findMany.mockResolvedValue([]);
    const res = await widgetMessage.GET(
      new NextRequest('http://localhost/api/widget/message?tenantId=tB&contactId=c-b')
    );
    expect(res.status).toBe(200);
  });

  it('GET with a sessionId that belongs to another tenant returns 404', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue(session);
    const res = await widgetMessage.GET(
      new NextRequest('http://localhost/api/widget/message?sessionId=s-b&tenantId=tA')
    );
    expect(res.status).toBe(404);
  });

  it('POST with another tenant\'s sessionId starts a new session instead of writing into it', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tA', name: 'A', aiEnabled: false, visitorConfig: { enabled: false },
      activeFlow: { id: 'f1', name: 'Bot', config: {}, intents: [] }, flows: [],
    });
    prismaMock.chatSession.findUnique.mockResolvedValue(session);
    prismaMock.chatSession.create.mockResolvedValue({ id: 's-new', tenantId: 'tA', contactId: 'widget_x', status: 'bot' });
    prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm', ...data }));
    prismaMock.message.findMany.mockResolvedValue([]);
    prismaMock.message.findFirst.mockResolvedValue(null);
    prismaMock.knowledgeDocument.findMany.mockResolvedValue([]);

    const res = await widgetMessage.POST(
      json('http://localhost/api/widget/message', { tenantId: 'tA', sessionId: 's-b', message: 'hello' })
    );
    const body = await res.json();

    expect(prismaMock.chatSession.create).toHaveBeenCalled();
    const writtenSessions = prismaMock.message.create.mock.calls.map((c: any) => c[0].data.sessionId);
    expect(writtenSessions).not.toContain('s-b');
    expect(body.visitorToken).toBe(signVisitorToken('tA', 'widget_x'));
  });

  it('anonymous visitors get an unguessable contactId (not a timestamp)', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tA', name: 'A', aiEnabled: false, visitorConfig: { enabled: false },
      activeFlow: { id: 'f1', name: 'Bot', config: {}, intents: [] }, flows: [],
    });
    prismaMock.chatSession.create.mockImplementation(async ({ data }: any) => ({ id: 's1', status: 'bot', ...data }));
    prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm', ...data }));
    prismaMock.message.findMany.mockResolvedValue([]);
    prismaMock.knowledgeDocument.findMany.mockResolvedValue([]);

    await widgetMessage.POST(json('http://localhost/api/widget/message', { tenantId: 'tA', message: 'hi' }));
    const contactId = prismaMock.chatSession.create.mock.calls[0][0].data.contactId;
    expect(contactId).toMatch(/^widget_[0-9a-f-]{36}$/);
  });
});

describe('dashboard APIs — authentication and tenant ownership', () => {
  const flowB = { id: 'fB', tenantId: 'tB', name: 'B bot', config: { systemPrompt: 'secret' }, intents: [] };

  it('POST /api/agent requires a session', async () => {
    authMock.mockResolvedValue(null);
    const res = await agentRoute.POST(json('http://localhost/api/agent', { prompt: 'hi', tenantId: 'tB' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/agent/test-chat requires a session', async () => {
    authMock.mockResolvedValue(null);
    const res = await testChat.POST(json('http://localhost/api/agent/test-chat', { flowId: 'fB', message: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/agent/test-chat refuses another tenant\'s flow', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.flow.findUnique.mockResolvedValue(flowB);
    const res = await testChat.POST(json('http://localhost/api/agent/test-chat', { flowId: 'fB', message: 'hi' }));
    expect(res.status).toBe(404);
  });

  it('GET /api/flows/[id] hides another tenant\'s flow (and its system prompt)', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.flow.findUnique.mockResolvedValue(flowB);
    const res = await flowById.GET(new NextRequest('http://localhost/api/flows/fB'), params({ flowId: 'fB' }));
    expect(res.status).toBe(404);
  });

  it('GET /api/flows?id= hides another tenant\'s flow', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.flow.findUnique.mockResolvedValue(flowB);
    const res = await flows.GET(new NextRequest('http://localhost/api/flows?id=fB'));
    expect(res.status).toBe(404);
  });

  it('SUPER_ADMIN can still read any flow', async () => {
    authMock.mockResolvedValue(userOf('SUPER_ADMIN', null));
    prismaMock.flow.findUnique.mockResolvedValue(flowB);
    const res = await flowById.GET(new NextRequest('http://localhost/api/flows/fB'), params({ flowId: 'fB' }));
    expect(res.status).toBe(200);
  });

  it('DELETE /api/flows/[id] refuses another tenant\'s flow', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.flow.findUnique.mockResolvedValue(flowB);
    const res = await flowById.DELETE(new NextRequest('http://localhost/api/flows/fB', { method: 'DELETE' }), params({ flowId: 'fB' }));
    expect(res.status).toBe(404);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('DELETE /api/flows/[id] is forbidden for the AGENT role', async () => {
    authMock.mockResolvedValue(userOf('AGENT', 'tB'));
    const res = await flowById.DELETE(new NextRequest('http://localhost/api/flows/fB', { method: 'DELETE' }), params({ flowId: 'fB' }));
    expect(res.status).toBe(403);
  });

  it('POST /api/flows cannot overwrite another tenant\'s flow', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.flow.findUnique.mockResolvedValue({ tenantId: 'tB' });
    const res = await flows.POST(json('http://localhost/api/flows', { id: 'fB', name: 'pwned', config: { systemPrompt: 'evil' } }));
    expect(res.status).toBe(404);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.flow.update).not.toHaveBeenCalled();
  });

  it('DELETE /api/agent/documents/[id] refuses a document the tenant does not own', async () => {
    authMock.mockResolvedValue(userOf('BUSINESS_PARTNER', 'tA'));
    prismaMock.knowledgeDocument.findFirst.mockResolvedValue(null);
    const res = await docDelete.DELETE(new NextRequest('http://localhost/x', { method: 'DELETE' }), params({ documentId: 'doc-b' }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('DELETE /api/agent/documents/[id] requires a session', async () => {
    authMock.mockResolvedValue(null);
    const res = await docDelete.DELETE(new NextRequest('http://localhost/x', { method: 'DELETE' }), params({ documentId: 'doc-b' }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST /api/chat/send-response refuses another tenant\'s session', async () => {
    authMock.mockResolvedValue(userOf('AGENT', 'tA'));
    prismaMock.chatSession.findUnique.mockResolvedValue({ id: 's-b', tenantId: 'tB' });
    const res = await sendResponse.POST(json('http://localhost/x', { sessionId: 's-b', tenantId: 'tA', message: 'hi' }));
    expect(res.status).toBe(404);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });
});

describe('cron endpoint', () => {
  it('is closed when CRON_SECRET is not configured', async () => {
    const res = await cron.GET(new Request('http://localhost/api/cron/visitor-retention'));
    expect(res.status).toBe(401);
  });

  it('rejects a wrong bearer and accepts the right one', async () => {
    process.env.CRON_SECRET = 's3cret';
    const bad = await cron.GET(new Request('http://localhost/x', { headers: { authorization: 'Bearer nope' } }));
    expect(bad.status).toBe(401);
    const good = await cron.GET(new Request('http://localhost/x', { headers: { authorization: 'Bearer s3cret' } }));
    expect(good.status).toBe(200);
  });
});
