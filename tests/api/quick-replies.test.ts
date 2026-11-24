import { describe, it, expect } from 'vitest';
import { parseOptions, toOptionStrings, toLegacyHtml } from '@/lib/quick-replies';
import { readWelcomeConfig, resolveEffectiveFlow } from '@/lib/flow-resolver';

describe('parseOptions', () => {
  it('TEST-AI-F01a parses Label|Value, plain labels, spacing and empty items', () => {
    expect(parseOptions('Bangkok|Bangkok Private Office, Jakarta ,, KL|Kuala Lumpur')).toEqual([
      { label: 'Bangkok', value: 'Bangkok Private Office' },
      { label: 'Jakarta', value: 'Jakarta' },
      { label: 'KL', value: 'Kuala Lumpur' },
    ]);
  });

  it('falls back to label when value after the pipe is empty, skips empty labels', () => {
    expect(parseOptions('Pricing|, |orphan')).toEqual([{ label: 'Pricing', value: 'Pricing' }]);
  });

  it('accepts arrays and ignores non-string input', () => {
    expect(parseOptions(['A|a', ' B '])).toEqual([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'B' },
    ]);
    expect(parseOptions(null)).toEqual([]);
    expect(parseOptions(undefined)).toEqual([]);
    expect(parseOptions(42)).toEqual([]);
  });

  it('round-trips through toOptionStrings', () => {
    const opts = parseOptions('A|x, B');
    expect(toOptionStrings(opts)).toEqual(['A|x', 'B']);
  });
});

describe('toLegacyHtml', () => {
  it('TEST-AI-R14 apostrophes and markup in options cannot break out of the handler', () => {
    const html = toLegacyHtml(parseOptions(`Kids' room, <img src=x onerror=alert(1)>|"><script>alert(1)</script>`));

    // no raw quote/markup from the option text survives outside of escaped attribute/text
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toMatch(/text: '[^']*Kids' room/);

    // browsers decode entities in attribute values before running the handler:
    const handler = /onclick="([^"]*)"/.exec(html)![1]
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    expect(handler).toBe(`window.postMessage({type: 'widget_quick_reply', text: "Kids' room", label: "Kids' room"}, '*')`);
    expect(html).toContain('>Kids&#39; room</button>');
    // the label is escaped the same way as the value
    const second = /onclick="([^"]*)"/g;
    second.exec(html);
    const h2 = second.exec(html)![1];
    expect(h2).not.toContain('<');
    expect(h2).not.toContain('"');
  });

  it('TEST-AI-R15 a button sends its value and also its label, so the visitor bubble shows the label', () => {
    // CS flow buttons are "Jakarta|City Directory: Jakarta": the intent name goes to the server, but the visitor
    // clicked "Jakarta" and must see "Jakarta" in their own bubble, not "City Directory: Jakarta".
    const html = toLegacyHtml(parseOptions('Jakarta|City Directory: Jakarta, Meeting Rooms & Events|FAQ: Meeting Rooms & Events'));
    const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const handlers: string[] = [];
    const re = /onclick="([^"]*)"/g;
    for (let m = re.exec(html); m; m = re.exec(html)) handlers.push(decode(m[1]));
    expect(handlers).toEqual([
      `window.postMessage({type: 'widget_quick_reply', text: "City Directory: Jakarta", label: "Jakarta"}, '*')`,
      `window.postMessage({type: 'widget_quick_reply', text: "FAQ: Meeting Rooms & Events", label: "Meeting Rooms & Events"}, '*')`,
    ]);
  });

  it('TEST-AI-R16 the widget shows the label in the visitor bubble for both kinds of buttons', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
    const win = read('src/modules/widget/ChatWindow.tsx');
    // reply buttons (postMessage) pass the label through to sendMessage, which shows it instead of the value
    expect(win).toMatch(/sendMessageRef\.current\(event\.data\.text,\s*typeof event\.data\.label === 'string' \? event\.data\.label : undefined\)/);
    expect(win).toMatch(/const sendMessage = async \(messageText: string, displayText\?: string\)/);
    expect(win).toMatch(/addMessage\(displayText\?\.trim\(\) \|\| messageText, 'user'\)/);
    // the request still carries the value (intent name)
    expect(win).toMatch(/message: messageText,/);
    // ...and the label, which the server stores so the agent inbox shows what the visitor clicked
    expect(win).toMatch(/displayText: displayText\?\.trim\(\) \|\| undefined,/);
    // welcome buttons rendered by ChatUI pass the label too
    const ui = read('src/components/chat/ChatUI.tsx');
    expect(ui).toContain('onClick={() => onSendMessage(value, label)}');
    expect(ui).toMatch(/onSendMessage: \(text: string, displayText\?: string\) => void;/);
  });

  it('returns empty string for no options', () => {
    expect(toLegacyHtml([])).toBe('');
  });
});

describe('readWelcomeConfig', () => {
  it('TEST-AI-F01b type=options returns structured + raw options', () => {
    const w = readWelcomeConfig({
      welcomeMessage: 'Hi',
      welcomeMessageType: 'options',
      welcomeMessageOptions: 'Pricing, Book a tour|book',
    });
    expect(w.type).toBe('options');
    expect(w.options).toEqual([
      { label: 'Pricing', value: 'Pricing' },
      { label: 'Book a tour', value: 'book' },
    ]);
    expect(w.rawOptions).toBe('Pricing, Book a tour|book');
  });

  it('TEST-AI-F01c type=text discards stale leftover options', () => {
    const w = readWelcomeConfig({ welcomeMessage: 'Hi', welcomeMessageType: 'text', welcomeMessageOptions: 'Old, Stale' });
    expect(w.type).toBe('text');
    expect(w.options).toEqual([]);
    expect(w.rawOptions).toBeNull();
  });

  it('type=form has no buttons', () => {
    const w = readWelcomeConfig({ welcomeMessageType: 'form', welcomeMessageOptions: 'A' });
    expect(w.type).toBe('form');
    expect(w.options).toEqual([]);
  });

  it('legacy config without a type but with options still gets buttons', () => {
    const w = readWelcomeConfig({ welcomeMessage: 'Hi', welcomeMessageOptions: 'A, B' });
    expect(w.type).toBe('options');
    expect(w.options).toHaveLength(2);
  });

  it('empty / whitespace options and missing config are text with no buttons', () => {
    expect(readWelcomeConfig({ welcomeMessageOptions: '   ' }).type).toBe('text');
    expect(readWelcomeConfig(null).message).toBeNull();
    expect(readWelcomeConfig(undefined).options).toEqual([]);
  });
});

describe('resolveEffectiveFlow', () => {
  it('TEST-AI-F02 activeFlow, then flows[0], then null', () => {
    expect(resolveEffectiveFlow({ activeFlow: { id: 'a' }, flows: [{ id: 'b' }] })).toEqual({ id: 'a' });
    expect(resolveEffectiveFlow({ activeFlow: null, flows: [{ id: 'b' }] })).toEqual({ id: 'b' });
    expect(resolveEffectiveFlow({ activeFlow: null, flows: [] })).toBeNull();
    expect(resolveEffectiveFlow({})).toBeNull();
  });
});
