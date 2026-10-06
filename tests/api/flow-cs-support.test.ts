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
    expect(intents.length).toBe(220);

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

  it('TEST-CS-06 All 23 centre cards display verified contact, transport, and facility details', () => {
    const expectedCentres = [
      'Axiata Tower',
      'Q Sentral',
      'Manara Maxis 36',
      'Manara Maxis 26',
      'Chinachem Tower',
      'K11 Atelier Victoria Dockside',
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
      expect(centreIntent.response).toContain("Facilities:");
      expect(centreIntent.response).toContain("Transport:");
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
    expect(turn4?.response).toContain("Bendungan Hilir / Setiabudi Astra MRT");

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
    expect(idxFrontDesk?.response).toContain('+62 (21) 515 7777');
    expect(idxFrontDesk?.response).toContain('wa.me/62811150857');
    expect(idxFrontDesk?.response).toContain('SCBD, Jakarta 12190');

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
});

