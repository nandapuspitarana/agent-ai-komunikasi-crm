import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CEO SUITE Customer Service & Support Flow Integrity', () => {
  const filePath = path.join(process.cwd(), 'userjourney', 'UserJourney-CS-Support.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const flowData = JSON.parse(fileContent);
  const intents = flowData.data.intents;

  const intentMap = new Map<string, any>();
  intents.forEach((i: any) => {
    intentMap.set(i.name, i);
    intentMap.set(i.name.toLowerCase().trim(), i);
  });

  // Reusable exact matcher matching src/app/api/widget/message/route.ts logic
  function matchMessage(msg: string) {
    const userMsgLower = msg.toLowerCase().trim();
    // 1. Direct intent name match
    for (const intent of intents) {
      if ((intent.name || '').toLowerCase().trim() === userMsgLower) {
        return intent;
      }
    }
    // 2. Training phrases exact match
    for (const intent of intents) {
      if (!intent.trainingPhrases || !Array.isArray(intent.trainingPhrases)) continue;
      for (const phrase of intent.trainingPhrases) {
        if (phrase.toLowerCase().trim() === userMsgLower) {
          return intent;
        }
      }
    }
    return null;
  }

  it('TEST-CS-01 Flow metadata and intent counts are valid', () => {
    expect(flowData.type).toBe('agent_flow');
    expect(flowData.data.name).toBe('CEO SUITE Customer Service & Support Flow');
    expect(intents.length).toBe(230);

    // Verify all sales forms are removed
    const formIntents = intents.filter((i: any) => i.responseType === 'form');
    expect(formIntents.length).toBe(0);

    // Verify handoff intents have tag
    const handoffIntents = intents.filter((i: any) => i.name.includes('Human Agent') || i.name.includes('Complaint'));
    for (const hi of handoffIntents) {
      expect(hi.response).toContain('[HANDOFF_REQUESTED]');
    }
  });

  it('TEST-CS-02 All 797 option button transitions match valid intents by VALUE without getting stuck', () => {
    let checkedCount = 0;
    const failures: any[] = [];

    for (const intent of intents) {
      if (!intent.options || typeof intent.options !== 'string') continue;
      const rawOpts = intent.options.split(',');
      for (const raw of rawOpts) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const pipeIdx = trimmed.indexOf('|');
        const value = pipeIdx !== -1 ? trimmed.substring(pipeIdx + 1).trim() : trimmed;
        const label = pipeIdx !== -1 ? trimmed.substring(0, pipeIdx).trim() : trimmed;

        checkedCount++;
        const matched = matchMessage(value);
        if (!matched) {
          failures.push({ from: intent.name, label, value });
        }
      }
    }

    expect(checkedCount).toBeGreaterThan(700);
    expect(failures).toEqual([]);
  });

  it('TEST-CS-03 All option button labels match valid intents without getting stuck', () => {
    let checkedCount = 0;
    const failures: any[] = [];

    for (const intent of intents) {
      if (!intent.options || typeof intent.options !== 'string') continue;
      const rawOpts = intent.options.split(',');
      for (const raw of rawOpts) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const pipeIdx = trimmed.indexOf('|');
        const label = pipeIdx !== -1 ? trimmed.substring(0, pipeIdx).trim() : trimmed;

        checkedCount++;
        const matched = matchMessage(label);
        if (!matched) {
          failures.push({ from: intent.name, label });
        }
      }
    }

    expect(checkedCount).toBeGreaterThan(700);
    expect(failures).toEqual([]);
  });

  it('TEST-CS-04 User typing "our center" / variations matches Locations: Select City without getting stuck', () => {
    const variations = [
      'our center',
      'our centers',
      'our centre',
      'our centres',
      'select our center',
      'select our centre',
      'select center',
      'select centre',
      'our centres & locations',
      'our centers & locations',
      'our centres and locations',
      'our centers and locations',
      'centres & locations',
      'centers & locations',
      'other centres & locations',
      'other centers & locations',
      'locations',
      'cities',
      'centres',
      'centers',
      'centre',
      'center',
      'all locations',
      'all centres',
      'all centers',
      'daftar lokasi',
      'lokasi kantor',
      'dimana saja lokasi ceo suite',
      'find a centre',
      'find a center',
      'other cities'
    ];

    for (const query of variations) {
      const match = matchMessage(query);
      expect(match?.name, `Expected "${query}" to match Locations: Select City`).toBe('Locations: Select City');
      expect(match?.responseType).toBe('options');
      expect(match?.options).toContain('Jakarta');
      expect(match?.options).toContain('Kuala Lumpur');
    }
  });

  it('TEST-CS-05 All 12 cities in Locations: Select City can be selected and list centres', () => {
    const citySelector = matchMessage('Locations: Select City');
    expect(citySelector).toBeDefined();

    const expectedCities = [
      'Jakarta',
      'Kuala Lumpur',
      'Singapore',
      'Hong Kong',
      'Shanghai',
      'Beijing',
      'Hangzhou',
      'Seoul',
      'Bangkok',
      'Manila',
      'Hanoi',
      'Ho Chi Minh City'
    ];

    for (const city of expectedCities) {
      // 1. Match by button value (e.g. City Directory: Jakarta)
      const byVal = matchMessage(`City Directory: ${city}`);
      expect(byVal?.name).toBe(`City Directory: ${city}`);
      expect(byVal?.responseType).toBe('options');
      expect(byVal?.options.length).toBeGreaterThan(0);

      // 2. Match by button label (e.g. Jakarta)
      const byLabel = matchMessage(city);
      expect(byLabel?.name).toBe(`City Directory: ${city}`);
    }
  });

  it('TEST-CS-06 All 25 centre cards display address, contact and hours', () => {
    const expectedCentres = [
      'Axiata Tower',
      'Q Sentral',
      'Manara Maxis 36',
      'Manara Maxis 26',
      'Chinachem Tower',
      'K11 Atelier Victoria Dockside',
      'Nan Fung Tower',
      'Sunshine Financial Center',
      'The Exchange Twin Towers',
      'Lujiazui Finance Plaza',
      'Shanghai World Financial Center',
      'Hong Kong New World Tower (K11)',
      'Ping An Finance Center',
      'Lkg Tower',
      'Sahid Sudirman Center',
      'Axa Tower',
      'Indonesia Stock Exchange Tower 2',
      'One Pacific Place',
      'Centennial Tower',
      'Singapore Land Tower',
      'Kyobo Building',
      'Parnas Tower',
      'Athenee Tower',
      'Hanoi Lotte Center',
      'Vietcombank Tower'
    ];

    for (const centre of expectedCentres) {
      const centreIntent = matchMessage(`PO Centre: ${centre}`);
      expect(centreIntent, `Expected PO Centre: ${centre} to exist`).toBeDefined();
      expect(centreIntent.response).toContain("card");
      expect(centreIntent.response).toContain("Address:");
      expect(centreIntent.response).toContain("Phone:");
      expect(centreIntent.response).toContain("Email:");
      expect(centreIntent.response).toContain("Operating Hours:");
      expect(centreIntent.options).toContain('CS: Facilities & Amenities Menu');
      expect(centreIntent.options).toContain(`Front Desk: ${centre}`);
      expect(centreIntent.options).toContain('Facilities: Building Access & Access Cards');
      expect(centreIntent.options).toContain('Start / Main Menu');
    }
  });

  it('TEST-CS-07 Multi-turn journey from Main Menu -> Centres -> Jakarta -> Sahid Sudirman -> Facilities -> Start Menu', () => {
    // Turn 1: User says "start"
    const turn1 = matchMessage('start');
    expect(turn1?.name).toBe('Start / Main Menu');

    // Turn 2: User clicks "Our Centres & Locations"
    const turn2 = matchMessage('Locations: Select City');
    expect(turn2?.name).toBe('Locations: Select City');

    // Turn 3: User clicks "Jakarta"
    const turn3 = matchMessage('City Directory: Jakarta');
    expect(turn3?.name).toBe('City Directory: Jakarta');

    // Turn 4: User clicks "Sahid Sudirman Center"
    const turn4 = matchMessage('PO Centre: Sahid Sudirman Center');
    expect(turn4?.name).toBe('PO Centre: Sahid Sudirman Center');
    expect(turn4?.response).toContain("Sahid Sudirman Center (Jakarta)");
    expect(turn4?.response).toContain("56th Floor Jl. Jenderal Sudirman No. 86 Jakarta 10220 Indonesia");
    expect(turn4?.response).toContain("Close distance to MRT station");

    // Turn 5: User clicks "Centre Facilities & Amenities"
    const turn5 = matchMessage('CS: Facilities & Amenities Menu');
    expect(turn5?.name).toBe('CS: Facilities & Amenities Menu');

    // Turn 6: User clicks "Wi-Fi & Internet Support"
    const turn6 = matchMessage('Facilities: Wi-Fi & Internet Connectivity');
    expect(turn6?.name).toBe('Facilities: Wi-Fi & Internet Connectivity');

    // Turn 7: User clicks "Main Menu"
    const turn7 = matchMessage('Start / Main Menu');
    expect(turn7?.name).toBe('Start / Main Menu');
  });

  it('TEST-CS-08 Multi-turn journey to Human Agent Handoff', () => {
    // User clicks Speak to CS Agent
    const handoffTurn = matchMessage('CS: Speak to Human Agent / Live Support');
    expect(handoffTurn?.name).toBe('CS: Speak to Human Agent / Live Support');
    expect(handoffTurn?.response).toContain('[HANDOFF_REQUESTED]');
    expect(handoffTurn?.metadata?.handoff).toBe(true);
  });

  it('TEST-CS-09 Indonesia Stock Exchange Contact Front Desk flow is centre-specific, not All Locations', () => {
    // 1. User is on Indonesia Stock Exchange card
    const idxCard = matchMessage('PO Centre: Indonesia Stock Exchange Tower 2');
    expect(idxCard?.name).toBe('PO Centre: Indonesia Stock Exchange Tower 2');
    expect(idxCard?.options).toContain('Front Desk: Indonesia Stock Exchange Tower 2');
    expect(idxCard?.options).not.toContain('CS: Contact Directory All Locations');

    // 2. User clicks Contact Front Desk
    const idxFrontDesk = matchMessage('Front Desk: Indonesia Stock Exchange Tower 2');
    expect(idxFrontDesk?.name).toBe('Front Desk: Indonesia Stock Exchange Tower 2');
    expect(idxFrontDesk?.response).toContain('Indonesia Stock Exchange Tower 2 (Jakarta)');
    expect(idxFrontDesk?.response).toContain('+62 21 515 7777');
    expect(idxFrontDesk?.response).not.toContain('wa.me');
    expect(idxFrontDesk?.response).toContain('17th Floor Jl. Jend. Sudirman Kav. 52-53 Jakarta 12190 Indonesia');

    // 3. User clicks Speak to Front Desk Agent -> Triggers agent handoff
    const escalate = matchMessage('CS: Speak to Human Agent / Live Support');
    expect(escalate?.name).toBe('CS: Speak to Human Agent / Live Support');
    expect(escalate?.response).toContain('[HANDOFF_REQUESTED]');
  });

  it('TEST-CS-10 All 19 official website FAQ questions match their respective intents from ceosuite.com', () => {
    const websiteQuestions = [
      { q: 'What is a serviced office?', intent: 'FAQ: What is a Serviced Office' },
      { q: 'Why would I need a serviced office?', intent: 'FAQ: Why Would I Need a Serviced Office' },
      { q: 'Are serviced offices better value than traditional office space?', intent: 'FAQ: Why Serviced Office vs Traditional' },
      { q: 'Why choose CEO SUITE?', intent: 'FAQ: Why Choose CEO SUITE' },
      { q: 'What is a co-working space, or shared office?', intent: 'FAQ: What is a Coworking Space' },
      { q: 'Do I need a co-working space?', intent: 'FAQ: What is a Coworking Space' },
      { q: 'What are the differences between standard co-working space and a dedicated workstation?', intent: 'FAQ: Coworking vs Dedicated Desk' },
      { q: 'What is a virtual office?', intent: 'FAQ: What is a Virtual Office' },
      { q: 'Why would I need a virtual office?', intent: 'FAQ: Why Would I Need a Virtual Office' },
      { q: 'Can I upgrade my virtual office to a serviced office with CEO SUITE?', intent: 'FAQ: Upgrade or Downgrade Plan' },
      { q: 'How can I book a venue?', intent: 'FAQ: How to Book a Meeting Room' },
      { q: 'Can I get access to the venue early to set-up?', intent: 'FAQ: Early Setup & After-Hours Meeting' },
      { q: 'Can my event go beyond the business hours of your center?', intent: 'FAQ: Early Setup & After-Hours Meeting' },
      { q: 'Does CEO SUITE rent out presentation equipment?', intent: 'FAQ: Presentation Equipment & Technical Assistance' },
      { q: 'Do you provide technical assistance?', intent: 'FAQ: Presentation Equipment & Technical Assistance' },
      { q: 'Does CEO SUITE provide catering services?', intent: 'FAQ: Catering & Outside Food Policy' },
      { q: 'Can we bring in our own food and beverages?', intent: 'FAQ: Catering & Outside Food Policy' },
      { q: 'Are you able to provide staff for my event?', intent: 'FAQ: Event Staffing & Meeting Assistance' },
      { q: 'Is wired/wireless internet access available?', intent: 'Facilities: Wi-Fi & Internet Connectivity' }
    ];

    for (const item of websiteQuestions) {
      let matched = matchMessage(item.q);
      if (!matched) {
        matched = matchMessage(item.q.replace(/[?]/g, ''));
      }
      expect(matched).toBeDefined();
      expect(matched?.name).toBe(item.intent);
    }
  });

  describe('KB - List of Centres.json is the source of truth for centre details', () => {
    const kbPath = path.join(process.cwd(), 'userjourney', 'knowledge base', 'KB - List of Centres.json');
    const kb: any[] = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

    // KB brand code -> centre name used in "PO Centre: <name>" / "Front Desk: <name>"
    const brandToCentre: Record<string, string> = {
      QU7: 'Axiata Tower',
      QSE: 'Q Sentral',
      MMX: 'Manara Maxis 36',
      MKL: 'Manara Maxis 26',
      WCC: 'Chinachem Tower',
      KHK: 'K11 Atelier Victoria Dockside',
      WNF: 'Nan Fung Tower',
      SUN: 'Sunshine Financial Center',
      LGT: 'The Exchange Twin Towers',
      LJZ: 'Lujiazui Finance Plaza',
      SWF: 'Shanghai World Financial Center',
      HKN: 'Hong Kong New World Tower (K11)',
      PAN: 'Ping An Finance Center',
      LKG: 'Lkg Tower',
      SSC: 'Sahid Sudirman Center',
      AXA: 'Axa Tower',
      IDX: 'Indonesia Stock Exchange Tower 2',
      OPP: 'One Pacific Place',
      CTN: 'Centennial Tower',
      SLT: 'Singapore Land Tower',
      KYB: 'Kyobo Building',
      PNS: 'Parnas Tower',
      ATT: 'Athenee Tower',
      LCH: 'Hanoi Lotte Center',
      VCB: 'Vietcombank Tower'
    };

    // All KB centres are now fully offered in the flow
    const kbCentresNotInFlow: string[] = [];

    const to12h = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    };
    const digits = (s: string) => s.replace(/\D/g, '');
    const plain = (html: string) => html.replace(/<[^>]*>/g, ' ');

    it('TEST-CS-11 Every KB centre is either in the flow or explicitly listed as not yet supported', () => {
      const unaccounted = kb
        .map((c) => c.brand)
        .filter((b) => !brandToCentre[b] && !kbCentresNotInFlow.includes(b));
      expect(unaccounted).toEqual([]);
    });

    it('TEST-CS-12 Centre cards show the opening and closing hours from the KB', () => {
      const failures: string[] = [];
      for (const c of kb) {
        const centre = brandToCentre[c.brand];
        if (!centre) continue;
        const expected = `${to12h(c.operating_hours.opening_time)} – ${to12h(c.operating_hours.closing_time)}`;
        const card = matchMessage(`PO Centre: ${centre}`);
        if (!card?.response.includes(expected)) failures.push(`${centre} card: expected ${expected}`);
        const desk = matchMessage(`Front Desk: ${centre}`);
        if (!desk?.response.includes(expected)) failures.push(`${centre} front desk: expected ${expected}`);
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-13 Centre cards match the KB phone, address and website', () => {
      const failures: string[] = [];
      for (const c of kb) {
        const centre = brandToCentre[c.brand];
        if (!centre) continue;
        const info = c.contact_information;
        const card = matchMessage(`PO Centre: ${centre}`);
        const text = plain(card?.response ?? '');
        if (!digits(text).includes(digits(info.phone))) failures.push(`${centre}: phone ${info.phone}`);
        // Address numbers (floor, street number, postcode) must all appear, in order
        const kbAddress = info.address.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
        if (!digits(text).includes(digits(kbAddress))) failures.push(`${centre}: address ${kbAddress}`);
        if (!(card?.response ?? '').includes(info.website)) failures.push(`${centre}: website ${info.website}`);
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-15 Contact directory and handoff list the KB phone of every centre, not one number per country', () => {
      const failures: string[] = [];
      for (const name of ['CS: Contact Directory All Locations', 'CS: Speak to Human Agent / Live Support']) {
        const intent = matchMessage(name);
        const text = plain(intent?.response ?? '');
        for (const c of kb) {
          const centre = brandToCentre[c.brand];
          if (!centre) continue;
          const line = text.split(/\u000a|•/).find((l) => l.includes(centre) && digits(l).includes(digits(c.contact_information.phone)));
          if (!line) failures.push(`${name}: ${centre} -> ${c.contact_information.phone}`);
        }
      }
      expect(failures).toEqual([]);
    });

    // Same cleaning rules as the card builder: markdown links reduced to text, HTML-escaped
    const clean = (t: string) => t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const usable = (u: string) => /^https?:\/\//.test(u || '') && !/\.\.\.$/.test(u);
    const brandToCity: Record<string, string> = {
      QU7: 'Kuala Lumpur', QSE: 'Kuala Lumpur', MMX: 'Kuala Lumpur', MKL: 'Kuala Lumpur',
      WCC: 'Hong Kong', KHK: 'Hong Kong', WNF: 'Hong Kong', SUN: 'Beijing', LGT: 'Beijing',
      LJZ: 'Shanghai', SWF: 'Shanghai', HKN: 'Shanghai', PAN: 'Hangzhou', LKG: 'Manila',
      SSC: 'Jakarta', AXA: 'Jakarta', IDX: 'Jakarta', OPP: 'Jakarta', CTN: 'Singapore', SLT: 'Singapore',
      KYB: 'Seoul', PNS: 'Seoul', ATT: 'Bangkok', LCH: 'Hanoi', VCB: 'Ho Chi Minh City'
    };

    it('TEST-CS-16 Every KB field of every centre is in its card (address, map link, email, fax, convenience, amenities, description)', () => {
      const failures: string[] = [];
      for (const c of kb) {
        const centre = brandToCentre[c.brand];
        if (!centre) continue;
        const ci = c.contact_information;
        for (const prefix of ['PO Centre', 'MR Centre', 'VO Centre', 'DW Centre']) {
          const card = matchMessage(`${prefix}: ${centre}`);
          if (!card) continue;
          const html: string = card.response;
          const must: string[] = [
            esc(clean(ci.address)),
            esc(ci.phone),
            ci.website,
            ...(ci.email ? [esc(ci.email)] : []),
            ...(ci.fax ? [esc(ci.fax)] : []),
            ...(usable(ci.location_url) ? [ci.location_url] : []),
            ...(c.convenience || []).map(esc),
            ...(c.amenities || []).map(esc),
            ...(c.description ? c.description.split('\n').filter(Boolean).map(esc) : [])
          ];
          for (const m of must) if (!html.includes(m)) failures.push(`${prefix}: ${centre} missing "${m.slice(0, 60)}"`);
          // An empty or truncated KB link must not show up as a broken link
          if (!usable(ci.location_url) && html.includes('Location Map')) failures.push(`${prefix}: ${centre} shows a broken map link`);
        }
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-17 Free-text questions about one centre (address, map link, email, hours, ...) reach that centre card', () => {
      const templates = ['address {n}', 'alamat {n}', 'link lokasi {n}', 'location link {n}', 'google maps {n}',
        'email {n}', 'phone {n}', 'jam buka {n}', 'jam tutup {n}', 'opening hours {n}', 'convenience {n}',
        'amenities {n}', 'fasilitas {n}', '{n} address'];
      const failures: string[] = [];
      for (const c of kb) {
        const centre = brandToCentre[c.brand];
        if (!centre) continue;
        for (const n of [centre, c.brand]) {
          for (const t of templates) {
            const q = t.replace('{n}', n);
            const hit = matchMessage(q);
            if (hit?.name !== `PO Centre: ${centre}`) failures.push(`"${q}" -> ${hit?.name ?? 'no match'}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-18 City questions (centre jakarta, kantor di jakarta, ...) list the KB centres of that city with KB address and hours', () => {
      const cities = Array.from(new Set(Object.values(brandToCity)));
      const templates = ['centre {c}', 'center {c}', 'centre di {c}', 'kantor di {c}', 'office in {c}', 'lokasi {c}', 'alamat {c}', 'link lokasi {c}', 'email {c}'];
      const failures: string[] = [];
      for (const city of cities) {
        for (const t of templates) {
          const q = t.replace('{c}', city);
          const hit = matchMessage(q);
          if (hit?.name !== `City Directory: ${city}`) failures.push(`"${q}" -> ${hit?.name ?? 'no match'}`);
        }
        const dir = matchMessage(`City Directory: ${city}`);
        for (const c of kb.filter((k) => brandToCity[k.brand] === city)) {
          const centre = brandToCentre[c.brand];
          const hours = `${to12h(c.operating_hours.opening_time)} – ${to12h(c.operating_hours.closing_time)}`;
          if (!dir?.response.includes(esc(clean(c.contact_information.address)))) failures.push(`${city}: address of ${centre}`);
          if (!dir?.response.includes(hours)) failures.push(`${city}: hours of ${centre}`);
          if (!dir?.options.includes(`PO Centre: ${centre}`)) failures.push(`${city}: option for ${centre}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-19 Questions without a centre (link lokasi, email, jam buka) are answered, not dropped', () => {
      const failures: string[] = [];
      for (const q of ['link lokasi', 'location link', 'google maps', 'email', 'alamat', 'address', 'nomor telepon']) {
        const hit = matchMessage(q);
        if (hit?.name !== 'Locations: Select City') failures.push(`"${q}" -> ${hit?.name ?? 'no match'}`);
      }
      for (const q of ['jam buka', 'jam tutup', 'opening hours', 'jam operasional']) {
        const hit = matchMessage(q);
        if (hit?.name !== 'Facilities: Building Access & Access Cards') failures.push(`"${q}" -> ${hit?.name ?? 'no match'}`);
      }
      expect(failures).toEqual([]);
    });

    it('TEST-CS-20 No WhatsApp numbers are shown for centres', () => {
      for (const i of intents) {
        expect(i.response ?? '', `${i.name} should not contain wa.me`).not.toContain('wa.me');
        expect(i.response ?? '', `${i.name} should not contain a WA number`).not.toMatch(/WA: \+/);
      }
    });

    it('TEST-CS-14 Generic access/mail answers do not claim a single hours range for all centres', () => {
      const distinct = Array.from(
        new Set(kb.map((c) => `${to12h(c.operating_hours.opening_time)} – ${to12h(c.operating_hours.closing_time)}`))
      );
      expect(distinct.length).toBeGreaterThan(1);
      for (const name of ['Facilities: Building Access & Access Cards', 'Facilities: Mail & Courier Handling']) {
        const intent = matchMessage(name);
        for (const range of distinct) {
          expect(intent?.response, `${name} should list ${range}`).toContain(range);
        }
        expect(intent?.response).not.toContain('8:30 AM – 6:00 PM');
      }
    });
  });
});

