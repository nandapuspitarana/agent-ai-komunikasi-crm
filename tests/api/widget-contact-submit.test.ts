import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  chatSession: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  message: { create: vi.fn() },
  visitorProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { POST, OPTIONS } from '@/app/api/widget/contact-submit/route';

const send = (body: any) =>
  POST(
    new NextRequest('http://localhost/api/widget/contact-submit', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  Object.values(prismaMock).forEach((m) =>
    Object.values(m).forEach((fn: any) => fn.mockReset())
  );
  prismaMock.chatSession.findUnique.mockResolvedValue(null);
  prismaMock.chatSession.findFirst.mockResolvedValue(null);
  prismaMock.chatSession.create.mockResolvedValue({ id: 's1', contactId: 'c1', status: 'bot' });
  prismaMock.message.create.mockImplementation(async ({ data }: any) => ({ id: 'm_' + Math.random(), ...data }));
});

describe('POST /api/widget/contact-submit', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await send({ tenantId: 't1' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('required');
  });

  it('returns 404 when tenant does not exist', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    const res = await send({
      tenantId: 'nonexistent',
      category: 'Kendala Teknis',
      description: 'AC ruangan mati',
    });
    expect(res.status).toBe(404);
  });

  it('successfully submits inquiry with profile state parsed from parameters and updates funnel', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 't1',
      name: 'CEO SUITE',
      fallbackEmail: 'support@ceosuite.com',
      visitorConfig: { enabled: true },
    });
    prismaMock.visitorProfile.findUnique.mockResolvedValue({
      id: 'vp1',
      tenantId: 't1',
      contactId: 'c1',
      email: null,
      name: null,
      metadata: {},
      leadClassification: 'cold',
      leadScore: 10,
    });
    prismaMock.visitorProfile.update.mockResolvedValue({ id: 'vp1' });

    const payload = {
      tenantId: 't1',
      contactId: 'c1',
      category: 'Kendala Teknis',
      description: 'Lampu di meeting room redup.',
      email: 'john@acme.corp',
      name: 'John Doe',
      company: 'ACME Corporation',
    };

    const res = await send(payload);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.sessionId).toBe('s1');
    expect(json.botReply).toContain('John Doe');
    expect(json.botReply).toContain('Kendala Teknis');
    expect(json.botReply).toContain('john@acme.corp');

    // 1. Verify user message created
    const createdMessages = prismaMock.message.create.mock.calls.map((c: any) => c[0].data);
    const userMsg = createdMessages.find((m: any) => m.senderType === 'user');
    expect(userMsg.content).toContain('Kendala Teknis');
    expect(userMsg.content).toContain('ACME Corporation');
    expect(userMsg.content).toContain('Lampu di meeting room redup.');

    // 2. Verify VisitorProfile updated with funnel promotion and metadata
    expect(prismaMock.visitorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vp1' },
        data: expect.objectContaining({
          email: 'john@acme.corp',
          name: 'John Doe',
          leadClassification: 'support',
          leadScore: { increment: 25 },
          metadata: expect.objectContaining({
            company: 'ACME Corporation',
            lastInquiryCategory: 'Kendala Teknis',
          }),
        }),
      })
    );
  });

  it('uses custom autoReplyTemplate with dynamic variable substitution', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 't1',
      name: 'CEO SUITE',
      fallbackEmail: 'support@ceosuite.com',
      visitorConfig: {
        contactForm: {
          enabled: true,
          autoReplyTemplate: 'Hai {name} dari {company}! Laporan kategori {category} telah kami terima. Kami akan follow up ke {email}.',
        },
      },
    });
    prismaMock.visitorProfile.findUnique.mockResolvedValue(null);
    prismaMock.visitorProfile.create.mockResolvedValue({ id: 'vp1' });

    const payload = {
      tenantId: 't1',
      category: 'Billing & Pembayaran',
      description: 'Invoice belum diterima.',
      email: 'jane@initech.com',
      name: 'Jane Smith',
      company: 'Initech',
    };

    const res = await send(payload);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.botReply).toBe(
      'Hai Jane Smith dari Initech! Laporan kategori Billing & Pembayaran telah kami terima. Kami akan follow up ke jane@initech.com.'
    );
  });

  it('formats userMessage and botReply in English when language is en or default', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 't1',
      name: 'CEO SUITE Singapore',
      fallbackEmail: 'support@ceosuite.com',
      visitorConfig: { language: 'en', enabled: true },
    });
    prismaMock.visitorProfile.findUnique.mockResolvedValue(null);
    prismaMock.visitorProfile.create.mockResolvedValue({ id: 'vp1' });

    const payload = {
      tenantId: 't1',
      category: 'Technical Issue',
      description: 'WiFi unstable in room 402',
      email: 'alex@startup.io',
      name: 'Alex Tan',
      company: 'Tech Startup',
    };

    const res = await send(payload);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.userMessage).toContain('📝 [Inquiry / Issue Report to Company]');
    expect(json.userMessage).toContain('• Category: Technical Issue');
    expect(json.userMessage).toContain('• Company: Tech Startup');
    expect(json.userMessage).toContain('• Name: Alex Tan');
    expect(json.userMessage).toContain('• Description: WiFi unstable in room 402');
    expect(json.botReply).toContain('Thank you Alex Tan! Your message and report regarding "Technical Issue" has been forwarded to our team.');
  });

  it('formats userMessage and botReply in Indonesian when language is id', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 't1',
      name: 'CEO SUITE Jakarta',
      fallbackEmail: 'support@ceosuite.com',
      visitorConfig: { language: 'id', enabled: true },
    });
    prismaMock.visitorProfile.findUnique.mockResolvedValue(null);
    prismaMock.visitorProfile.create.mockResolvedValue({ id: 'vp1' });

    const payload = {
      tenantId: 't1',
      category: 'Kendala Teknis',
      description: 'AC meeting room mati',
      email: 'budi@perusahaan.co.id',
      name: 'Budi Santoso',
      company: 'PT Maju Bersama',
    };

    const res = await send(payload);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.userMessage).toContain('📝 [Laporan Masalah ke Perusahaan]');
    expect(json.userMessage).toContain('• Kategori: Kendala Teknis');
    expect(json.userMessage).toContain('• Perusahaan: PT Maju Bersama');
    expect(json.userMessage).toContain('• Nama: Budi Santoso');
    expect(json.userMessage).toContain('• Deskripsi: AC meeting room mati');
    expect(json.botReply).toContain('Terima kasih Budi Santoso! Pesan dan laporan Anda terkait "Kendala Teknis" telah kami teruskan ke tim perusahaan.');
  });

  it('handles preflight OPTIONS request with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
