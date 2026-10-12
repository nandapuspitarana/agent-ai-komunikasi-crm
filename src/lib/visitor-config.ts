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

export const DEFAULT_CONTACT_FORM_CONFIG_EN: ContactFormConfig = {
  enabled: true,
  buttonLabel: 'Send Email to Company',
  formTitle: 'Contact Company / Report Issue',
  categories: [
    'General Inquiry',
    'Services & Facilities',
    'Technical Issue',
    'Billing & Payment',
    'Partnership',
    'Other',
  ],
  autoReplyTemplate: '',
};

export const DEFAULT_CONTACT_FORM_CONFIG_ID: ContactFormConfig = {
  enabled: true,
  buttonLabel: 'Kirim Email ke Perusahaan',
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

export const DEFAULT_CONTACT_FORM_CONFIG: ContactFormConfig = DEFAULT_CONTACT_FORM_CONFIG_EN;

export type EmailProvider = 'azure' | 'gmail' | 'custom' | 'none';

export interface AzureEmailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
  senderName?: string;
  subjectPrefix?: string;
}

export interface GmailEmailConfig {
  user: string;
  appPassword: string;
  senderName?: string;
}

export interface CustomSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderEmail: string;
  senderName?: string;
}

export interface EmailConfig {
  provider: EmailProvider;
  azure?: AzureEmailConfig;
  gmail?: GmailEmailConfig;
  custom?: CustomSmtpConfig;
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: 'azure',
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || 'e204d887-6ff5-46af-a043-bd9e4a04de3c',
    clientId: process.env.AZURE_CLIENT_ID || 'ae1c234e-c8a8-436c-bcb5-ce871186cc0e',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    senderEmail: process.env.AZURE_SENDER_EMAIL || 'uat-noreply@ceosuite.com',
    senderName: process.env.AZURE_SENDER_NAME || 'UAT-APP',
    subjectPrefix: process.env.AZURE_EMAIL_SUBJECT_PREFIX || 'UAT-APP',
  },
  gmail: {
    user: '',
    appPassword: '',
    senderName: 'CEO SUITE Support',
  },
  custom: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'CEO SUITE Support',
  },
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
  language?: 'en' | 'id' | string;
  contactForm?: ContactFormConfig;
  emailConfig?: EmailConfig;
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
  leadFormTitle: 'May we know a little about you?',
  leadFormSkippable: true,
  layer4_classification: true,
  scoreWeights: { cold: 1, warm: 5, hot_lead: 15, booking: 30, support: 0 },
  hotLeadThreshold: 50,
  retentionDays: 90,
  language: 'en',
  contactForm: DEFAULT_CONTACT_FORM_CONFIG,
  emailConfig: DEFAULT_EMAIL_CONFIG,
};

export function getVisitorConfig(tenantVisitorConfig: any, preferredLang?: string): VisitorConfig {
  if (!tenantVisitorConfig) {
    if (preferredLang && preferredLang.toLowerCase().startsWith('id')) {
      return {
        ...DEFAULT_VISITOR_CONFIG,
        language: 'id',
        contactForm: DEFAULT_CONTACT_FORM_CONFIG_ID,
      };
    }
    return DEFAULT_VISITOR_CONFIG;
  }
  
  let parsedConfig = tenantVisitorConfig;
  if (typeof tenantVisitorConfig === 'string') {
    try {
      parsedConfig = JSON.parse(tenantVisitorConfig);
    } catch (e) {
      return DEFAULT_VISITOR_CONFIG;
    }
  }

  if (Object.keys(parsedConfig).length === 0) {
    if (preferredLang && preferredLang.toLowerCase().startsWith('id')) {
      return {
        ...DEFAULT_VISITOR_CONFIG,
        language: 'id',
        contactForm: DEFAULT_CONTACT_FORM_CONFIG_ID,
      };
    }
    return DEFAULT_VISITOR_CONFIG;
  }

  const effectiveLang = (parsedConfig.language || preferredLang || 'en').toLowerCase();
  const defaultContactForm = effectiveLang.startsWith('id')
    ? DEFAULT_CONTACT_FORM_CONFIG_ID
    : DEFAULT_CONTACT_FORM_CONFIG_EN;

  return {
    ...DEFAULT_VISITOR_CONFIG,
    ...parsedConfig,
    language: parsedConfig.language || (effectiveLang.startsWith('id') ? 'id' : 'en'),
    leadFormTitle: parsedConfig.leadFormTitle || (effectiveLang.startsWith('id') ? 'Boleh kami tahu sedikit tentang Anda?' : 'May we know a little about you?'),
    scoreWeights: {
      ...DEFAULT_VISITOR_CONFIG.scoreWeights,
      ...(parsedConfig.scoreWeights || {})
    },
    // Migrate old customNlpPatterns to empty customExtractors
    customExtractors: parsedConfig.customExtractors || [],
    contactForm: {
      ...defaultContactForm,
      ...(parsedConfig.contactForm || {}),
      categories: parsedConfig.contactForm?.categories && parsedConfig.contactForm.categories.length > 0
        ? parsedConfig.contactForm.categories
        : defaultContactForm.categories,
    },
    emailConfig: {
      ...DEFAULT_EMAIL_CONFIG,
      ...(parsedConfig.emailConfig || {}),
      azure: {
        ...DEFAULT_EMAIL_CONFIG.azure!,
        ...(parsedConfig.emailConfig?.azure || {}),
      },
      gmail: {
        ...DEFAULT_EMAIL_CONFIG.gmail!,
        ...(parsedConfig.emailConfig?.gmail || {}),
      },
      custom: {
        ...DEFAULT_EMAIL_CONFIG.custom!,
        ...(parsedConfig.emailConfig?.custom || {}),
      },
    },
  };
}
