export type ExtractorMatchType =
  | 'contains_keyword'    // If message contains phrase → store storeValue
  | 'exact_match'         // If message is exactly phrase → store storeValue
  | 'extract_after'       // Take all text AFTER the phrase
  | 'extract_before'      // Take all text BEFORE the phrase
  | 'extract_between'     // Take text BETWEEN two phrases
  | 'regex';              // Power user: custom regex with capture group

export interface CustomExtractor {
  field: string;                  // DB key, e.g. "budget", "company_name"
  label: string;                  // Human label, e.g. "Budget Pelanggan"
  matchType: ExtractorMatchType;
  pattern: string;                // Trigger phrase or regex pattern
  patternEnd?: string;            // Only for extract_between: the end phrase
  storeValue?: string;            // Only for contains_keyword / exact_match
}

export interface ContactFormConfig {
  enabled: boolean;
  buttonLabel?: string;
  formTitle?: string;
  categories?: string[];
  autoReplyTemplate?: string;
}

export const DEFAULT_CONTACT_FORM_CONFIG: ContactFormConfig = {
  enabled: true,
  buttonLabel: 'Send Email to Company',
  formTitle: 'Hubungi Perusahaan / Laporan',
  categories: [
    'Pertanyaan Umum',
    'Layanan & Fasilitas',
    'Kendala Teknis',
    'Billing & Pembayaran',
    'Kemitraan',
    'Lainnya',
  ],
  autoReplyTemplate: '',
};

export interface VisitorConfig {
  enabled: boolean;
  layer1_passive: boolean;
  layer1_geolocation: boolean;
  layer2_nlp: boolean;
  layer2_nlp_name: boolean;
  layer2_nlp_email: boolean;
  layer2_nlp_phone: boolean;
  customExtractors: CustomExtractor[];
  layer3_leadform: boolean;
  leadFormTrigger: 'booking' | 'hot_lead' | 'warm';
  leadFormFields: ('name' | 'email' | 'phone')[];
  leadFormTitle: string;
  leadFormSkippable: boolean;
  layer4_classification: boolean;
  scoreWeights: {
    cold: number;
    warm: number;
    hot_lead: number;
    booking: number;
    support: number;
  };
  hotLeadThreshold: number;
  retentionDays: number;
  contactForm?: ContactFormConfig;
}

export const DEFAULT_VISITOR_CONFIG: VisitorConfig = {
  enabled: true,
  layer1_passive: true,
  layer1_geolocation: true,
  layer2_nlp: true,
  layer2_nlp_name: true,
  layer2_nlp_email: true,
  layer2_nlp_phone: true,
  customExtractors: [],
  layer3_leadform: true,
  leadFormTrigger: 'booking',
  leadFormFields: ['name', 'email', 'phone'],
  leadFormTitle: 'Boleh kami tahu sedikit tentang Anda?',
  leadFormSkippable: true,
  layer4_classification: true,
  scoreWeights: { cold: 1, warm: 5, hot_lead: 15, booking: 30, support: 0 },
  hotLeadThreshold: 50,
  retentionDays: 90,
  contactForm: DEFAULT_CONTACT_FORM_CONFIG,
};

export function getVisitorConfig(tenantVisitorConfig: any): VisitorConfig {
  if (!tenantVisitorConfig) return DEFAULT_VISITOR_CONFIG;
  
  let parsedConfig = tenantVisitorConfig;
  if (typeof tenantVisitorConfig === 'string') {
    try {
      parsedConfig = JSON.parse(tenantVisitorConfig);
    } catch (e) {
      return DEFAULT_VISITOR_CONFIG;
    }
  }

  if (Object.keys(parsedConfig).length === 0) {
    return DEFAULT_VISITOR_CONFIG;
  }

  return {
    ...DEFAULT_VISITOR_CONFIG,
    ...parsedConfig,
    scoreWeights: {
      ...DEFAULT_VISITOR_CONFIG.scoreWeights,
      ...(parsedConfig.scoreWeights || {})
    },
    // Migrate old customNlpPatterns to empty customExtractors
    customExtractors: parsedConfig.customExtractors || [],
    contactForm: {
      ...DEFAULT_CONTACT_FORM_CONFIG,
      ...(parsedConfig.contactForm || {}),
      categories: parsedConfig.contactForm?.categories && parsedConfig.contactForm.categories.length > 0
        ? parsedConfig.contactForm.categories
        : DEFAULT_CONTACT_FORM_CONFIG.categories,
    },
  };
}
