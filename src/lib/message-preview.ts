// One-line text preview of a chat message, for lists (dashboard Live Monitoring, inbox).
// Bot replies are stored as HTML: a text followed by quick-reply <button>s, or an answer
// card. A card previews as its title; buttons are dropped; any other markup becomes text.

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function messagePreview(content: string | null | undefined, max = 100): string {
  let text = content ?? '';
  if (/<[a-z/!]/i.test(text)) {
    const title = /class=['"]card-title['"][^>]*>([\s\S]*?)<\/div>/i.exec(text);
    if (title) text = title[1];
    text = text
      .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<button\b[\s\S]*?<\/button\s*>/gi, ' ')
      .replace(/<[^>]*>/g, ' ');
  }
  text = text
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
