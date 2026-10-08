import { describe, it, expect, vi } from 'vitest';
import {
  getVisitorConfig,
  DEFAULT_EMAIL_CONFIG,
  EmailConfig,
} from '@/lib/visitor-config';
import {
  sendEmail,
  sendInquiryNotificationToTenant,
} from '@/lib/email-service';

describe('email-service and EmailConfig', () => {
  it('provides default azure email configuration with UAT settings', () => {
    expect(DEFAULT_EMAIL_CONFIG.provider).toBe('azure');
    expect(DEFAULT_EMAIL_CONFIG.azure?.tenantId).toBe('e204d887-6ff5-46af-a043-bd9e4a04de3c');
    expect(DEFAULT_EMAIL_CONFIG.azure?.clientId).toBe('ae1c234e-c8a8-436c-bcb5-ce871186cc0e');
    expect(DEFAULT_EMAIL_CONFIG.azure?.senderEmail).toBe('uat-noreply@ceosuite.com');
  });

  it('merges custom emailConfig inside getVisitorConfig correctly', () => {
    const customConfig: Partial<EmailConfig> = {
      provider: 'gmail',
      gmail: {
        user: 'support@ceosuite.com',
        appPassword: 'my-app-password',
        senderName: 'CEO SUITE Care',
      },
    };

    const result = getVisitorConfig({ emailConfig: customConfig });
    expect(result.emailConfig?.provider).toBe('gmail');
    expect(result.emailConfig?.gmail?.user).toBe('support@ceosuite.com');
    expect(result.emailConfig?.azure?.tenantId).toBe(DEFAULT_EMAIL_CONFIG.azure?.tenantId);
  });

  it('handles provider none by returning simulated success without sending network request', async () => {
    const result = await sendEmail({
      to: 'recipient@test.com',
      subject: 'Test Subject',
      html: '<p>Test body</p>',
      config: {
        provider: 'none',
      },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('none');
    expect(result.messageId).toContain('mock_');
  });

  it('throws descriptive error if azure configuration is missing required parameters', async () => {
    await expect(
      sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
        config: {
          provider: 'azure',
          azure: {
            tenantId: '',
            clientId: '',
            clientSecret: '',
            senderEmail: '',
          },
        },
      })
    ).rejects.toThrow('Konfigurasi Azure Email belum lengkap');
  });

  it('throws descriptive error if gmail configuration is missing required parameters', async () => {
    await expect(
      sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
        config: {
          provider: 'gmail',
          gmail: {
            user: '',
            appPassword: '',
          },
        },
      })
    ).rejects.toThrow('Konfigurasi Gmail belum lengkap');
  });

  it('skips dispatching inquiry notification when tenant has no fallbackEmail', async () => {
    const result = await sendInquiryNotificationToTenant(
      {
        id: 't-1',
        name: 'Test Tenant',
        fallbackEmail: null,
      },
      {
        category: 'Kendala Teknis',
        description: 'AC meeting room mati',
      }
    );

    expect(result).toBeNull();
  });
});
