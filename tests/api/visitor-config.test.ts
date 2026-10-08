import { describe, it, expect } from 'vitest';
import {
  getVisitorConfig,
  DEFAULT_VISITOR_CONFIG,
  DEFAULT_CONTACT_FORM_CONFIG,
} from '@/lib/visitor-config';

describe('visitor-config (ContactFormConfig)', () => {
  it('returns DEFAULT_CONTACT_FORM_CONFIG when input is empty or null', () => {
    const configNull = getVisitorConfig(null);
    expect(configNull.contactForm).toEqual(DEFAULT_CONTACT_FORM_CONFIG);

    const configEmpty = getVisitorConfig({});
    expect(configEmpty.contactForm).toEqual(DEFAULT_CONTACT_FORM_CONFIG);
  });

  it('correctly merges partial contactForm configuration', () => {
    const partialConfig = {
      contactForm: {
        enabled: false,
        buttonLabel: 'Lapor Cepat',
        categories: ['Kategori A', 'Kategori B'],
      },
    };

    const result = getVisitorConfig(partialConfig);
    expect(result.contactForm?.enabled).toBe(false);
    expect(result.contactForm?.buttonLabel).toBe('Lapor Cepat');
    expect(result.contactForm?.formTitle).toBe(DEFAULT_CONTACT_FORM_CONFIG.formTitle);
    expect(result.contactForm?.categories).toEqual(['Kategori A', 'Kategori B']);
  });

  it('falls back to default categories if an empty categories array is provided', () => {
    const result = getVisitorConfig({
      contactForm: {
        categories: [],
      },
    });
    expect(result.contactForm?.categories).toEqual(DEFAULT_CONTACT_FORM_CONFIG.categories);
  });

  it('handles JSON string parsing gracefully', () => {
    const stringConfig = JSON.stringify({
      contactForm: {
        buttonLabel: 'Custom Contact',
        autoReplyTemplate: 'Custom reply template',
      },
    });

    const result = getVisitorConfig(stringConfig);
    expect(result.contactForm?.buttonLabel).toBe('Custom Contact');
    expect(result.contactForm?.autoReplyTemplate).toBe('Custom reply template');
  });

  it('selects English or Indonesian defaults depending on language setting', () => {
    const configEn = getVisitorConfig({ language: 'en' });
    expect(configEn.contactForm?.formTitle).toBe('Contact Company / Report Issue');
    expect(configEn.contactForm?.buttonLabel).toBe('Send Email to Company');
    expect(configEn.contactForm?.categories).toContain('General Inquiry');

    const configId = getVisitorConfig({ language: 'id' });
    expect(configId.contactForm?.formTitle).toBe('Hubungi Perusahaan / Laporan');
    expect(configId.contactForm?.buttonLabel).toBe('Kirim Email ke Perusahaan');
    expect(configId.contactForm?.categories).toContain('Pertanyaan Umum');
  });
});
