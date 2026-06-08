/**
 * AI Rules Engine
 * 
 * Menentukan apakah pesan harus:
 * 1. Dijawab oleh AI (mode bot)
 * 2. Di-handoff ke human agent (user meminta bicara dengan manusia)
 * 3. Di-eskalasi karena AI tidak bisa menjawab
 */

// Keyword trigger untuk deteksi intent "ingin bicara dengan manusia"
const HANDOFF_KEYWORDS_ID = [
  'bicara dengan manusia',
  'bicara dengan orang',
  'bicara dengan agen',
  'hubungi agen',
  'minta agen',
  'transfer ke agen',
  'operator',
  'staff',
  'customer service',
  'cs',
  'manusia',
  'orang asli',
  'talk to human',
  'speak to agent',
  'live agent',
  'human agent',
  'connect to agent',
  'i want to speak',
  'real person',
  'tidak mau bot',
  'bukan bot',
  'keluar dari bot',
];

// Keyword trigger untuk deteksi frustasi / eskalasi
const ESCALATION_KEYWORDS = [
  'tidak membantu',
  'ga membantu',
  'nggak berguna',
  'tidak berguna',
  'bukan itu',
  'salah paham',
  'tidak mengerti',
  'tidak ngerti',
  'not helpful',
  'useless',
  'you don\'t understand',
];

export type RuleCheckResult = {
  intent: 'continue_ai' | 'handoff_requested' | 'escalation';
  confidence: number;
  matchedKeyword?: string;
  reason: string;
};

/**
 * Mengecek apakah pesan user mengandung intent untuk berbicara dengan human agent
 */
export function checkHandoffIntent(message: string): RuleCheckResult {
  const normalized = message.toLowerCase().trim();

  // Check explicit handoff keywords
  for (const keyword of HANDOFF_KEYWORDS_ID) {
    if (normalized.includes(keyword)) {
      return {
        intent: 'handoff_requested',
        confidence: 0.95,
        matchedKeyword: keyword,
        reason: `User secara eksplisit meminta untuk berbicara dengan agen manusia (keyword: "${keyword}")`,
      };
    }
  }

  // Check escalation keywords
  for (const keyword of ESCALATION_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        intent: 'escalation',
        confidence: 0.7,
        matchedKeyword: keyword,
        reason: `User menunjukkan tanda frustrasi (keyword: "${keyword}"). Pertimbangkan eskalasi.`,
      };
    }
  }

  return {
    intent: 'continue_ai',
    confidence: 1.0,
    reason: 'Pesan normal, lanjutkan dengan AI',
  };
}

/**
 * Membangun system prompt yang akan dikirim ke AI engine
 * berdasarkan riwayat percakapan dan konfigurasi tenant
 */
export function buildSystemPrompt(options: {
  tenantName?: string;
  botName?: string;
  customInstructions?: string;
  handoffAgentName?: string;
}): string {
  const { tenantName = 'kami', botName = 'Asisten AI', customInstructions, handoffAgentName } = options;

  let handoffInstruction = '4. Jika pengguna meminta untuk berbicara dengan manusia/agen, segera tandai percakapan untuk dialihkan.';
  let exampleHandoff = 'Misalnya: "Tentu, saya akan menghubungkan Anda dengan agen kami sekarang. Mohon tunggu sebentar. [HANDOFF_REQUESTED]"';

  if (handoffAgentName) {
    handoffInstruction = `4. Jika pengguna meminta untuk berbicara dengan manusia/agen, beri tahu bahwa mereka akan dihubungkan dengan agen manusia kami bernama ${handoffAgentName}, dan segera tandai percakapan untuk dialihkan.`;
    exampleHandoff = `Misalnya: "Tentu, saya akan segera menghubungkan Anda dengan agen kami, ${handoffAgentName}. Mohon tunggu sebentar ya! [HANDOFF_REQUESTED]"`;
  }

  const base = `Anda adalah ${botName}, asisten layanan pelanggan AI yang ramah dan profesional untuk ${tenantName}.

ATURAN UTAMA:
1. Selalu jawab dengan sopan, jelas, dan ringkas dalam Bahasa Indonesia.
2. Jika Anda tidak tahu jawabannya, jujurlah dan sarankan pengguna untuk menghubungi tim kami.
3. JANGAN pernah memberikan informasi palsu atau spekulatif.
${handoffInstruction}
5. Jaga agar balasan singkat dan to-the-point (maks 3-4 kalimat kecuali diminta lebih panjang).

FORMAT HANDOFF:
Jika Anda mendeteksi bahwa pengguna ingin berbicara dengan manusia, sertakan tag berikut di akhir respons Anda:
[HANDOFF_REQUESTED]

${exampleHandoff}`;

  if (customInstructions) {
    return `${base}\n\nINSTRUKSI TAMBAHAN:\n${customInstructions}`;
  }

  return base;
}

/**
 * Memeriksa apakah respons AI mengandung flag handoff
 */
export function parseAIResponseForHandoff(aiReply: string): {
  cleanReply: string;
  handoffRequested: boolean;
} {
  const handoffFlag = '[HANDOFF_REQUESTED]';
  const hasHandoff = aiReply.includes(handoffFlag);
  const cleanReply = aiReply.replace(handoffFlag, '').trim();

  return {
    cleanReply,
    handoffRequested: hasHandoff,
  };
}
