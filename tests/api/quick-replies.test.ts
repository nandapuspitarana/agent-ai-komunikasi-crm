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
    expect(handler).toBe(`window.postMessage({type: 'widget_quick_reply', text: "Kids' room"}, '*')`);
    expect(html).toContain('>Kids&#39; room</button>');
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
