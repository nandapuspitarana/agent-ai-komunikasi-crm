/**
 * Quick-reply option helpers shared by /api/widget/init, /config and /message.
 *
 * Raw format (as authored in the agent builder / intents):
 *   "Label|Value, Other label, Third|third value"
 * `Label` is what the button shows, `Value` is what gets sent back as the
 * user's message (defaults to the label).
 */

export interface QuickReplyOption {
  label: string;
  value: string;
}

/** Parses the comma separated builder string (or an array of raw strings). */
export function parseOptions(raw: unknown): QuickReplyOption[] {
  const items: string[] = Array.isArray(raw)
    ? raw.map((o) => String(o ?? ''))
    : typeof raw === 'string'
      ? raw.split(',')
      : [];

  const result: QuickReplyOption[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const pipeIdx = trimmed.indexOf('|');
    const label = (pipeIdx !== -1 ? trimmed.substring(0, pipeIdx) : trimmed).trim();
    const value = (pipeIdx !== -1 ? trimmed.substring(pipeIdx + 1) : trimmed).trim();
    if (!label) continue;
    result.push({ label, value: value || label });
  }
  return result;
}

/** Back to the `Label|Value` wire form used by the web ChatUI (`options: string[]`). */
export function toOptionStrings(options: QuickReplyOption[]): string[] {
  return options.map((o) => (o.value === o.label ? o.label : `${o.label}|${o.value}`));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Legacy HTML buttons appended to a bot reply for the web widget (rendered via
 * dangerouslySetInnerHTML). The value is JSON encoded and then HTML-escaped so
 * apostrophes / quotes / markup in option text can neither break the handler
 * nor inject script.
 */
export function toLegacyHtml(options: QuickReplyOption[]): string {
  if (options.length === 0) return '';
  const buttons = options
    .map((o) => {
      const handler = `window.postMessage({type: 'widget_quick_reply', text: ${JSON.stringify(o.value)}}, '*')`;
      return (
        `<button class="px-3 py-1.5 text-xs font-medium text-brand bg-brand-bg hover:bg-brand-bg border border-brand/30 rounded-full transition-colors" ` +
        `onclick="${escapeHtml(handler)}">${escapeHtml(o.label)}</button>`
      );
    })
    .join('');
  return `<div class="flex flex-wrap gap-2 mt-3">${buttons}</div>`;
}
