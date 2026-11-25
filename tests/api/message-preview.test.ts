import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { messagePreview } from '@/lib/message-preview';

// Bot replies are stored as HTML (quick-reply buttons, answer cards). The dashboard's
// "Live Monitoring" panel and the inbox list show a one-line preview, which must be text.
describe('messagePreview', () => {
  it('TEST-DASH-P01 a menu reply previews its text, without the button HTML or labels', () => {
    const html =
      'We have 4 centres in Jakarta. Choose a centre to see its address, map, contact details and opening hours.' +
      '<div class="flex flex-wrap gap-2 mt-3"><button class="px-3 py-1.5 text-xs" data-value="Centre: Axa Tower">Axa Tower</button>' +
      '<button class="px-3 py-1.5 text-xs">One Pacific Place</button></div>';
    expect(messagePreview(html, 200)).toBe(
      'We have 4 centres in Jakarta. Choose a centre to see its address, map, contact details and opening hours.',
    );
  });

  it('TEST-DASH-P02 an answer card previews its title', () => {
    const card =
      "<div class='card'><div class='card-banner'>Featured Information</div><div class='card-title'>Axa Tower (Jakarta)</div>" +
      "<div class='small'><b>Address:</b> 45th Floor Jl.Prof.Dr.Satrio Kav 18 &amp; more</div></div>";
    expect(messagePreview(card)).toBe('Axa Tower (Jakarta)');
  });

  it('TEST-DASH-P03 other HTML becomes plain text with entities decoded and spaces collapsed', () => {
    expect(messagePreview('<p>Room <b>A&amp;B</b><br/>is   free &quot;today&quot;</p>')).toBe('Room A&B is free "today"');
  });

  it('TEST-DASH-P04 plain text stays as is (a "<3" is not a tag) and long text is cut to max', () => {
    expect(messagePreview('I <3 this office')).toBe('I <3 this office');
    expect(messagePreview('x'.repeat(120), 100)).toBe(`${'x'.repeat(100)}...`);
    expect(messagePreview('')).toBe('');
  });
});

describe('dashboard and inbox show message previews, not raw HTML', () => {
  const src = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

  it('TEST-DASH-P05 Live Monitoring (dashboard stats) previews the AI replies', () => {
    const route = src('src/app/api/dashboard/stats/route.ts');
    expect(route).toMatch(/message:\s*messagePreview\(m\.content\)/);
    expect(route).not.toMatch(/m\.content\.substring\(/);
  });

  it('TEST-DASH-P06 the inbox list previews the last message, on load and on realtime updates', () => {
    expect(src('src/app/api/chat/sessions/route.ts')).toMatch(/preview:\s*lastMessage\s*\?\s*messagePreview\(lastMessage\.content\)/);
    expect(src('src/app/[lang]/(dashboard)/inbox/page.tsx')).toMatch(/preview:\s*messagePreview\(data\.content\)/);
  });
});
