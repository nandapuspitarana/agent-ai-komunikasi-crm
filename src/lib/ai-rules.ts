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

export type LeadClassification = 'cold' | 'warm' | 'hot_lead' | 'booking' | 'support';

/**
 * Membangun system prompt yang akan dikirim ke AI engine
 * berdasarkan riwayat percakapan dan konfigurasi tenant
 */
export function buildSystemPrompt(options: {
  tenantName?: string;
  botName?: string;
  customInstructions?: string;
  handoffAgentName?: string;
  language?: string;
  speakingStyle?: string;
  businessNeeds?: string;
  enableClassification?: boolean;
  enableExtraction?: boolean;
}): string {
  const { 
    tenantName = 'kami', 
    botName = 'Asisten AI', 
    customInstructions, 
    handoffAgentName,
    language = 'Bahasa Indonesia',
    speakingStyle = 'ramah dan profesional',
    businessNeeds = '',
    enableClassification = false,
    enableExtraction = false
  } = options;

  let handoffInstruction = '4. Jika pengguna meminta untuk berbicara dengan manusia/agen, segera tandai percakapan untuk dialihkan.';
  let exampleHandoff = 'Misalnya: "Tentu, saya akan menghubungkan Anda dengan agen kami sekarang. Mohon tunggu sebentar. [HANDOFF_REQUESTED]"';

  if (handoffAgentName) {
    handoffInstruction = `4. Jika pengguna meminta untuk berbicara dengan manusia/agen, beri tahu bahwa mereka akan dihubungkan dengan agen manusia kami bernama ${handoffAgentName}, dan segera tandai percakapan untuk dialihkan.`;
    exampleHandoff = `Misalnya: "Tentu, saya akan segera menghubungkan Anda dengan agen kami, ${handoffAgentName}. Mohon tunggu sebentar ya! [HANDOFF_REQUESTED]"`;
  }

  const base = `Anda adalah ${botName}, asisten layanan pelanggan AI yang ${speakingStyle} untuk ${tenantName}.

ATURAN UTAMA:
1. Selalu jawab dengan sopan, jelas, dan ringkas dalam ${language}.
2. Jika Anda tidak tahu jawabannya, jujurlah dan sarankan pengguna untuk menghubungi tim kami.
3. JANGAN pernah memberikan informasi palsu atau spekulatif.
${handoffInstruction}
5. Jaga agar balasan singkat dan to-the-point (maks 3-4 kalimat kecuali diminta lebih panjang).
${businessNeeds ? `\nKEBUTUHAN USAHA (Konteks Layanan):\n${businessNeeds}\nGunakan informasi di atas sebagai konteks utama saat membalas pengguna.` : ''}

FORMAT HANDOFF:
Jika Anda mendeteksi bahwa pengguna ingin berbicara dengan manusia, sertakan tag berikut di akhir respons Anda:
[HANDOFF_REQUESTED]

${exampleHandoff}`;

  let finalPrompt = base;

  if (enableClassification) {
    finalPrompt += `

CLASSIFICATION TASK:
At the END of every response, you MUST add exactly ONE classification tag (hidden from the user) representing the user's intent in this conversation:
[CLASS:cold] - Just browsing, asking general non-specific questions
[CLASS:warm] - Showing interest in a specific product/service
[CLASS:hot_lead] - High intent to purchase, asking about price or process
[CLASS:booking] - Wants to book, schedule, buy, or transact right now
[CLASS:support] - Existing customer asking for help or having an issue
Example: "Here is the price list. [CLASS:hot_lead]"`;
  }

  if (enableExtraction) {
    finalPrompt += `

DATA EXTRACTION TASK:
If the user mentions their name, email, or phone number in the conversation, you MUST extract it and append a data tag at the VERY END of your response.
Format: [DATA: name="Nama Lengkap", email="Alamat Email", phone="Nomor Telepon"]
Only include the fields you found. Do NOT hallucinate data. Do NOT extract literal phrases like "adalah manusia" as a name.
Example: "Terima kasih Pak Budi, saya catat nomornya. [DATA: name="Budi", phone="081234567"]"`;
  }

  if (customInstructions) {
    finalPrompt += `\n\nINSTRUKSI TAMBAHAN:\n${customInstructions}`;
  }

  return finalPrompt;
}

/**
 * Memeriksa apakah respons AI mengandung tag ekstraksi data
 */
export function parseDataExtractionTag(aiReply: string): {
  cleanReply: string;
  extractedData: Record<string, string>;
} {
  const regex = /\[DATA:\s*(.*?)\]/i;
  const match = aiReply.match(regex);
  const extractedData: Record<string, string> = {};
  let cleanReply = aiReply;

  if (match && match[1]) {
    const dataString = match[1];
    // Match key="value" or key='value'
    const kvRegex = /(\w+)=["']([^"']+)["']/g;
    let kvMatch;
    while ((kvMatch = kvRegex.exec(dataString)) !== null) {
      if (kvMatch[1] && kvMatch[2]) {
        extractedData[kvMatch[1].toLowerCase()] = kvMatch[2];
      }
    }
    // Remove the tag from the reply
    cleanReply = aiReply.replace(match[0], '').trim();
  }

  return {
    cleanReply,
    extractedData
  };
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

/**
 * Memeriksa apakah respons AI mengandung tag klasifikasi
 */
export function parseClassificationTag(aiReply: string): {
  cleanReply: string;
  classification: LeadClassification | null;
} {
  const match = aiReply.match(/\[CLASS:(cold|warm|hot_lead|booking|support)\]/i);
  let classification: LeadClassification | null = null;
  let cleanReply = aiReply;

  if (match && match[1]) {
    classification = match[1].toLowerCase() as LeadClassification;
    // Remove the tag from the reply
    cleanReply = aiReply.replace(match[0], '').trim();
  }

  return {
    cleanReply,
    classification
  };
}
