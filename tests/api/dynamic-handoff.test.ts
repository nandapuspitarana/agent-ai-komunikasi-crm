import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findCentre,
  findCentresByCity,
  findCentresByEmail,
  detectCentreInText,
  detectCityInText,
  resolveDynamicHandoff,
  CENTRES_DIRECTORY,
} from '@/lib/centres-directory';
import { POST } from '@/app/api/widget/message/route';
import { NextRequest } from 'next/server';

// Mock prisma for integration tests
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    chatSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    visitorProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    knowledgeDocument: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma as prismaMock } from '@/lib/prisma';

describe('Centres Directory & Dynamic Handoff Resolver', () => {
  it('TEST-DH-01 All 25 centres have valid metadata and brands', () => {
    expect(CENTRES_DIRECTORY.length).toBe(25);
    for (const c of CENTRES_DIRECTORY) {
      expect(c.name).toBeTruthy();
      expect(c.brand).toBeTruthy();
      expect(c.city).toBeTruthy();
      expect(c.phone).toBeTruthy();
      expect(c.email).toContain('@');
      expect(c.hours).toBeTruthy();
      expect(c.address).toBeTruthy();
    }
  });

  it('TEST-DH-02 findCentre matches by name, brand code, or alias', () => {
    expect(findCentre('Sahid Sudirman Center')?.brand).toBe('SSC');
    expect(findCentre('sahid sudirman')?.brand).toBe('SSC');
    expect(findCentre('SSC')?.name).toBe('Sahid Sudirman Center');
    expect(findCentre('CTN')?.name).toBe('Centennial Tower');
    expect(findCentre('centennial tower')?.city).toBe('Singapore');
    expect(findCentre('AXA')?.name).toBe('Axa Tower');
    expect(findCentre('q sentral')?.brand).toBe('QSE');
    expect(findCentre('nonexistent centre')).toBeUndefined();
  });

  it('TEST-DH-03 findCentresByEmail routes correctly by centre and city', () => {
    const sg = findCentresByEmail('sales@sg.ceosuite.com');
    expect(sg.length).toBe(2);
    expect(sg.map((c) => c.name)).toContain('Centennial Tower');
    expect(sg.map((c) => c.name)).toContain('Singapore Land Tower');

    const hz = findCentresByEmail('saleshz@cn.ceosuite.com');
    expect(hz.length).toBe(1);
    expect(hz[0].name).toBe('Ping An Finance Center');

    const jkt = findCentresByEmail('sales@ceosuite.com');
    expect(jkt.length).toBe(4);
    expect(jkt.map((c) => c.name)).toContain('Sahid Sudirman Center');
  });

  it('TEST-DH-04 detectCentreInText finds centre names in free text', () => {
    expect(detectCentreInText('Saya mau sewa di Sahid Sudirman Center')?.brand).toBe('SSC');
    expect(detectCentreInText('Berapa harga di centennial tower?')?.brand).toBe('CTN');
    expect(detectCentreInText('Apakah ada meeting room di AXA?')?.brand).toBe('AXA');
    expect(detectCentreInText('Halo selamat pagi Claire')).toBeUndefined();
  });

  it('TEST-DH-05 detectCityInText finds city names in free text', () => {
    expect(detectCityInText('Ada kantor di Jakarta?')).toBe('Jakarta');
    expect(detectCityInText('Bisa info lokasi Singapore')).toBe('Singapore');
    expect(detectCityInText('Pilihan lokasi di KLCC')).toBe('Kuala Lumpur');
    expect(detectCityInText('Kantor di Saigon')).toBe('Ho Chi Minh City');
  });

  it('TEST-DH-06 resolveDynamicHandoff for single centre produces tailored card', () => {
    const baseResponse = '[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified.\n\nFor urgent support, you may also call the front desk of your centre directly:\nKuala Lumpur\n• Axiata Tower: +60 3 2776 6888';
    
    const res = resolveDynamicHandoff({
      baseResponse,
      centre: 'Sahid Sudirman Center',
      isEn: true,
    });

    expect(res.dynamicallyResolved).toBe(true);
    expect(res.matchedCentre?.name).toBe('Sahid Sudirman Center');
    expect(res.reply).toContain('[HANDOFF_REQUESTED]');
    expect(res.reply).toContain('Sahid Sudirman Center (Jakarta)');
    expect(res.reply).toContain('+62 21 8063 1888');
    expect(res.reply).toContain('sales@ceosuite.com');
    expect(res.reply).not.toContain('Axiata Tower');
    expect(res.options).toContain('Front Desk: Sahid Sudirman Center');
  });

  it('TEST-DH-07 resolveDynamicHandoff for city produces city centres list', () => {
    const baseResponse = '[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified.\n\nFor urgent support, you may also call the front desk of your centre directly:\nKuala Lumpur\n• Axiata Tower: +60 3 2776 6888';

    const res = resolveDynamicHandoff({
      baseResponse,
      city: 'Jakarta',
      isEn: true,
    });

    expect(res.dynamicallyResolved).toBe(true);
    expect(res.matchedCity).toBe('Jakarta');
    expect(res.reply).toContain('[HANDOFF_REQUESTED]');
    expect(res.reply).toContain('Sahid Sudirman Center');
    expect(res.reply).toContain('Axa Tower');
    expect(res.reply).toContain('Indonesia Stock Exchange Tower 2');
    expect(res.reply).toContain('One Pacific Place');
    expect(res.reply).not.toContain('Centennial Tower');
  });

  it('TEST-DH-08 resolveDynamicHandoff in Indonesian generates Indonesian copy', () => {
    const baseResponse = '[HANDOFF_REQUESTED]\n\nFor urgent support, you may also call the front desk of your centre directly:\nKuala Lumpur...';

    const res = resolveDynamicHandoff({
      baseResponse,
      centre: 'Centennial Tower',
      isEn: false,
    });

    expect(res.dynamicallyResolved).toBe(true);
    expect(res.reply).toContain('Tim Layanan Pelanggan kami telah diberi tahu');
    expect(res.reply).toContain('Jam Operasional:');
    expect(res.reply).toContain('Centennial Tower (Singapore)');
  });
});

describe('POST /api/widget/message — Dynamic Handoff & Memorization Integration', () => {
  const TENANT_ID = 'tenant-test-dh';

  beforeEach(() => {
    vi.clearAllMocks();

    (prismaMock.tenant.findUnique as any).mockResolvedValue({
      id: TENANT_ID,
      name: 'CEO SUITE',
      aiEnabled: true,
      humanHandoffEnabled: true,
      handoffAgent: { name: 'Sarah' },
      visitorConfig: { enabled: true, language: 'en' },
      activeFlow: {
        id: 'flow-cs',
        name: 'Claire',
        config: { language: 'en' },
        intents: [
          {
            id: 'intent-handoff',
            name: 'CS: Speak to Human Agent / Live Support',
            trainingPhrases: ['speak to human', 'bicara dengan agen', 'CS: Speak to Human Agent / Live Support'],
            responseType: 'text',
            response: '[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified.\n\nFor urgent support, you may also call the front desk of your centre directly:\nKuala Lumpur\n• Axiata Tower: +60 3 2776 6888\nJakarta\n• Sahid Sudirman Center: +62 21 8063 1888',
            options: '',
            metadata: { handoff: true },
          },
        ],
      },
      flows: [],
    });

    (prismaMock.chatSession.findUnique as any).mockResolvedValue(null);
    (prismaMock.chatSession.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'session-dh-1', status: 'bot', ...data })
    );
    (prismaMock.chatSession.update as any).mockResolvedValue({ id: 'session-dh-1', status: 'queue' });

    (prismaMock.message.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `msg_${Date.now()}`, createdAt: new Date(), ...data })
    );

    (prismaMock.visitorProfile.findUnique as any).mockResolvedValue(null);
    (prismaMock.visitorProfile.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'vis-1', ...data })
    );
    (prismaMock.visitorProfile.update as any).mockResolvedValue({ id: 'vis-1' });
    (prismaMock.knowledgeDocument.findMany as any).mockResolvedValue([]);
  });

  async function postMessage(body: any) {
    const req = new NextRequest('http://localhost:8201/api/widget/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: TENANT_ID,
        ...body,
      }),
    });
    return POST(req);
  }

  it('TEST-DH-09 Request with centre profile returns single centre handoff hotline', async () => {
    const res = await postMessage({
      message: 'CS: Speak to Human Agent / Live Support',
      contactId: 'user-jakarta-1',
      centre: 'Sahid Sudirman Center',
      channel: 'mobile_app',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('queue');
    expect(json.handoffOccurred).toBe(true);
    expect(json.reply).toContain('Sahid Sudirman Center (Jakarta)');
    expect(json.reply).toContain('+62 21 8063 1888');
    expect(json.reply).not.toContain('Axiata Tower');
    expect(json.options).toBeDefined();
    expect(json.options.some((o: any) => o.label === 'Contact Front Desk')).toBe(true);
  });

  it('TEST-DH-10 Request with email_center (Centennial Tower) returns Singapore handoff hotline', async () => {
    const res = await postMessage({
      message: 'speak to human',
      contactId: 'user-singapore-1',
      email_center: 'sales@sg.ceosuite.com',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('queue');
    expect(json.reply).toContain('Singapore centres directly');
    expect(json.reply).toContain('Centennial Tower');
    expect(json.reply).toContain('+65 6829 7000');
    expect(json.reply).not.toContain('Sahid Sudirman');
  });

  it('TEST-DH-11 Memorization: user with memorized centre in visitorProfile gets personalized handoff on subsequent request', async () => {
    // VisitorProfile already has memorized centre in metadata
    (prismaMock.visitorProfile.findUnique as any).mockResolvedValue({
      id: 'vis-memorized',
      tenantId: TENANT_ID,
      contactId: 'user-repeat-client',
      city: 'Jakarta',
      metadata: {
        centre: 'Axa Tower',
        city: 'Jakarta',
        centrePhone: '+62 21 3005 3500',
      },
    });

    // Client sends generic request with NO centre parameter in body
    const res = await postMessage({
      message: 'CS: Speak to Human Agent / Live Support',
      contactId: 'user-repeat-client',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('queue');
    // It should automatically use the memorized centre (Axa Tower)!
    expect(json.reply).toContain('Axa Tower (Jakarta)');
    expect(json.reply).toContain('+62 21 3005 3500');
    expect(json.reply).not.toContain('Axiata Tower');
  });

  it('TEST-DH-12 resolveDynamicHandoff preserves dynamic conversational intro from AI Agent Proxy', () => {
    const aiProxyResponse =
      '[HANDOFF_REQUESTED]\n\nHalo Pak Budi, kami mohon maaf atas kendala koneksi Wi-Fi yang lambat di lantai 56. Tim CS dan teknisi kami sedang segera bergabung untuk membantu Anda.';

    const res = resolveDynamicHandoff({
      baseResponse: aiProxyResponse,
      centre: 'Sahid Sudirman Center',
      isEn: false,
    });

    expect(res.dynamicallyResolved).toBe(true);
    // Preserves the AI's contextual explanation about wifi in lantai 56
    expect(res.reply).toContain('kendala koneksi Wi-Fi yang lambat di lantai 56');
    expect(res.reply).toContain('Pak Budi');
    // Appends the verified centre hotline block
    expect(res.reply).toContain('Sahid Sudirman Center (Jakarta)');
    expect(res.reply).toContain('+62 21 8063 1888');
    expect(res.reply).toContain('56th Floor Jl. Jenderal Sudirman No. 86');
    // Appends the structured options
    expect(res.options).toContain('Front Desk: Sahid Sudirman Center');
  });

  it('TEST-DH-13 resolveDynamicHandoff with English AI response preserves empathy and appends centre hotline', () => {
    const aiProxyResponse =
      'Hello Mr. Alex, I understand the projector in Meeting Room 3 is not turning on. Our support team has been notified. [HANDOFF_REQUESTED]';

    const res = resolveDynamicHandoff({
      baseResponse: aiProxyResponse,
      centre: 'Axiata Tower',
      isEn: true,
    });

    expect(res.dynamicallyResolved).toBe(true);
    expect(res.reply).toContain('projector in Meeting Room 3');
    expect(res.reply).toContain('Axiata Tower (Kuala Lumpur)');
    expect(res.reply).toContain('+60 3 2776 6888');
    expect(res.reply).toContain('27th Floor 9 Jalan Stesen Sentral 5');
  });

  it('TEST-DH-14 Step 2 keyword handoff ("want to talk human agent") when humanHandoffEnabled is false routes to Centennial Tower Singapore, not fallbackEmail', async () => {
    (prismaMock.tenant.findUnique as any).mockResolvedValueOnce({
      id: TENANT_ID,
      name: 'CEO SUITE',
      aiEnabled: true,
      humanHandoffEnabled: false, // human handoff disabled!
      fallbackEmail: 'nanda@ceosuite.com',
      visitorConfig: { enabled: true, language: 'en' },
      activeFlow: null,
      flows: [],
    });

    const res = await postMessage({
      message: 'want to talk human agent',
      contactId: 'user-singapore-ct',
      centre: 'Centennial Tower',
      city: 'Singapore',
      name: 'Nanda',
      company: 'CEO SUITE',
      workspace: 'Centennial Tower',
      channel: 'mobile_app',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('bot');
    expect(json.humanHandoffEnabled).toBe(false);
    expect(json.handoffOccurred).toBe(false);

    // CRITICAL: Must be routed to Centennial Tower Singapore, NOT generic fallback email nanda@ceosuite.com!
    expect(json.reply).toContain('Centennial Tower (Singapore)');
    expect(json.reply).toContain('+65 6829 7000');
    expect(json.reply).toContain('sales@sg.ceosuite.com');
    expect(json.reply).toContain('3 Temasek Avenue');
    expect(json.reply).not.toContain('nanda@ceosuite.com');
    expect(json.emailCenter).toBe('sales@sg.ceosuite.com');
    expect(json.options).toBeDefined();
    expect(json.options.some((o: any) => o.label === 'Contact Front Desk')).toBe(true);
  });

  it('TEST-DH-15 Step 2 keyword handoff ("want to talk human agent") when humanHandoffEnabled is true queues and attaches Centennial Tower hotline', async () => {
    (prismaMock.tenant.findUnique as any).mockResolvedValueOnce({
      id: TENANT_ID,
      name: 'CEO SUITE',
      aiEnabled: true,
      humanHandoffEnabled: true,
      handoffAgent: { name: 'Sarah' },
      visitorConfig: { enabled: true, language: 'en' },
      activeFlow: null,
      flows: [],
    });

    const res = await postMessage({
      message: 'I want to talk human agent',
      contactId: 'user-singapore-live',
      centre: 'Centennial Tower',
      city: 'Singapore',
      name: 'Nanda',
      company: 'CEO SUITE',
      channel: 'mobile_app',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('queue');
    expect(json.handoffOccurred).toBe(true);
    expect(json.reply).toContain('Centennial Tower (Singapore)');
    expect(json.reply).toContain('+65 6829 7000');
    expect(json.emailCenter).toBe('sales@sg.ceosuite.com');
  });

  it('TEST-DH-16 Mobile data embedding: name, company, workspace, centre upserts VisitorProfile', async () => {
    (prismaMock.tenant.findUnique as any).mockResolvedValueOnce({
      id: TENANT_ID,
      name: 'CEO SUITE',
      aiEnabled: true,
      humanHandoffEnabled: false,
      fallbackEmail: 'nanda@ceosuite.com',
      visitorConfig: { enabled: true, language: 'en' },
      activeFlow: null,
      flows: [],
    });

    const res = await postMessage({
      message: 'What are the reception hours?',
      contactId: 'client-nanda-sg',
      name: 'Nanda',
      email: 'nanda@ceosuite.com',
      company: 'CEO SUITE Pte Ltd',
      workspace: 'Centennial Tower',
      centre: 'Centennial Tower',
      city: 'Singapore',
      channel: 'mobile_app',
    });

    expect(res.status).toBe(200);
    // Verifies prisma.visitorProfile.update was called with the embedded profile data
    expect(prismaMock.visitorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Nanda',
          email: 'nanda@ceosuite.com',
          city: 'Singapore',
          metadata: expect.objectContaining({
            centre: 'Centennial Tower',
            company: 'CEO SUITE Pte Ltd',
            workspace: 'Centennial Tower',
            centrePhone: '+65 6829 7000',
            centreEmail: 'sales@sg.ceosuite.com',
          }),
        }),
      })
    );
  });
});
