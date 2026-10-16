/**
 * centres-directory.ts
 *
 * Central verified directory of CEO SUITE centres across 12 Asian cities.
 * Provides lookup, detection, and dynamic personal handoff resolution
 * for user profiles and live sessions.
 */

export interface CentreInfo {
  name: string;
  brand: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  hours: string;
  address: string;
  url: string;
  mapUrl?: string;
  aliases: string[];
}

export const CENTRES_DIRECTORY: CentreInfo[] = [
  // --- KUALA LUMPUR ---
  {
    name: 'Axiata Tower',
    brand: 'QU7',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    phone: '+60 3 2776 6888',
    email: 'sales@my.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '27th Floor 9 Jalan Stesen Sentral 5, KL Sentral Kuala Lumpur 50470 Malaysia',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-axiata-tower/',
    mapUrl: 'https://www.google.com/maps?cid=0x31cc49c05464fa55:0x30c8b9154443671',
    aliases: ['axiata tower', 'axiata', 'qu7', 'kl sentral axiata'],
  },
  {
    name: 'Q Sentral',
    brand: 'QSE',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    phone: '+60 3 2731 9388',
    email: 'sales@my.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: 'Level 35-02 (East Wing) 2A, Jalan Stesen Sentral 2, KL Sentral Kuala Lumpur 50470 Malaysia',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-q-sentral/',
    mapUrl: 'https://www.google.com/maps?cid=0x31cc49c0de13995f:0xb49b4c3f4c5bb8d1',
    aliases: ['q sentral', 'qsentral', 'qse'],
  },
  {
    name: 'Manara Maxis 36',
    brand: 'MMX',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    phone: '+60 3 2615 0000',
    email: 'sales@my.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: 'Level 36 Kuala Lumpur City Centre Kuala Lumpur 50088 Malaysia',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-maxis-36th/',
    mapUrl: 'https://www.google.com/maps?cid=0x31cc37d12e3090ab:0x5e22d46c91163024',
    aliases: ['manara maxis 36', 'menara maxis 36', 'maxis 36', 'mmx', 'menara maxis level 36'],
  },
  {
    name: 'Manara Maxis 26',
    brand: 'MKL',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    phone: '+60 3 2615 2688',
    email: 'sales@my.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: 'Level 26 Kuala Lumpur City Centre Kuala Lumpur 50088 Malaysia',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-maxis-26th/',
    mapUrl: 'https://www.google.com/maps?cid=0x31cc37d12e3090ab:0x5e22d46c91163024',
    aliases: ['manara maxis 26', 'menara maxis 26', 'maxis 26', 'mkl', 'menara maxis level 26'],
  },

  // --- HONG KONG ---
  {
    name: 'Chinachem Tower',
    brand: 'WCC',
    city: 'Hong Kong',
    country: 'China',
    phone: '+852 3166 6160',
    email: 'sales@hk.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: 'Level 5 to Level 7 No 34-37 Connaught Rd Central, Central Hong Kong Hong Kong',
    url: 'https://www.ceosuite.com/locations/chinachem-tower/',
    mapUrl: 'https://www.google.com/maps?cid=0x3404010eefb45cbb:0xd3a035046e271427',
    aliases: ['chinachem tower', 'chinachem', 'wcc'],
  },
  {
    name: 'K11 Atelier Victoria Dockside',
    brand: 'KHK',
    city: 'Hong Kong',
    country: 'China',
    phone: '+852 3166 6166',
    email: 'sales@hk.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: 'Level 7 18 Salisbury Road, Tsim Sha Tsui Hong Kong Hong Kong',
    url: 'https://www.ceosuite.com/locations/hongkong-k11-atelier/',
    mapUrl: 'https://www.google.com/maps?cid=0x340401593248fd69:0xa83e7cb54de9b66',
    aliases: ['k11 atelier victoria dockside', 'k11 atelier', 'victoria dockside', 'khk', 'k11'],
  },
  {
    name: 'Nan Fung Tower',
    brand: 'WNF',
    city: 'Hong Kong',
    country: 'China',
    phone: '+852 3166 6166',
    email: 'sales@hk.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: 'Level 21 & 23, 88 Connaught Road Central, Sheung Wan Hong Kong Hong Kong',
    url: 'https://www.ceosuite.com/locations/nanfung-tower/',
    mapUrl: 'https://maps.app.goo.gl/fPlNbVSxtqaA58y2d9',
    aliases: ['nan fung tower', 'nan fung', 'wnf'],
  },

  // --- BEIJING ---
  {
    name: 'Sunshine Financial Center',
    brand: 'SUN',
    city: 'Beijing',
    country: 'China',
    phone: '+86 10 8660 8888',
    email: 'salesbj@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '31st Floor, No. 33 Jinghui Avenue, Chaoyang Beijing 100020 China',
    url: 'https://www.ceosuite.com/locations/sunshine-financial-center/',
    aliases: ['sunshine financial center', 'sunshine financial centre', 'sunshine', 'sun'],
  },
  {
    name: 'The Exchange Twin Towers',
    brand: 'LGT',
    city: 'Beijing',
    country: 'China',
    phone: '+86 10 5909 2988',
    email: 'salesbj@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '10th Floor B 12 Jianguomenwai Avenue Beijing 100022 China',
    url: 'https://www.ceosuite.com/locations/beijing-lg-twin-tower/',
    mapUrl: 'https://j.map.baidu.com/a6/aIq',
    aliases: ['the exchange twin towers', 'twin towers', 'exchange twin towers', 'lgt', 'lg twin tower'],
  },

  // --- SHANGHAI ---
  {
    name: 'Lujiazui Finance Plaza',
    brand: 'LJZ',
    city: 'Shanghai',
    country: 'China',
    phone: '+86 21 5116 5116',
    email: 'sales@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '18th Floor 826 Century Avenue, Pudong Shanghai 200120 China',
    url: 'https://www.ceosuite.com/locations/shanghai-lujiazui-financial-plaza/',
    mapUrl: 'https://j.map.baidu.com/c2/iR1',
    aliases: ['lujiazui finance plaza', 'lujiazui', 'ljz'],
  },
  {
    name: 'Shanghai World Financial Center',
    brand: 'SWF',
    city: 'Shanghai',
    country: 'China',
    phone: '+86 21 2052 0666',
    email: 'sales@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '28th Floor 100 Century Avenue, Pudong New Area Shanghai 200120 China',
    url: 'https://www.ceosuite.com/locations/shanghai-world-financial-centre/',
    mapUrl: 'https://j.map.baidu.com/e8/ILJJ',
    aliases: ['shanghai world financial center', 'shanghai world financial centre', 'swfc', 'swf'],
  },
  {
    name: 'Hong Kong New World Tower (K11)',
    brand: 'HKN',
    city: 'Shanghai',
    country: 'China',
    phone: '+86 21 5116 2888',
    email: 'sales@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '47th floor 300 Huaihai Zhong Road, Puxi Shanghai 200021 China',
    url: 'https://www.ceosuite.com/locations/shanghai-puxi-hong-kong-new-world-tower/',
    mapUrl: 'https://j.map.baidu.com/00/aRR',
    aliases: ['hong kong new world tower (k11)', 'hong kong new world tower', 'new world tower', 'hkn', 'k11 shanghai'],
  },

  // --- HANGZHOU ---
  {
    name: 'Ping An Finance Center',
    brand: 'PAN',
    city: 'Hangzhou',
    country: 'China',
    phone: '+86 (571) 5812 5868',
    email: 'saleshz@cn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '7th - 9th Floor Tower B, 159, Jiangjin Road, Shangcheng District Hangzhou 310020 China',
    url: 'https://www.ceosuite.com/locations/ping-an-finance-center/',
    aliases: ['ping an finance center', 'ping an finance centre', 'ping an', 'pan'],
  },

  // --- MANILA ---
  {
    name: 'Lkg Tower',
    brand: 'LKG',
    city: 'Manila',
    country: 'Philippines',
    phone: '+63 2 8859 2888',
    email: 'sales@ph.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '37th Floor 6801 Ayala Avenue, Makati City Manila 1226 Philippines',
    url: 'https://www.ceosuite.com/locations/office-space-for-rent-manila/',
    mapUrl: 'https://www.google.com/maps?cid=0x3397c90948a0cb81:0x3b8c85c66173544c',
    aliases: ['lkg tower', 'lkg', 'ayala lkg'],
  },

  // --- JAKARTA ---
  {
    name: 'Sahid Sudirman Center',
    brand: 'SSC',
    city: 'Jakarta',
    country: 'Indonesia',
    phone: '+62 21 8063 1888',
    email: 'sales@ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '56th Floor Jl. Jenderal Sudirman No. 86 Jakarta 10220 Indonesia',
    url: 'https://www.ceosuite.com/locations/jakarta-sahid-sudirman-centre/',
    mapUrl: 'https://www.google.com/maps?cid=10002666713572393788',
    aliases: ['sahid sudirman center', 'sahid sudirman centre', 'sahid sudirman', 'sahid', 'ssc'],
  },
  {
    name: 'Axa Tower',
    brand: 'AXA',
    city: 'Jakarta',
    country: 'Indonesia',
    phone: '+62 21 3005 3500',
    email: 'sales@ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '45th Floor Jl.Prof.Dr.Satrio Kav 18, Kuningan Setiabudi Jakarta 12940 Indonesia',
    url: 'https://www.ceosuite.com/locations/jakarta-axa/',
    mapUrl: 'https://www.google.com/maps?cid=606997664944143283',
    aliases: ['axa tower', 'axa', 'kuningan axa'],
  },
  {
    name: 'Indonesia Stock Exchange Tower 2',
    brand: 'IDX',
    city: 'Jakarta',
    country: 'Indonesia',
    phone: '+62 21 515 7777',
    email: 'sales@ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '17th Floor Jl. Jend. Sudirman Kav. 52-53 Jakarta 12190 Indonesia',
    url: 'https://www.ceosuite.com/locations/jakarta-stock-exchange/',
    mapUrl: 'https://www.google.com/maps?cid=8800365899341255005',
    aliases: ['indonesia stock exchange tower 2', 'indonesia stock exchange', 'idx', 'bursa efek indonesia', 'bei', 'stock exchange tower 2'],
  },
  {
    name: 'One Pacific Place',
    brand: 'OPP',
    city: 'Jakarta',
    country: 'Indonesia',
    phone: '+62 21 2550 2550',
    email: 'sales@ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '15th Floor Jl. Jend. Sudirman Kav. 52-53 Jakarta 12190 Indonesia',
    url: 'https://www.ceosuite.com/locations/jakarta-one-pacific-place/',
    mapUrl: 'https://www.google.com/maps?cid=808921101083265832',
    aliases: ['one pacific place', 'pacific place', 'opp'],
  },

  // --- SINGAPORE ---
  {
    name: 'Centennial Tower',
    brand: 'CTN',
    city: 'Singapore',
    country: 'Singapore',
    phone: '+65 6829 7000',
    email: 'sales@sg.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: '21st Floor 3 Temasek Avenue Singapore 039190 Singapore',
    url: 'https://www.ceosuite.com/locations/centennial-tower/',
    mapUrl: 'https://www.google.com/maps?cid=0x31da19153079d8ab:0xda2b79c97e717912',
    aliases: ['centennial tower', 'centennial', 'ctn'],
  },
  {
    name: 'Singapore Land Tower',
    brand: 'SLT',
    city: 'Singapore',
    country: 'Singapore',
    phone: '+65 6829 7000',
    email: 'sales@sg.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: '37th Floor 50 Raffles Place Singapore 048623 Singapore',
    url: 'https://www.ceosuite.com/locations/singapore-land-tower/',
    mapUrl: 'https://goo.gl/maps/UFRLLBnA5vpRN6858',
    aliases: ['singapore land tower', 'land tower', 'slt', 'raffles place'],
  },

  // --- SEOUL ---
  {
    name: 'Kyobo Building',
    brand: 'KYB',
    city: 'Seoul',
    country: 'South Korea',
    phone: '+82 2 2010 8888',
    email: 'sales@kr.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: '15th Floor, 1 Jongno, Jongno-gu Seoul 03154 South Korea',
    url: 'https://www.ceosuite.com/locations/seoul-kyobo-building/',
    mapUrl: 'https://www.google.com/maps?cid=0x357ca2ec8f950e43:0x65a0419e54ab8a4f',
    aliases: ['kyobo building', 'kyobo', 'kyb'],
  },
  {
    name: 'Parnas Tower',
    brand: 'PNS',
    city: 'Seoul',
    country: 'South Korea',
    phone: '+82 2 2097 8288',
    email: 'sales@kr.ceosuite.com',
    hours: '9:00 AM – 6:00 PM',
    address: '29th Floor, 521 Teheran-ro, Gangnam-gu Seoul 06164 South Korea',
    url: 'https://www.ceosuite.com/location/south-korea-seoul/',
    mapUrl: 'https://www.google.com/maps?cid=0x357ca44017962321:0xabecd6f821919a2b',
    aliases: ['parnas tower', 'parnas', 'pns', 'gangnam'],
  },

  // --- BANGKOK ---
  {
    name: 'Athenee Tower',
    brand: 'ATT',
    city: 'Bangkok',
    country: 'Thailand',
    phone: '+66 2 126 8000',
    email: 'sales@th.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '23rd Floor 63 Wireless Road, Lumpini, Pathumwan Bangkok 10330 Thailand',
    url: 'https://www.ceosuite.com/locations/bangkok-athenee-tower/',
    mapUrl: 'https://www.google.com/maps?cid=0x30e29ed700000001:0x64a02ad7aab52a16',
    aliases: ['athenee tower', 'athenee', 'att', 'wireless road'],
  },

  // --- HANOI ---
  {
    name: 'Hanoi Lotte Center',
    brand: 'LCH',
    city: 'Hanoi',
    country: 'Vietnam',
    phone: '+84 24 3267 3999',
    email: 'sales@vn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: '29th Floor East Tower 54 Lieu Giai street, Giang Vo ward Hanoi 100000 Vietnam',
    url: 'https://www.ceosuite.com/locations/hanoi-lotte-center/',
    mapUrl: 'https://www.google.com/maps?cid=0x3135abdee2edbf05:0xf79994ae815ad25a',
    aliases: ['hanoi lotte center', 'lotte center', 'hanoi lotte centre', 'lch'],
  },

  // --- HO CHI MINH CITY ---
  {
    name: 'Vietcombank Tower',
    brand: 'VCB',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    phone: '+84 28 3827 1988',
    email: 'sales@vn.ceosuite.com',
    hours: '8:30 AM – 5:30 PM',
    address: 'Level 21 No. 5 Mê Linh Square, Sai Gon ward Ho Chi Minh City 70000 Vietnam',
    url: 'https://www.ceosuite.com/locations/ho-chi-minh-vietcombank-tower/',
    aliases: ['vietcombank tower', 'vietcombank', 'vcb', 'saigon'],
  },
];

/**
 * Normalizes text for robust matching.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds a centre by exact name, brand code, or alias.
 */
export function findCentre(query?: string | null): CentreInfo | undefined {
  if (!query || typeof query !== 'string') return undefined;
  const q = normalize(query);
  if (!q) return undefined;

  // 1. Direct name match
  const exact = CENTRES_DIRECTORY.find((c) => normalize(c.name) === q);
  if (exact) return exact;

  // 2. Brand code match
  const brand = CENTRES_DIRECTORY.find((c) => c.brand.toLowerCase() === q);
  if (brand) return brand;

  // 3. Alias match
  const aliasMatch = CENTRES_DIRECTORY.find((c) =>
    c.aliases.some((a) => normalize(a) === q)
  );
  if (aliasMatch) return aliasMatch;

  // 4. Substring / contains match
  const partial = CENTRES_DIRECTORY.find(
    (c) => q.includes(normalize(c.name)) || normalize(c.name).includes(q)
  );
  if (partial) return partial;

  const partialAlias = CENTRES_DIRECTORY.find((c) =>
    c.aliases.some((a) => q.includes(normalize(a)) || normalize(a).includes(q))
  );
  if (partialAlias) return partialAlias;

  return undefined;
}

/**
 * Finds centres by city name.
 */
export function findCentresByCity(city?: string | null): CentreInfo[] {
  if (!city || typeof city !== 'string') return [];
  const c = normalize(city);
  if (!c) return [];
  return CENTRES_DIRECTORY.filter((item) => normalize(item.city) === c || c.includes(normalize(item.city)));
}

/**
 * Finds centres associated with an official email.
 */
export function findCentresByEmail(email?: string | null): CentreInfo[] {
  if (!email || typeof email !== 'string') return [];
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return [];

  // Match exact centre email
  const directMatches = CENTRES_DIRECTORY.filter((c) => c.email.toLowerCase() === cleanEmail);
  if (directMatches.length > 0) return directMatches;

  // Domain / prefix heuristic (e.g. sales@sg.ceosuite.com -> Singapore)
  if (cleanEmail.includes('@sg.') || cleanEmail.includes('.sg')) {
    return findCentresByCity('Singapore');
  }
  if (cleanEmail.includes('@hk.') || cleanEmail.includes('.hk')) {
    return findCentresByCity('Hong Kong');
  }
  if (cleanEmail.includes('salesbj@') || cleanEmail.includes('bj.ceosuite')) {
    return findCentresByCity('Beijing');
  }
  if (cleanEmail.includes('saleshz@') || cleanEmail.includes('hz.ceosuite')) {
    return findCentresByCity('Hangzhou');
  }
  if (cleanEmail.includes('@my.') || cleanEmail.includes('.my')) {
    return findCentresByCity('Kuala Lumpur');
  }
  if (cleanEmail.includes('@ph.') || cleanEmail.includes('.ph')) {
    return findCentresByCity('Manila');
  }
  if (cleanEmail.includes('@kr.') || cleanEmail.includes('.kr')) {
    return findCentresByCity('Seoul');
  }
  if (cleanEmail.includes('@th.') || cleanEmail.includes('.th')) {
    return findCentresByCity('Bangkok');
  }
  if (cleanEmail.includes('@vn.') || cleanEmail.includes('.vn')) {
    return CENTRES_DIRECTORY.filter((c) => c.country.toLowerCase() === 'vietnam');
  }
  if (cleanEmail === 'sales@ceosuite.com') {
    return findCentresByCity('Jakarta');
  }

  return [];
}

/**
 * Detects if a message text mentions any centre name, brand, or alias.
 */
export function detectCentreInText(text?: string | null): CentreInfo | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const lower = text.toLowerCase();

  // Sort centres by name length descending so longer specific names match first
  const sorted = [...CENTRES_DIRECTORY].sort((a, b) => b.name.length - a.name.length);

  for (const centre of sorted) {
    if (lower.includes(centre.name.toLowerCase())) {
      return centre;
    }
    for (const alias of centre.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return centre;
      }
    }
  }

  return undefined;
}

/**
 * Detects if a message text mentions any known city.
 */
export function detectCityInText(text?: string | null): string | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const lower = text.toLowerCase();

  const cities = Array.from(new Set(CENTRES_DIRECTORY.map((c) => c.city)));
  for (const city of cities) {
    if (lower.includes(city.toLowerCase())) {
      return city;
    }
  }

  // Indonesian / common city translations
  if (lower.includes('kl') || lower.includes('klcc') || lower.includes('kl sentral')) return 'Kuala Lumpur';
  if (lower.includes('hcmc') || lower.includes('saigon')) return 'Ho Chi Minh City';
  if (lower.includes('korea')) return 'Seoul';
  if (lower.includes('thailand')) return 'Bangkok';
  if (lower.includes('vietnam')) return 'Hanoi';

  return undefined;
}

/**
 * Formats front desk hotline and contact details specifically for a single centre.
 * If customIntro is provided (e.g. from conversational AI proxy), it preserves the AI's natural explanation.
 */
export function formatSingleCentreHandoff(
  centre: CentreInfo,
  isEn: boolean = true,
  customIntro?: string
): { message: string; options: string } {
  const hotlineBlock = isEn
    ? `For urgent support, you may also call the front desk of your centre directly:\n• <b>${centre.name} (${centre.city})</b>: ${centre.phone}\nReception Hours: Monday - Friday, ${centre.hours}\nEmail: ${centre.email}\nAddress: ${centre.address}`
    : `Untuk bantuan mendesak, Anda dapat langsung menghubungi front desk centre Anda:\n• <b>${centre.name} (${centre.city})</b>: ${centre.phone}\nJam Operasional: Senin - Jumat, ${centre.hours}\nEmail: ${centre.email}\nAlamat: ${centre.address}`;

  const cleanedIntro = (customIntro || '')
    .replace(/\[HANDOFF_REQUESTED\]/g, '')
    .replace(/For urgent support, you may also call the front desk[\s\S]*$/i, '')
    .replace(/Untuk bantuan mendesak, Anda dapat langsung menghubungi front desk[\s\S]*$/i, '')
    .replace(/Our Customer Service team has been notified[\s\S]*?join this chat shortly\./i, '')
    .replace(/Tim Layanan Pelanggan kami telah diberi tahu[\s\S]*?ruang obrolan ini\./i, '')
    .trim();

  let intro: string;
  if (cleanedIntro.length > 0) {
    intro = `[HANDOFF_REQUESTED]\n\n${cleanedIntro}\n\n${hotlineBlock}`;
  } else {
    intro = isEn
      ? `[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified and is stepping in to assist you directly. A team member will join this chat shortly.\n\n${hotlineBlock}`
      : `[HANDOFF_REQUESTED]\n\nTim Layanan Pelanggan kami telah diberi tahu dan sedang bersiap untuk membantu Anda secara langsung. Tim kami akan segera bergabung ke ruang obrolan ini.\n\n${hotlineBlock}`;
  }

  const options = `Contact Front Desk|Front Desk: ${centre.name}, Facilities & Amenities|CS: Facilities & Amenities Menu, Other Centres in ${centre.city}|City Directory: ${centre.city}, Main Menu|Start / Main Menu`;

  return { message: intro, options };
}

/**
 * Formats front desk hotlines for centres located in a specific city.
 * If customIntro is provided (e.g. from conversational AI proxy), it preserves the AI's natural explanation.
 */
export function formatCityCentresHandoff(
  city: string,
  centres: CentreInfo[],
  isEn: boolean = true,
  customIntro?: string
): { message: string; options: string } {
  const hotlines = centres.map((c) => `• ${c.name}: ${c.phone}`).join('\n');
  const primaryHours = centres[0]?.hours || '8:30 AM – 5:30 PM';

  const hotlineBlock = isEn
    ? `For urgent support, you may call the front desk of our ${city} centres directly:\n${hotlines}\n\nReception Hours: Monday - Friday, ${primaryHours}`
    : `Untuk bantuan mendesak, Anda dapat langsung menghubungi front desk centre kami di ${city}:\n${hotlines}\n\nJam Operasional: Senin - Jumat, ${primaryHours}`;

  const cleanedIntro = (customIntro || '')
    .replace(/\[HANDOFF_REQUESTED\]/g, '')
    .replace(/For urgent support, you may call the front desk[\s\S]*$/i, '')
    .replace(/Untuk bantuan mendesak, Anda dapat langsung menghubungi front desk[\s\S]*$/i, '')
    .replace(/Our Customer Service team has been notified[\s\S]*?join this chat shortly\./i, '')
    .replace(/Tim Layanan Pelanggan kami telah diberi tahu[\s\S]*?ruang obrolan ini\./i, '')
    .trim();

  let intro: string;
  if (cleanedIntro.length > 0) {
    intro = `[HANDOFF_REQUESTED]\n\n${cleanedIntro}\n\n${hotlineBlock}`;
  } else {
    intro = isEn
      ? `[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified and is stepping in to assist you directly. A team member will join this chat shortly.\n\n${hotlineBlock}`
      : `[HANDOFF_REQUESTED]\n\nTim Layanan Pelanggan kami telah diberi tahu dan sedang bersiap untuk membantu Anda secara langsung. Tim kami akan segera bergabung ke ruang obrolan ini.\n\n${hotlineBlock}`;
  }

  const centreOptions = centres.map((c) => `${c.name}|Front Desk: ${c.name}`).join(', ');
  const options = `${centreOptions}, Other Cities|Locations: Select City, Main Menu|Start / Main Menu`;

  return { message: intro, options };
}

/**
 * Formats a clean default handoff with quick navigation options when no centre is known.
 */
export function formatDefaultHandoff(isEn: boolean = true): { message: string; options: string } {
  const intro = isEn
    ? `[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified and is stepping in to assist you directly. A team member will join this chat shortly.\n\nFor urgent support, please select your city or centre below to connect with your local front desk directly:`
    : `[HANDOFF_REQUESTED]\n\nTim Layanan Pelanggan kami telah diberi tahu dan sedang bersiap untuk membantu Anda secara langsung. Tim kami akan segera bergabung ke ruang obrolan ini.\n\nUntuk bantuan mendesak, silakan pilih kota atau centre Anda di bawah ini untuk menghubungi front desk setempat:`;

  const options = `Jakarta|City Directory: Jakarta, Kuala Lumpur|City Directory: Kuala Lumpur, Singapore|City Directory: Singapore, Hong Kong|City Directory: Hong Kong, Shanghai|City Directory: Shanghai, Beijing|City Directory: Beijing, All Centres Directory|CS: Contact Directory All Locations, Main Menu|Start / Main Menu`;

  return { message: intro, options };
}

export interface ResolveHandoffParams {
  baseResponse: string;
  centre?: string | null;
  city?: string | null;
  emailCenter?: string | null;
  isEn?: boolean;
  baseOptions?: string;
}

export interface ResolvedHandoffResult {
  reply: string;
  options: string;
  dynamicallyResolved: boolean;
  matchedCentre?: CentreInfo;
  matchedCity?: string;
}

/**
 * Resolves a dynamic, personalized handoff response based on the user's profile and session context.
 * Replaces the static 24-centre text with targeted, relevant front desk hotlines, while preserving
 * any conversational AI reasoning.
 */
export function resolveDynamicHandoff(params: ResolveHandoffParams): ResolvedHandoffResult {
  const { baseResponse, centre, city, emailCenter, isEn = true, baseOptions = '' } = params;

  // Check if baseResponse contains a custom conversational response (e.g. from AI proxy)
  // vs the generic legacy 24-centre list or default canned template
  const isLegacyFullList =
    baseResponse.includes('For urgent support, you may also call the front desk of your centre directly:') &&
    (baseResponse.includes('Axiata Tower') || baseResponse.includes('Chinachem Tower'));
  const isDefaultCannedTemplate =
    baseResponse.includes('Our Customer Service team has been notified and is stepping in to assist you directly.') ||
    baseResponse.includes('Tim Layanan Pelanggan kami telah diberi tahu dan sedang bersiap untuk membantu Anda secara langsung.');

  const customIntro = !isLegacyFullList && !isDefaultCannedTemplate && baseResponse.trim().length > 0
    ? baseResponse
    : undefined;

  // 1. Priority 1: Direct specific centre match (from user profile, request body, or memorized metadata)
  let targetCentre = findCentre(centre);

  // If no explicit centre name, check if email_center resolves to a single unique centre
  if (!targetCentre && emailCenter) {
    const emailMatches = findCentresByEmail(emailCenter);
    if (emailMatches.length === 1) {
      targetCentre = emailMatches[0];
    }
  }

  if (targetCentre) {
    const formatted = formatSingleCentreHandoff(targetCentre, isEn, customIntro);
    return {
      reply: formatted.message,
      options: formatted.options,
      dynamicallyResolved: true,
      matchedCentre: targetCentre,
      matchedCity: targetCentre.city,
    };
  }

  // 2. Priority 2: City match (either from city param, or multiple centres under email_center)
  let targetCity = city || undefined;
  if (!targetCity && emailCenter) {
    const emailMatches = findCentresByEmail(emailCenter);
    if (emailMatches.length > 0) {
      targetCity = emailMatches[0].city;
    }
  }

  if (targetCity) {
    const cityCentres = findCentresByCity(targetCity);
    if (cityCentres.length > 0) {
      const formatted = formatCityCentresHandoff(targetCity, cityCentres, isEn, customIntro);
      return {
        reply: formatted.message,
        options: formatted.options,
        dynamicallyResolved: true,
        matchedCity: targetCity,
      };
    }
  }

  // 3. Priority 3: Fallback when profile has no centre/city
  // If baseResponse contains the legacy multi-country list, replace with clean default options
  if (baseResponse.includes('For urgent support, you may also call the front desk of your centre directly:')) {
    const formatted = formatDefaultHandoff(isEn);
    return {
      reply: formatted.message,
      options: formatted.options,
      dynamicallyResolved: true,
    };
  }

  return {
    reply: baseResponse,
    options: baseOptions,
    dynamicallyResolved: false,
  };
}
