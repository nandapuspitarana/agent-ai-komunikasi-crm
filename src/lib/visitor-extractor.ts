import { VisitorConfig } from './visitor-config';

export interface ExtractedVisitorData {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:(?:\+62|62|0)(?:8[1-9][0-9]{6,10}))/;

// Indonesian and English patterns
const NAME_PATTERNS = [
  /nama saya\s+([A-Za-z\s]+)/i,
  /panggil saya\s+([A-Za-z\s]+)/i,
  /saya\s+([A-Za-z\s]+)/i,
  /my name is\s+([A-Za-z\s]+)/i,
  /i am\s+([A-Za-z\s]+)/i,
  /i'm\s+([A-Za-z\s]+)/i,
];

/**
 * Evaluate a single custom extractor rule against the message.
 * Returns the extracted/stored value or null if no match.
 */
function evaluateExtractor(
  message: string,
  matchType: string,
  pattern: string,
  patternEnd?: string,
  storeValue?: string
): string | null {
  const msg = message.toLowerCase().trim();
  const pat = pattern.toLowerCase().trim();

  switch (matchType) {
    case 'contains_keyword': {
      // If message contains the keyword → store the fixed storeValue
      if (msg.includes(pat)) {
        return storeValue || 'yes';
      }
      return null;
    }

    case 'exact_match': {
      // If message is exactly (or starts with) the pattern → store storeValue
      if (msg === pat || msg.startsWith(pat + ' ') || msg.endsWith(' ' + pat)) {
        return storeValue || 'yes';
      }
      return null;
    }

    case 'extract_after': {
      // Find the trigger phrase and extract everything AFTER it
      const idx = msg.indexOf(pat);
      if (idx === -1) return null;
      const extracted = message.slice(idx + pattern.length).trim();
      // Take max first 50 chars to avoid extracting whole paragraph
      return extracted.slice(0, 100).split(/[.,!?]/)[0].trim() || null;
    }

    case 'extract_before': {
      // Find the trigger phrase and extract everything BEFORE it
      const idx = msg.indexOf(pat);
      if (idx === -1) return null;
      const extracted = message.slice(0, idx).trim();
      return extracted.slice(-100).split(/[.,!?]/).pop()?.trim() || null;
    }

    case 'extract_between': {
      // Extract text between two phrases (pattern and patternEnd)
      if (!patternEnd) return null;
      const patEnd = patternEnd.toLowerCase().trim();
      const startIdx = msg.indexOf(pat);
      if (startIdx === -1) return null;
      const startPos = startIdx + pattern.length;
      const endIdx = msg.indexOf(patEnd, startPos);
      if (endIdx === -1) return null;
      return message.slice(startPos, endIdx).trim() || null;
    }

    case 'regex': {
      // Power user: custom regex with capture group (group 1 = extracted value)
      try {
        const regex = new RegExp(pattern, 'i');
        const match = message.match(regex);
        if (match && match[1]) return match[1].trim();
      } catch (e) {
        console.warn(`[Extractor] Invalid regex pattern: ${pattern}`, e);
      }
      return null;
    }

    default:
      return null;
  }
}

export function extractVisitorData(message: string, config: VisitorConfig): ExtractedVisitorData {
  const result: ExtractedVisitorData = {};
  
  if (!config.enabled || !config.layer2_nlp) {
    return result;
  }

  // 1. Extract Email
  if (config.layer2_nlp_email) {
    const emailMatch = message.match(EMAIL_REGEX);
    if (emailMatch) {
      result.email = emailMatch[0].toLowerCase();
    }
  }

  // 2. Extract Phone
  if (config.layer2_nlp_phone) {
    const phoneMatch = message.match(PHONE_REGEX);
    if (phoneMatch) {
      result.phone = phoneMatch[0].replace(/\D/g, '');
    }
  }

  // 3. Extract Name using default patterns
  if (config.layer2_nlp_name) {
    for (const regex of NAME_PATTERNS) {
      const match = message.match(regex);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        if (extractedName.length < 30 && extractedName.split(' ').length <= 4) {
          const blacklist = ['mau', 'ingin', 'bisa', 'tidak', 'gak', 'belum', 'sudah'];
          const firstWord = extractedName.split(' ')[0].toLowerCase();
          if (!blacklist.includes(firstWord)) {
            result.name = extractedName;
            break;
          }
        }
      }
    }
  }

  // 4. Run Custom No-Code Extractors
  if (config.customExtractors && config.customExtractors.length > 0) {
    const metadata: Record<string, string> = {};
    
    for (const extractor of config.customExtractors) {
      if (!extractor.field || !extractor.pattern) continue;
      
      const extracted = evaluateExtractor(
        message,
        extractor.matchType,
        extractor.pattern,
        extractor.patternEnd,
        extractor.storeValue
      );

      if (extracted) {
        metadata[extractor.field] = extracted;
      }
    }

    if (Object.keys(metadata).length > 0) {
      result.metadata = metadata;
    }
  }

  return result;
}
