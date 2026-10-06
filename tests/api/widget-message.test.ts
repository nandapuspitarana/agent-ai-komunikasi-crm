import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  chatSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  message: { create: vi.fn(), findMany: vi.fn() },
  knowledgeDocument: { findMany: vi.fn() },
  visitorProfile: { update: vi.fn() },
  user: { findUnique: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/ai-agent', () => ({ chatWithAgent: vi.fn().mockResolvedValue({ reply: 'LLM reply' }) }));
vi.mock('@/lib/visitor-service', () => ({
  updateVisitorFromExtraction: vi.fn().mockResolvedValue(undefined),
  upsertVisitorProfile: vi.fn().mockResolvedValue(undefined),
  updateVisitorClassification: vi.fn().mockResolvedValue(undefined),
  shouldTriggerLeadForm: vi.fn().mockResolvedValue(false),
}));

import { POST, GET } from '@/app/api/widget/message/route';

const intent = (over: any = {}) => ({
  name: 'Rooms',
  trainingPhrases: ['rooms'],
  response: 'Pilih tipe ruang:',
  responseType: 'options',
  options: "Office|Private Office, Kids' room",
  ...over,
});

const tenant = (over: any = {}, intents: any[] = [intent()]) => ({
  id: 't1',
  name: 'CEOSUITE',
  aiEnabled: false,
  aiSystemPrompt: '',
  visitorConfig: { enabled: false },
  handoffAgent: null,
  activeFlowId: 'f1',
  activeFlow: { id: 'f1', name: 'Claire', config: {}, intents },
  flows: [],
  ...over,
});

const send = (message: string, channel?: string) =>
  POST(
    new NextRequest('http://localhost/api/widget/message', {
      method: 'POST',
      body: JSON.stringify({ tenantId: 't1', message, contactId: 'c1', ...(channel && { channel }) }),
    })
  );

beforeEach(() => {
  Object.values(prismaMock).forEach((m) => Object.values(m).forEach((fn: any) => fn.mockReset()));
  prismaMock.chatSession.findUnique.mockResolvedValue(null);
  prismaMock.chatSession.create.mockResolvedValue({ id: 's1', contactId: 'c1', status: 'bot' });
  prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm', ...data }));
  prismaMock.message.findMany.mockResolvedValue([]);
  prismaMock.knowledgeDocument.findMany.mockResolvedValue([]);
});

describe('POST /api/widget/message — quick reply options', () => {
  it('TEST-AI-F03a mobile_app: clean reply + structured options + responseType, nothing HTML in DB', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant());
    const json = await (await send('rooms', 'mobile_app')).json();

    expect(json.reply).toBe('Pilih tipe ruang:');
    expect(json.reply).not.toMatch(/<button|<div/);
    expect(json.responseType).toBe('options');
    expect(json.options).toEqual([
      { label: 'Office', value: 'Private Office' },
      { label: "Kids' room", value: "Kids' room" },
    ]);

    const saved = prismaMock.message.create.mock.calls.map((c: any) => c[0].data).find((d: any) => d.senderType === 'bot');
    expect(saved.content).toBe('Pilih tipe ruang:');
  });

  it('TEST-AI-R14 web widget keeps HTML buttons, escaped, and no separate options field (avoids double render)', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant());
    const json = await (await send('rooms')).json(); // default channel = widget

    expect(json.reply).toContain('<button');
    expect(json.reply).toContain('Kids&#39; room</button>');
    expect(json.reply).not.toContain("text: 'Kids' room'"); // the old, breakable form
    expect(json.options).toBeUndefined();
    expect(json.responseType).toBe('options'); // responseType is informational for widget
  });

  it('TEST-AI-F03b aiEnabled=true with option intent bypasses LLM and still returns options', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant({ aiEnabled: true }));
    const json = await (await send('rooms', 'mobile_app')).json();
    expect(json.reply).toBe('Pilih tipe ruang:');
    expect(json.options).toHaveLength(2);
  });

  it('no options intent -> responseType text and no options field', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant({}, [intent({ options: '', responseType: 'text' })]));
    const json = await (await send('rooms', 'mobile_app')).json();
    expect(json.responseType).toBe('text');
    expect(json.options).toBeUndefined();
  });

  it('form/card intents pass their responseType through', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(
      tenant({}, [intent({ responseType: 'card', options: '', response: "<div class='card'>x</div>" })])
    );
    const json = await (await send('rooms', 'mobile_app')).json();
    expect(json.responseType).toBe('card');
  });

  it('TEST-AI-F04 handoff keyword short-circuits to queue in English when flow is English', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(
      tenant({
        activeFlow: { id: 'f1', name: 'Claire', config: { language: 'English' }, intents: [] },
      })
    );
    const json = await (await send('talk to a human agent', 'mobile_app')).json();
    expect(json.status).toBe('queue');
    expect(json.handoffOccurred).toBe(true);
    expect(json.reply).toContain('Sure, I will connect you with our customer support team');
  });

  it('TEST-AI-F04b structured flow command starting with CS: does not trigger handoff', async () => {
    const contactIntent = intent({
      name: 'CS: Contact Directory All Locations',
      trainingPhrases: ['CS: Contact Directory All Locations'],
      response: 'Regional Directory:',
      responseType: 'options',
      options: 'Jakarta|jkt, KL|kl',
    });
    prismaMock.tenant.findUnique.mockResolvedValue(tenant({}, [contactIntent]));
    const json = await (await send('CS: Contact Directory All Locations', 'mobile_app')).json();
    expect(json.status).toBe('bot');
    expect(json.handoffOccurred).toBe(false);
    expect(json.reply).toBe('Regional Directory:');
  });

  it('TEST-AI-F04c explicit handoff intent with hotlines bypasses LLM and returns custom response', async () => {
    const handoffIntent = intent({
      name: 'CS: Speak to Human Agent / Live Support',
      trainingPhrases: ['CS: Speak to Human Agent / Live Support'],
      response: '[HANDOFF_REQUESTED]\nOur team has been notified. Hotlines: +62 8111 508 481',
      responseType: 'text',
      options: '',
    });
    prismaMock.tenant.findUnique.mockResolvedValue(tenant({ aiEnabled: true }, [handoffIntent]));
    const json = await (await send('CS: Speak to Human Agent / Live Support', 'mobile_app')).json();
    expect(json.status).toBe('queue');
    expect(json.handoffOccurred).toBe(true);
    expect(json.reply).toContain('Our team has been notified. Hotlines: +62 8111 508 481');
    expect(json.reply).not.toContain('[HANDOFF_REQUESTED]');
  });
});

describe('GET /api/widget/message — polling and sync', () => {
  it('returns 400 when sessionId is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/widget/message'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('sessionId');
  });

  it('returns 404 when session does not exist', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/widget/message?sessionId=non-existent'));
    expect(res.status).toBe(404);
  });

  it('returns session status, assigned agent name, and messages for valid session', async () => {
    prismaMock.chatSession.findUnique.mockResolvedValue({
      id: 's1',
      status: 'agent',
      handoffRequested: false,
      assignedAgentId: 'agent-123',
    });
    prismaMock.user.findUnique.mockResolvedValue({ name: 'Nanda Support' });
    prismaMock.message.findMany.mockResolvedValue([
      {
        id: 'm1',
        sessionId: 's1',
        senderType: 'user',
        content: 'Halo saya butuh bantuan',
        createdAt: new Date('2026-10-06T07:50:00Z'),
      },
      {
        id: 'm2',
        sessionId: 's1',
        senderType: 'agent',
        content: 'Halo, saya Nanda siap membantu.',
        createdAt: new Date('2026-10-06T07:51:00Z'),
      },
    ]);

    const res = await GET(new NextRequest('http://localhost/api/widget/message?sessionId=s1'));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.status).toBe('agent');
    expect(json.assignedAgentName).toBe('Nanda Support');
    expect(json.messages).toHaveLength(2);
    expect(json.messages[1].senderType).toBe('agent');
    expect(json.messages[1].senderName).toBe('Nanda Support');
    expect(json.messages[1].content).toBe('Halo, saya Nanda siap membantu.');
  });
});

