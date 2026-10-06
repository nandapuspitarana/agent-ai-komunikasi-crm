const fs = require('fs');
const path = require('path');

const originalFilePath = path.join(__dirname, 'UserJourney-Agent.json');
const outputFilePath = path.join(__dirname, 'UserJourney-CS-Support.json');

const rawOriginal = JSON.parse(fs.readFileSync(originalFilePath, 'utf8'));

// Centre metadata dictionary enriched with verified data from ceosuite.com sitemap and knowledge base
const centresMeta = {
  'Axiata Tower': {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    address: '27th Floor, Jalan Stesen Sentral 5, KL Sentral, Kuala Lumpur 50470, Malaysia',
    phone: '+60 (3) 2776 6888',
    whatsapp: '+60 12 360 8913',
    transport: 'Direct internal link to KL Sentral Transit Hub (KLIA Express, LRT, MRT, KTM, Monorail).',
    facilities: '24/7 Member Access, Front Desk Reception, Super-Fast Internet, Fresh Fruit Water & Micro-Roasted Coffee, Business-Class Printers, Meeting Rooms, Lounges.',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-axiata-tower/'
  },
  'Q Sentral': {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    address: 'Level 35-02 (East Wing), 2A, Jalan Stesen Sentral 2, KL Sentral, Kuala Lumpur 50470, Malaysia',
    phone: '+60 (3) 2731 9388',
    whatsapp: '+60 12 360 7089',
    transport: 'Covered pedestrian link to KL Sentral Station and Muzium Negara MRT.',
    facilities: '24/7 Member Access, Sky Lobby, Business Lounge, Meeting Facilities, High-Speed Wi-Fi, Mail Handling, Daily Cleaning.',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-q-sentral/'
  },
  'Manara Maxis 36': {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    address: '36th Floor, Menara Maxis, Kuala Lumpur City Centre (KLCC), Kuala Lumpur 50088, Malaysia',
    phone: '+60 (3) 2615 0000',
    whatsapp: '+60 12 360 6982',
    transport: 'Adjacent to Petronas Twin Towers, Suria KLCC, and KLCC LRT Station.',
    facilities: '24/7 Member Access, Panoramic City Views, Executive Boardrooms, Video Conferencing, High-Speed Fiber Internet, Front Desk Reception.',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-maxis-36th/'
  },
  'Manara Maxis 26': {
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    address: '26th Floor, Menara Maxis, Kuala Lumpur City Centre (KLCC), Kuala Lumpur 50088, Malaysia',
    phone: '+60 (3) 2615 2688',
    whatsapp: '+60 12 360 6982',
    transport: 'Direct connection to KLCC Suria shopping mall and KLCC LRT Station.',
    facilities: '24/7 Member Access, Front Desk Reception, Modern Meeting Rooms, High-Speed Internet, Pantry & Refreshments, Daily Housekeeping.',
    url: 'https://www.ceosuite.com/locations/kuala-lumpur-maxis-26th/'
  },
  'Chinachem Tower': {
    city: 'Hong Kong',
    country: 'China',
    address: 'Levels 5-7, Chinachem Tower, 34-37 Connaught Road Central, Central, Hong Kong',
    phone: '+852 3166 6160',
    whatsapp: '+852 6795 3268',
    transport: 'Central MTR Station (Exit A/B) & Hong Kong Airport Express Station.',
    facilities: '24/7 Member Access, High-Speed Wi-Fi, Receptionist Services, Meeting Rooms, Micro-Roasted Coffee, Mail Handling, Daily Cleaning.',
    url: 'https://www.ceosuite.com/locations/chinachem-tower/'
  },
  'K11 Atelier Victoria Dockside': {
    city: 'Hong Kong',
    country: 'China',
    address: 'Level 7, 18 Salisbury Road, Tsim Sha Tsui, Hong Kong',
    phone: '+852 3166 6166',
    whatsapp: '+852 6086 6673',
    transport: 'Tsim Sha Tsui MTR Station (Exit J) & East Tsim Sha Tsui Station.',
    facilities: 'Harbour Views, 24/7 Member Access, Executive Boardrooms, High-Speed Wi-Fi, Front Desk Concierge, Business Lounge, Barista Refreshments.',
    url: 'https://www.ceosuite.com/locations/hongkong-k11-atelier/'
  },
  'Sunshine Financial Center': {
    city: 'Beijing',
    country: 'China',
    address: '31st Floor, No. 33 Jinghui Avenue, Chaoyang District, Beijing 100020, China',
    phone: '+86 (10) 8660 8888',
    whatsapp: '',
    transport: 'Guomao Subway Station (Line 1 & 10) in Beijing CBD core area.',
    facilities: '24/7 Member Access, High-Speed Internet, Front Desk Secretarial Support, Conference Rooms, Ergonomic Furniture, Daily Housekeeping.',
    url: 'https://www.ceosuite.com/locations/sunshine-financial-center/'
  },
  'The Exchange Twin Towers': {
    city: 'Beijing',
    country: 'China',
    address: '10th Floor, B-12 Jianguomenwai Avenue, Chaoyang District, Beijing 100022, China',
    phone: '+86 (10) 5909 2988',
    whatsapp: '',
    transport: 'Yong\'anli Subway Station (Line 1), directly connected via underground concourse.',
    facilities: '24/7 Member Access, Executive Boardrooms, Video Conferencing, High-Speed Wi-Fi, Front Desk Concierge, Mail & Parcel Handling.',
    url: 'https://www.ceosuite.com/locations/beijing-the-exchange-twin-tower/'
  },
  'Lujiazui Finance Plaza': {
    city: 'Shanghai',
    country: 'China',
    address: '18th Floor, 826 Century Avenue, Pudong, Shanghai 200120, China',
    phone: '+86 (21) 5116 5116',
    whatsapp: '',
    transport: 'Century Avenue Metro Station (Lines 2, 4, 6, 9 quadruple interchange).',
    facilities: '24/7 Member Access, Front Desk Reception, High-Speed Fiber Internet, Meeting Rooms, Business Lounge, Pantry Refreshments.',
    url: 'https://www.ceosuite.com/locations/lujiazui-financial-plaza/'
  },
  'Shanghai World Financial Center': {
    city: 'Shanghai',
    country: 'China',
    address: '28th Floor, 100 Century Avenue, Pudong, Shanghai 200120, China',
    phone: '+86 (21) 2052 0666',
    whatsapp: '',
    transport: 'Lujiazui Metro Station (Line 2 & Line 14) in the Lujiazui Financial Core.',
    facilities: 'Landmark Skyscraper Location, 24/7 Member Access, Multilingual Reception, Executive Meeting Rooms, High-Speed Internet, Lounges.',
    url: 'https://www.ceosuite.com/locations/shanghai-world-financial-centre/'
  },
  'Hong Kong New World Tower (K11)': {
    city: 'Shanghai',
    country: 'China',
    address: '47th Floor, 300 Huaihai Zhong Road, Puxi, Shanghai 200021, China',
    phone: '+86 (21) 5116 2888',
    whatsapp: '',
    transport: 'South Huangpi Road Metro Station (Line 1 & Line 14) in Puxi shopping & commercial district.',
    facilities: '24/7 Member Access, Panoramic City Views, High-Speed Wi-Fi, Meeting Rooms, Business Concierge, Mail Handling.',
    url: 'https://www.ceosuite.com/locations/shanghai-puxi-hong-kong-new-world-tower/'
  },
  'Ping An Finance Center': {
    city: 'Hangzhou',
    country: 'China',
    address: '7th-9th Floor, Tower B, 159 Jiangjin Road, Shangcheng District, Hangzhou 310020, China',
    phone: '+86 21 2052 0666',
    whatsapp: '',
    transport: 'Qianjiang Exchange Metro Station (Line 2 & Line 4) in Qianjiang New City CBD.',
    facilities: '24/7 Member Access, High-Speed Internet, Multilingual Front Desk, Boardrooms, Fresh Coffee & Tea, Daily Cleaning.',
    url: 'https://www.ceosuite.com/locations/ping-an-finance-center/'
  },
  'Lkg Tower': {
    city: 'Manila',
    country: 'Philippines',
    address: '37th Floor, 6801 Ayala Avenue, Makati City 1226, Philippines',
    phone: '+63 (2) 8859 2888',
    whatsapp: '+63 93 9932 7673',
    transport: 'Ayala Avenue, Makati Central Business District, near Ayala MRT Station.',
    facilities: '24/7 Member Access, Business Lounge, High-Speed Fiber Internet, Meeting Rooms, Front Desk Secretarial Support, Mail Handling.',
    url: 'https://www.ceosuite.com/locations/office-space-for-rent-manila/'
  },
  'Sahid Sudirman Center': {
    city: 'Jakarta',
    country: 'Indonesia',
    address: '56th Floor, Jl. Jend. Sudirman No. 86, Jakarta 10220, Indonesia',
    phone: '+62 (21) 8063 1888',
    whatsapp: '+62 8111 50 836',
    transport: 'Bendungan Hilir / Setiabudi Astra MRT Station, TransJakarta Busway Koridor 1.',
    facilities: 'Jakarta\'s Tallest Office Tower, 24/7 Member Access, 360-Degree Panoramic Views, High-Speed Internet, Executive Boardrooms, Barista Coffee.',
    url: 'https://www.ceosuite.com/locations/jakarta-sahid-sudirman-centre/'
  },
  'Axa Tower': {
    city: 'Jakarta',
    country: 'Indonesia',
    address: '45th Floor, Jl. Prof. Dr. Satrio Kav. 18, Kuningan City, Jakarta 12940, Indonesia',
    phone: '+62 (21) 3005 3500',
    whatsapp: '+62 8111 50 894',
    transport: 'Direct access to Kuningan City Mall, LRT Jabodebek Kuningan, TransJakarta Satrio.',
    facilities: '24/7 Member Access, Modern Meeting Rooms, High-Speed Internet, Front Desk Concierge, Business Lounge, Mail & Package Handling.',
    url: 'https://www.ceosuite.com/locations/jakarta-axa/'
  },
  'Indonesia Stock Exchange Tower 2': {
    city: 'Jakarta',
    country: 'Indonesia',
    address: '17th Floor, Tower 2, Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta 12190, Indonesia',
    phone: '+62 (21) 515 7777',
    whatsapp: '+62 8111 50 857',
    transport: 'Istora Mandiri MRT Station, SCBD busway shuttle, direct Sudirman road access.',
    facilities: 'Prestigious SCBD Financial Address, 24/7 Member Access, High-Speed Wi-Fi, Meeting Rooms, Multilingual Front Desk, Mail Handling.',
    url: 'https://www.ceosuite.com/locations/jakarta-stock-exchange/'
  },
  'One Pacific Place': {
    city: 'Jakarta',
    country: 'Indonesia',
    address: '15th Floor, Jl. Jend. Sudirman Kav. 52-53, SCBD, Jakarta 12190, Indonesia',
    phone: '+62 (21) 2550 2550',
    whatsapp: '+62 8111 50 849',
    transport: 'Direct underground connection to Istora Mandiri MRT Station and Pacific Place Luxury Mall.',
    facilities: 'Ultra-Premium SCBD Centre, 24/7 Member Access, Luxury Executive Boardrooms, High-Speed Fiber Internet, Barista Pantry, Concierge Support.',
    url: 'https://www.ceosuite.com/locations/jakarta-one-pacific-place/'
  },
  'Centennial Tower': {
    city: 'Singapore',
    country: 'Singapore',
    address: '21st Floor, 3 Temasek Avenue, Singapore 039190',
    phone: '+65 6829 7000',
    whatsapp: '+65 9182 9667',
    transport: 'Promenade MRT Station (Circle Line & Downtown Line Interchange), Suntec City link.',
    facilities: '24/7 Member Access, Front Desk Reception, High-Speed Internet, Meeting Rooms, Business Lounge, Micro-Roasted Coffee, Mail Services.',
    url: 'https://www.ceosuite.com/locations/centennial-tower/'
  },
  'Kyobo Building': {
    city: 'Seoul',
    country: 'South Korea',
    address: '15th Floor, 1 Jongno, Jongno-gu, Seoul 03154, Korea',
    phone: '+82 (2) 2010 8888',
    whatsapp: '+82 10 7445 8807',
    transport: 'Direct underground walkway to Gwanghwamun Subway Station (Line 5), City Hall CBD.',
    facilities: '24/7 Member Access, High-Speed Internet, Multilingual Front Desk, Boardrooms, Fresh Fruit Water & Coffee, Mail Handling.',
    url: 'https://www.ceosuite.com/locations/seoul-kyobo-building/'
  },
  'Parnas Tower': {
    city: 'Seoul',
    country: 'South Korea',
    address: '29th Floor, 521 Teheran-ro, Gangnam-gu, Seoul 06164, Korea',
    phone: '+82 (2) 2097 8288',
    whatsapp: '+82 10 7445 8807',
    transport: 'Direct connection to Samseong Subway Station (Line 2), COEX Convention & Mall, Grand InterContinental.',
    facilities: 'Prime Gangnam Teheran-ro Landmark, 24/7 Member Access, High-Speed Internet, Executive Meeting Rooms, Business Lounge, Concierge Support.',
    url: 'https://www.ceosuite.com/locations/seoul-gangnam-parnas-tower/'
  },
  'Athenee Tower': {
    city: 'Bangkok',
    country: 'Thailand',
    address: '23rd Floor, 63 Wireless Road, Lumpini, Pathumwan, Bangkok 10330, Thailand',
    phone: '+66 (2) 126 8000',
    whatsapp: '+66 83 067 8870',
    transport: 'Ploenchit BTS Skytrain Station via covered skybridge, Wireless Road embassy district.',
    facilities: '24/7 Member Access, Front Desk Reception, High-Speed Internet, Meeting Facilities, Business Lounge, Coffee & Refreshments, Daily Housekeeping.',
    url: 'https://www.ceosuite.com/locations/bangkok-athenee-tower/'
  },
  'Hanoi Lotte Center': {
    city: 'Hanoi',
    country: 'Vietnam',
    address: '29th Floor, East Tower, 54 Lieu Giai Street, Ba Dinh District, Hanoi 100000, Vietnam',
    phone: '+84 (24) 3267 3999',
    whatsapp: '+84 83 878 8999',
    transport: 'Ba Dinh diplomatic corridor, near Kim Ma transit interchange and Daewoo Hotel.',
    facilities: 'Landmark High-Rise, 24/7 Member Access, Panoramic City Views, High-Speed Internet, Meeting Rooms, Multilingual Secretarial Support.',
    url: 'https://www.ceosuite.com/locations/hanoi-lotte-center/'
  },
  'Vietcombank Tower': {
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    address: 'Level 21, No. 5 Me Linh Square, Ben Nghe Ward, District 1, Ho Chi Minh City 70000, Vietnam',
    phone: '+84 (28) 3827 1988',
    whatsapp: '+84 83 704 8668',
    transport: 'Prime District 1 waterfront location on Me Linh Square, near Bach Dang pier.',
    facilities: 'Grade A Waterfront Tower, 24/7 Member Access, Executive Boardrooms, High-Speed Wi-Fi, Reception Concierge, Mail & Parcel Handling.',
    url: 'https://www.ceosuite.com/locations/ho-chi-minh-vietcombank-tower/'
  }
};

// Filter out all sales form action intents (responseType === 'form')
const filteredIntents = rawOriginal.data.intents.filter(it => it.responseType !== 'form');

// Process existing intents to remove sales phrasing and inject rich CS support options
filteredIntents.forEach(it => {
  // 1. Update Start / Main Menu
  if (it.name === 'Start / Main Menu') {
    it.response = "Hello, I’m Claire from CEO SUITE Customer Support. How can I help you today? Please choose a topic below or type your question.";
    it.options = "Frequently Asked Questions (FAQ)|CS: FAQ Menu, Our Centres & Locations|Locations: Select City, Workspace & Service Guide|Services: Overview Guide, Business Support Services|Services: Business Support Overview, Facilities & Amenities|CS: Facilities & Amenities Menu, Billing & Payments|CS: Billing & Payment Overview, Speak to CS Agent|CS: Speak to Human Agent / Live Support";
  }

  // 2. Update Centre Cards across all products
  const centreMatch = it.name.match(/^(?:PO|MR|VO|DW) Centre:\s*(.*)$/);
  if (centreMatch) {
    const rawCentreName = centreMatch[1].trim();
    const meta = centresMeta[rawCentreName];
    
    // Determine product title from intent prefix
    let productTitle = 'Workspace';
    if (it.name.startsWith('PO Centre:')) productTitle = 'Private & Serviced Office';
    else if (it.name.startsWith('MR Centre:')) productTitle = 'Meeting Room';
    else if (it.name.startsWith('VO Centre:')) productTitle = 'Virtual Office';
    else if (it.name.startsWith('DW Centre:')) productTitle = 'Dedicated Workstation';

    if (meta) {
      const waDisplay = meta.whatsapp ? ` | <b>WhatsApp:</b> <a href='https://wa.me/${meta.whatsapp.replace(/[^0-9]/g, '')}'>${meta.whatsapp}</a>` : '';
      it.response = `<div class='card'><div class='card-title'>${rawCentreName} (${meta.city}) - ${productTitle}</div><div class='small'><b>Address:</b> ${meta.address}<br/><b>Phone:</b> ${meta.phone}${waDisplay}<br/><b>Transport:</b> ${meta.transport}<br/><b>Facilities:</b> ${meta.facilities}<br/><br/>Explore space details: <a href='${meta.url}' target='_blank'>${meta.url}</a></div></div><div class='cta-note'>Have a question about this location? Select an option below or type your inquiry anytime.</div>`;
      it.options = `Centre Facilities & Amenities|CS: Facilities & Amenities Menu, Contact Front Desk|Front Desk: ${rawCentreName}, Operating Hours & Access|Facilities: Building Access & Access Cards, Other Centres in ${meta.city}|City Directory: ${meta.city}, Start again|Start / Main Menu`;
    } else {
      it.options = `Centre Facilities & Amenities|CS: Facilities & Amenities Menu, Contact Front Desk|CS: Contact Directory All Locations, Operating Hours & Access|Facilities: Building Access & Access Cards, Start again|Start / Main Menu`;
    }
  }

  // 3. Update Service Overview cards
  if (it.name === 'Direct: Private Office') {
    it.response = "Private & Serviced Office\nFully furnished, ready-to-use private offices with flexible terms. Includes ergonomic furniture, high-speed internet, dedicated phone lines, utilities, cleaning, front desk reception, and business lounge access.\n\nWhich city are you inquiring about?";
  } else if (it.name === 'Direct: Meeting Room') {
    it.response = "Meeting & Conference Rooms\nFully equipped meeting rooms available by the hour or day across Asia. Features state-of-the-art AV technology, high-speed Wi-Fi, whiteboards, video conferencing, technical assistance, and catering options.\n\nWhich city are you inquiring about?";
  } else if (it.name === 'Direct: Virtual Office') {
    it.response = "Virtual Office\nEstablish a prestigious CBD business address without physical overhead. Includes mail & package handling, dedicated local phone line with professional multilingual receptionist call answering, and member rates for meeting room bookings.\n\nWhich city are you inquiring about?";
  } else if (it.name === 'Direct: Dedicated Workstation') {
    it.response = "Dedicated Workstation\nYour own personal assigned desk in a shared executive environment. Features 24/7 access, locking storage, high-speed internet, and business lounge privileges.\n\nWhich city are you inquiring about?";
  } else if (it.name === 'Direct: Coworking') {
    it.response = "Coworking Space\nFlexible hot-desking in our premium business lounges. Available on daily, weekly, or monthly plans during business hours, with high-speed internet and complimentary refreshments.\n\nWhich city are you inquiring about?";
    it.options = "Bangkok|Bangkok Private Office, Beijing|Beijing Private Office, Hangzhou|Hangzhou Private Office, Hanoi|Hanoi Private Office, Ho Chi Minh City|Ho Chi Minh City Private Office, Hong Kong|Hong Kong Private Office, Jakarta|Jakarta Private Office, Kuala Lumpur|Kuala Lumpur Private Office, Manila|Manila Private Office, Seoul|Seoul Private Office, Shanghai|Shanghai Private Office, Singapore|Singapore Private Office";
  } else if (it.name === 'Direct: Day Office') {
    it.response = "Day Office\nPrivate office space available on a daily or hourly basis. Perfect for mobile executives, confidential interviews, and visiting teams needing quiet, distraction-free workspaces.\n\nWhich city are you inquiring about?";
  }
});

// Comprehensive list of Customer Service, FAQ, Support, and Operational intents
const csIntents = [
  // --- SUBMENUS ---
  {
    name: "CS: FAQ Menu",
    trainingPhrases: [
      "faq",
      "frequently asked questions",
      "frequently asked questions (faq)",
      "tanya jawab",
      "pertanyaan umum",
      "help faq",
      "list of questions"
    ],
    responseType: "options",
    response: "Here are our most frequently asked questions. Select a topic below to see answers:",
    options: "What is a Serviced Office|FAQ: What is a Serviced Office, Coworking vs Dedicated Desk|FAQ: Coworking vs Dedicated Desk, What is a Virtual Office|FAQ: What is a Virtual Office, How to book a Meeting Room|FAQ: How to Book a Meeting Room, Upgrade or Downgrade Plan|FAQ: Upgrade or Downgrade Plan, Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "CS: Facilities & Amenities Menu",
    trainingPhrases: [
      "facilities",
      "amenities",
      "facilities & amenities",
      "fasilitas",
      "office amenities",
      "what facilities do you have",
      "fasilitas kantor",
      "centre facilities & amenities"
    ],
    responseType: "options",
    response: "CEO SUITE provides business-class facilities across all centres in Asia. Select a topic to learn more:",
    options: "Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Building Access & Access Cards|Facilities: Building Access & Access Cards, Mail & Courier Handling|Facilities: Mail & Courier Handling, Business-Class Printing|Facilities: Business-Class Printing & Scanning, Pantry & Refreshments|Facilities: Pantry & Refreshments, Meeting Room AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Locations: Select City",
    trainingPhrases: [
      "locations: select city",
      "our centres & locations",
      "our centers & locations",
      "our centres and locations",
      "our centers and locations",
      "our centres",
      "our centers",
      "our centre",
      "our center",
      "centres & locations",
      "centers & locations",
      "centres and locations",
      "centers and locations",
      "other centres & locations",
      "other centers & locations",
      "select our center",
      "select our centre",
      "select center",
      "select centre",
      "choose center",
      "choose centre",
      "all centres",
      "all centers",
      "all locations",
      "locations",
      "cities",
      "centres",
      "centers",
      "centre",
      "center",
      "dimana saja lokasi ceo suite",
      "daftar lokasi",
      "lokasi kantor",
      "cabang ceo suite",
      "pilihan lokasi",
      "pilih lokasi",
      "find a centre",
      "find a center",
      "other cities"
    ],
    responseType: "options",
    response: "CEO SUITE operates in 9 countries across Asia. Please select a city to view our centres, addresses, and contacts:",
    options: "Jakarta|City Directory: Jakarta, Kuala Lumpur|City Directory: Kuala Lumpur, Singapore|City Directory: Singapore, Hong Kong|City Directory: Hong Kong, Shanghai|City Directory: Shanghai, Beijing|City Directory: Beijing, Hangzhou|City Directory: Hangzhou, Seoul|City Directory: Seoul, Bangkok|City Directory: Bangkok, Manila|City Directory: Manila, Hanoi|City Directory: Hanoi, Ho Chi Minh City|City Directory: Ho Chi Minh City",
    metadata: { category: "Locations" }
  },
  {
    name: "Services: Overview Guide",
    trainingPhrases: [
      "workspace & service guide",
      "services overview",
      "layanan apa saja",
      "office services",
      "guide to services"
    ],
    responseType: "options",
    response: "CEO SUITE offers complete workspace and corporate support solutions. Which service would you like to explore?",
    options: "Private Office|Direct: Private Office, Coworking Space|Direct: Coworking, Dedicated Desk|Direct: Dedicated Workstation, Virtual Office|Direct: Virtual Office, Meeting Facilities|Direct: Meeting Room, Business Support Services|Services: Business Support Overview, Main Menu|Start / Main Menu",
    metadata: { category: "Services" }
  },

  // --- CEOSUITE.COM OFFICIAL FAQ INTENTS ---
  {
    name: "FAQ: What is a Serviced Office",
    trainingPhrases: [
      "what is a serviced office",
      "serviced office meaning",
      "apa itu serviced office",
      "kantor berlayanan",
      "explain serviced office",
      "managed office"
    ],
    responseType: "options",
    response: "<b>What is a Serviced Office?</b><br/><br/>Also known as managed offices, business centers, or executive suites, serviced offices provide fully-equipped, ready-to-use office facilities managed by CEO SUITE. They empower businesses—from solo entrepreneurs to SMEs and multinational corporations—to rent workspace customizable to their exact size, accommodating from 1 to 50+ persons with flexible terms.",
    options: "Why Serviced Office vs Traditional|FAQ: Why Serviced Office vs Traditional, Other Centres & Locations|Locations: Select City, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Why Serviced Office vs Traditional",
    trainingPhrases: [
      "are serviced offices better value than traditional office space",
      "why serviced office vs traditional",
      "serviced office vs traditional lease",
      "is serviced office cheaper",
      "perbedaan serviced office dan kantor biasa",
      "kenapa serviced office lebih hemat",
      "traditional office comparison"
    ],
    responseType: "options",
    response: "<b>Are serviced offices better value than traditional office space?</b><br/><br/>Traditional office leases often require heavy capital expenditure: interior renovation, furniture, IT infrastructure, phone lines, and ongoing utility bills.<br/><br/>A CEO SUITE serviced office eliminates upfront capital investment. Rent includes high-speed internet, premium ergonomic furniture, utilities, daily cleaning, front desk receptionist services, and business lounge access, saving both time and money.",
    options: "What is a Serviced Office|FAQ: What is a Serviced Office, Explore Private Offices|Direct: Private Office, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Why Choose CEO SUITE",
    trainingPhrases: [
      "why choose ceo suite",
      "kenapa memilih ceo suite",
      "about ceo suite",
      "keunggulan ceo suite",
      "who is ceo suite",
      "ceo suite difference"
    ],
    responseType: "options",
    response: "<b>Why Choose CEO SUITE?</b><br/><br/>CEO SUITE is Asia’s only one-stop Serviced Office Provider run by multicultural industry experts for over 29 years. Located in the most prestigious Grade-A landmark buildings across 9 Asian countries, we provide an unparalleled range of services—from premium workspace to company registration, accounting, and IT support. Joining one CEO SUITE centre gives you access across our regional network.",
    options: "Our Centres & Locations|Locations: Select City, Business Support Services|Services: Business Support Overview, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Coworking vs Dedicated Desk",
    trainingPhrases: [
      "what is the difference between standard coworking space and a dedicated workstation",
      "coworking vs dedicated workstation",
      "coworking vs dedicated desk",
      "hot desk vs dedicated desk",
      "perbedaan coworking dan dedicated desk",
      "apa itu shared office"
    ],
    responseType: "options",
    response: "<b>Coworking Space vs Dedicated Workstation:</b><br/><br/>• <b>Coworking (Hot Desk):</b> Access to unassigned work desks in shared business lounges during office hours. Flexible by day, week, or month.<br/>• <b>Dedicated Workstation:</b> Greater exclusivity with an assigned personal desk reserved just for you, including 24/7 access, locking storage, and permanent setup.",
    options: "Coworking Details|Direct: Coworking, Dedicated Desk Details|Direct: Dedicated Workstation, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: What is a Virtual Office",
    trainingPhrases: [
      "what is a virtual office",
      "apa itu virtual office",
      "kantor virtual",
      "business address service",
      "how does virtual office work"
    ],
    responseType: "options",
    response: "<b>What is a Virtual Office?</b><br/><br/>A virtual office gives your company a prestigious CBD business address and complete administrative support without renting physical office space. It includes mail & package handling, dedicated telephone answering by our professional team, and member discounts on meeting room bookings.",
    options: "Company Registration FAQ|FAQ: Virtual Office Company Registration, Upgrade or Downgrade Plan|FAQ: Upgrade or Downgrade Plan, Explore Virtual Office|Direct: Virtual Office, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Virtual Office Company Registration",
    trainingPhrases: [
      "can i use a virtual office for company registration",
      "can i use virtual office for company registration",
      "apakah bisa daftar pt dengan virtual office",
      "incorporation with virtual office",
      "domisili perusahaan virtual office",
      "register business address"
    ],
    responseType: "options",
    response: "<b>Can I use a Virtual Office for Company Registration?</b><br/><br/>Yes, in many jurisdictions CEO SUITE virtual office addresses can be utilized as a registered business address or domicile for company incorporation, subject to local statutory guidelines.<br/><br/>Our professional Corporate Services team also assists with company registration, licensing, tax registration, and legal compliance across Asia.",
    options: "Company Registration Services|Services: Professional Services & Company Registration, Virtual Office Plans|Direct: Virtual Office, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Upgrade or Downgrade Plan",
    trainingPhrases: [
      "can i upgrade my virtual office to a serviced office",
      "can i upgrade or downgrade my plan",
      "upgrade or downgrade plan",
      "package change & flexibility",
      "bisakah upgrade paket",
      "ubah sewa kantor",
      "switch from virtual office to serviced office"
    ],
    responseType: "options",
    response: "<b>Can I upgrade or customize my package?</b><br/><br/>Yes, absolutely! CEO SUITE welcomes package upgrades, additions, or adjustments as your business requirements evolve. You can easily transition from a Virtual Office to a Dedicated Desk or Private Office, or scale up your team capacity with minimal administrative hassle.",
    options: "Speak to CS Agent|CS: Speak to Human Agent / Live Support, Billing & Payments|CS: Billing & Payment Overview, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: How to Book a Meeting Room",
    trainingPhrases: [
      "how can i book a venue",
      "how to book a meeting room",
      "cara pesan ruang meeting",
      "book conference room",
      "meeting room reservation",
      "sewa ruang rapat"
    ],
    responseType: "options",
    response: "<b>How can I book a Meeting Room?</b><br/><br/>You can reserve meeting rooms and conference facilities through:<br/>1. Online portal at <a href='https://booking.ceosuite.com' target='_blank'>booking.ceosuite.com</a><br/>2. Contacting your local CEO SUITE centre reception directly via phone or WhatsApp.<br/>3. WeChat (China locations).<br/><br/>Please inform our team of your preferred date, time, participant headcount, and AV/catering needs.",
    options: "Meeting Room AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Early Setup & After-Hours Meeting|FAQ: Early Setup & After-Hours Meeting, Meeting Facilities|Direct: Meeting Room, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Early Setup & After-Hours Meeting",
    trainingPhrases: [
      "can i get access to the venue early to set-up",
      "early setup meeting room",
      "can my event go beyond the business hours",
      "early setup & after-hours meeting",
      "after hours meeting",
      "meeting malam hari ac gedung",
      "setup time meeting room"
    ],
    responseType: "options",
    response: "<b>Meeting Room Leeway & After-Hours Access:</b><br/><br/>• <b>Early Setup:</b> We extend a complimentary <b>30-minute leeway</b> prior to your booking start time for preparation.<br/>• <b>After-Hours Events:</b> Events can extend beyond standard centre hours. Note that centralized building air-conditioning may incur additional building management extension charges after regular hours.",
    options: "Meeting Room AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Catering & Outside Food Policy|FAQ: Catering & Outside Food Policy, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Presentation Equipment & Technical Assistance",
    trainingPhrases: [
      "does ceo suite rent out presentation equipment",
      "do you provide technical assistance",
      "meeting room av & equipment",
      "presentation equipment & av",
      "sewa proyektor layar",
      "av equipment rental",
      "bantuan teknis meeting",
      "it specialist on site"
    ],
    responseType: "options",
    response: "<b>Presentation Equipment & Technical Support:</b><br/><br/>• <b>Equipment Rental:</b> High-definition displays, projectors, conference speakerphones, video conferencing cameras, and flipcharts/whiteboards are available in-house.<br/>• <b>Technical Assistance:</b> Our on-site IT specialists and assistants are available to help configure presentation gear, connect laptops, and test video calls prior to your event.",
    options: "Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Catering & Outside Food Policy|FAQ: Catering & Outside Food Policy, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Catering & Outside Food Policy",
    trainingPhrases: [
      "does ceo suite provide catering services",
      "can we bring in our own food and beverages",
      "catering & outside food policy",
      "catering service meeting",
      "bawa makanan dari luar",
      "corkage fee",
      "snack meeting"
    ],
    responseType: "options",
    response: "<b>Catering & Beverage Policy:</b><br/><br/>• <b>In-House Catering:</b> Our team can coordinate gourmet coffee breaks, lunches, and snack menus tailored to your preferences.<br/>• <b>Outside Food:</b> You may bring your own catering or beverages; nominal service or corkage fees may apply if assistance with serving or cleanup is required.<br/>• <b>Complimentary:</b> Fresh fruit-infused water, gourmet coffee, and premium teas are always available in the lounge.",
    options: "Pantry & Refreshments|Facilities: Pantry & Refreshments, How to book a Meeting Room|FAQ: How to Book a Meeting Room, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },

  // --- FACILITIES & OPERATIONAL SUPPORT ---
  {
    name: "Facilities: Wi-Fi & Internet Connectivity",
    trainingPhrases: [
      "is wired wireless internet access available",
      "wi-fi access",
      "wi-fi & internet support",
      "internet speed",
      "cara koneksi wifi",
      "password wifi",
      "wired internet connection",
      "network support"
    ],
    responseType: "options",
    response: "<b>Wi-Fi & Internet Infrastructure:</b><br/><br/>• All CEO SUITE facilities feature high-speed enterprise-grade Wi-Fi and wired Ethernet ports.<br/>• Secure separate networks for members and guests.<br/>• Dedicated bandwidth, private VLANs, static IPs, and server rack hosting are available upon request.<br/>• If you experience connection issues, our on-site IT team is ready to assist.",
    options: "Building Access & Access Cards|Facilities: Building Access & Access Cards, Business-Class Printing|Facilities: Business-Class Printing & Scanning, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Facilities: Building Access & Access Cards",
    trainingPhrases: [
      "building access hours",
      "operating hours & access",
      "building access & access cards",
      "jam operasional kantor",
      "24/7 access",
      "kartu akses hilang",
      "access card replacement",
      "how to enter after hours",
      "office hours"
    ],
    responseType: "options",
    response: "<b>Access Hours & Building Security:</b><br/><br/>• <b>Reception Hours:</b> Front desk staff are on duty Monday to Friday, 8:30 AM – 6:00 PM.<br/>• <b>Member Access:</b> Private Office and Dedicated Desk members enjoy <b>24/7 secure card/key access</b>.<br/>• <b>Lost Card:</b> If you lose your access card, notify reception immediately for temporary access and card re-issuance.<br/>• <b>Visitors:</b> Guests must sign in at the front desk reception upon arrival.",
    options: "Visitor & Guest Policy|Facilities: Visitor & Guest Policy, Mail & Courier Handling|Facilities: Mail & Courier Handling, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Facilities: Mail & Courier Handling",
    trainingPhrases: [
      "mail handling",
      "mail & courier handling",
      "package delivery",
      "ambil paket",
      "pengambilan surat",
      "courier delivery policy",
      "surat masuk",
      "mail forwarding"
    ],
    responseType: "options",
    response: "<b>Mail & Package Handling Service:</b><br/><br/>• Our reception team receives and logs all incoming mail, registered letters, and courier parcels.<br/>• Members receive prompt email or WhatsApp notifications upon delivery.<br/>• Mail forwarding and scanning services can be arranged upon request.<br/>• Mail pickup is available during staffed reception hours (Mon-Fri 8:30 AM – 6:00 PM).",
    options: "Building Access & Access Cards|Facilities: Building Access & Access Cards, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Facilities: Business-Class Printing & Scanning",
    trainingPhrases: [
      "printing facility",
      "business-class printing",
      "cara print dokumen",
      "photocopy scanning",
      "printer connection",
      "biaya print",
      "cetak dokumen"
    ],
    responseType: "options",
    response: "<b>Printing, Scanning & Copying Facilities:</b><br/><br/>• Multi-function business-class printers are stationed on each floor for high-resolution color and monochrome printing, scanning to email, and photocopying.<br/>• Secure PIN-based printing is supported to ensure document confidentiality.<br/>• Paper, toners, and maintenance are handled by our team. Usage is itemized on your monthly statement.",
    options: "Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Pantry & Refreshments|Facilities: Pantry & Refreshments, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Facilities: Pantry & Refreshments",
    trainingPhrases: [
      "pantry refreshments",
      "pantry & refreshments",
      "free coffee",
      "air minum gratis",
      "fasilitas pantry",
      "kitchen facilities",
      "kopi gratis"
    ],
    responseType: "options",
    response: "<b>Pantry & Refreshments:</b><br/><br/>• Our executive business lounges feature fully-serviced pantries.<br/>• Complimentary fresh fruit-infused water, micro-roasted gourmet espresso, and premium teas are refreshed daily.<br/>• Equipped with refrigerators, microwave ovens, and dishware for member convenience.",
    options: "Building Access & Access Cards|Facilities: Building Access & Access Cards, Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },
  {
    name: "Facilities: Visitor & Guest Policy",
    trainingPhrases: [
      "visitor policy",
      "visitor & guest policy",
      "menerima tamu",
      "guest registration",
      "lobby reception guest",
      "tamu meeting",
      "guest policy"
    ],
    responseType: "options",
    response: "<b>Visitor & Guest Policy:</b><br/><br/>• All visitors are warmly greeted by our front desk concierges.<br/>• Reception notifies you immediately when your guest arrives.<br/>• Guests may wait in our comfortable executive lounge before meeting you in your private office or booked conference room.",
    options: "How to book a Meeting Room|FAQ: How to Book a Meeting Room, Building Access & Access Cards|Facilities: Building Access & Access Cards, Main Menu|Start / Main Menu",
    metadata: { category: "Facilities" }
  },

  // --- BUSINESS SUPPORT SERVICES (FROM CEOSUITE.COM/SERVICES) ---
  {
    name: "Services: Business Support Overview",
    trainingPhrases: [
      "business support services",
      "layanan pendukung bisnis",
      "layanan apa saja yang tersedia",
      "concierge services",
      "corporate support"
    ],
    responseType: "options",
    response: "<b>CEO SUITE Business Support Services:</b><br/><br/>We provide hassle-free, on-demand business support so you can focus completely on growing your company:<br/>• <b>Business Concierge:</b> Travel, secretarial, translation, multilingual calls.<br/>• <b>Professional Services:</b> Company incorporation, accounting, payroll, tax.<br/>• <b>Technical & IT:</b> Network setup, backup, hardware/software support.<br/>• <b>Other Services:</b> Office relocation, market research, seminar organizing.",
    options: "Concierge Services|Services: Business Concierge, Professional & Tax|Services: Professional Services & Company Registration, IT Support|Services: Technical & IT Support, Main Menu|Start / Main Menu",
    metadata: { category: "Services" }
  },
  {
    name: "Services: Business Concierge",
    trainingPhrases: [
      "business concierge",
      "concierge services",
      "travel arrangements",
      "secretarial support",
      "translation service",
      "layanan penerjemah",
      "telephone answering"
    ],
    responseType: "options",
    response: "<b>Business Concierge Services:</b><br/><br/>• Professional multilingual telephone answering in your company name.<br/>• Executive secretarial & administrative support.<br/>• Official document translation & interpretation.<br/>• Corporate travel and hotel bookings.<br/>• Mail and database management.",
    options: "Professional Services|Services: Professional Services & Company Registration, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Services" }
  },
  {
    name: "Services: Professional Services & Company Registration",
    trainingPhrases: [
      "company registration services",
      "professional services",
      "professional & tax",
      "accounting tax payroll",
      "jasa pendirian pt",
      "pembukuan pajak",
      "hr recruitment support",
      "tax consultation"
    ],
    responseType: "options",
    response: "<b>Professional Corporate Services:</b><br/><br/>• <b>Company Registration:</b> Entity incorporation, business licensing, and legal permits across Asia.<br/>• <b>Accounting & Bookkeeping:</b> Monthly financial records and statutory reporting.<br/>• <b>Payroll Management:</b> Monthly salary disbursement, social security, and tax filings.<br/>• <b>Tax Consultation:</b> Corporate tax filing and compliance advisory.<br/>• <b>HR & Recruitment:</b> Executive search and talent acquisition support.",
    options: "Concierge Services|Services: Business Concierge, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Services" }
  },
  {
    name: "Services: Technical & IT Support",
    trainingPhrases: [
      "technical and it support",
      "it support",
      "network setup",
      "data backup",
      "domain web design",
      "dukungan it bisnis",
      "it support service"
    ],
    responseType: "options",
    response: "<b>Technical & IT Support Services:</b><br/><br/>• Enterprise network setup and continuous monitoring.<br/>• Automated secure data backup and disaster recovery.<br/>• On-demand desktop and end-user hardware/software troubleshooting.<br/>• Domain registration, corporate email hosting, and web maintenance.",
    options: "Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Services" }
  },

  // --- BILLING & PAYMENT SUPPORT ---
  {
    name: "CS: Billing & Payment Overview",
    trainingPhrases: [
      "billing & payments",
      "how does billing work",
      "sistem penagihan",
      "invoice payment",
      "monthly billing cycle",
      "kapan tagihan keluar",
      "cara bayar invoice"
    ],
    responseType: "options",
    response: "<b>Billing & Payment Information:</b><br/><br/>• <b>Billing Cycle:</b> Monthly recurring charges are invoiced in advance, while usage-based services (meeting room overage, printing) are billed in arrears.<br/>• <b>Payment Methods:</b> We accept Bank Wire Transfers, Credit Cards, and secure Online Payments via our portal.<br/>• <b>Payment Confirmation:</b> Official receipts and statements are emailed promptly upon receipt of payment.",
    options: "Online Payment Help|Billing: Online Payment Support, Security Deposit Policy|Billing: Security Deposit Policy, Package Change & Flexibility|FAQ: Upgrade or Downgrade Plan, Main Menu|Start / Main Menu",
    metadata: { category: "Billing" }
  },
  {
    name: "Billing: Online Payment Support",
    trainingPhrases: [
      "online payment help",
      "payment failed",
      "pembayaran gagal",
      "payerror",
      "airwallex payment",
      "kendala bayar kartu kredit",
      "payment receipt"
    ],
    responseType: "options",
    response: "<b>Online Payment Assistance:</b><br/><br/>• If you encountered a <b>Payment Incomplete (payunfinish)</b> or <b>Payment Error (payerror)</b> notice, please verify that your card has 3D-Secure enabled and international transactions permitted.<br/>• You may retry payment through our secure payment gateway or request a manual bank transfer invoice from our finance desk.<br/>• Need help confirming your transaction? Contact our CS team immediately.",
    options: "Speak to CS Agent|CS: Speak to Human Agent / Live Support, Billing & Payments|CS: Billing & Payment Overview, Main Menu|Start / Main Menu",
    metadata: { category: "Billing" }
  },
  {
    name: "Billing: Security Deposit Policy",
    trainingPhrases: [
      "security deposit",
      "security deposit policy",
      "deposit refund",
      "pengembalian deposit",
      "uang jaminan sewa",
      "deposit terms"
    ],
    responseType: "options",
    response: "<b>Security Deposit Policy:</b><br/><br/>• Security deposits for physical workspace agreements safeguard against damages or unpaid ancillary fees.<br/>• Deposits are refundable following the completion of your agreement term, subject to final account clearance and key handover as outlined in your service contract.",
    options: "Billing & Payments|CS: Billing & Payment Overview, Speak to CS Agent|CS: Speak to Human Agent / Live Support, Main Menu|Start / Main Menu",
    metadata: { category: "Billing" }
  },

  // --- CUSTOMER SERVICE & ESCALATION ---
  {
    name: "CS: Speak to Human Agent / Live Support",
    trainingPhrases: [
      "speak to cs agent",
      "speak to a human agent",
      "bicara dengan agen",
      "hubungi manusia",
      "live agent",
      "customer service representative",
      "talk to human",
      "bantuan agen manusia",
      "customer service",
      "connect to agent",
      "agent"
    ],
    responseType: "text",
    response: "[HANDOFF_REQUESTED]\n\nOur Customer Service team has been notified and is stepping in to assist you directly. A team member will join this chat shortly.\n\nFor urgent support, you may also reach our hotlines directly:\n• Jakarta: +62 8111 508 481\n• Kuala Lumpur: +60 (3) 2615 0000\n• Singapore: +65 6829 7000\n• Hong Kong: +852 3166 6166\n• Beijing / Shanghai: +86 (21) 5116 5116\n• Seoul: +82 (2) 2010 8888\n• Bangkok: +66 (2) 126 8000\n• Manila: +63 (2) 8859 2888\n• Vietnam: +84 (24) 3267 3999",
    options: "",
    metadata: { handoff: true, category: "Support" }
  },
  {
    name: "CS: Lodge a Complaint or Feedback",
    trainingPhrases: [
      "lodge a complaint",
      "saya mau komplain",
      "keluhan layanan",
      "report an issue",
      "customer feedback",
      "layanan buruk",
      "masalah kantor",
      "complaint"
    ],
    responseType: "text",
    response: "[HANDOFF_REQUESTED]\n\nWe sincerely apologize for any inconvenience you have experienced. Providing flawless service is our highest priority at CEO SUITE.\n\nPlease describe the issue you encountered (including your centre location and room number if applicable). Your message is being escalated directly to the Centre Operations Manager for immediate resolution.",
    options: "",
    metadata: { handoff: true, category: "Support" }
  },
  {
    name: "CS: Contact Directory All Locations",
    trainingPhrases: [
      "contact directory",
      "nomor telepon kantor",
      "daftar kontak ceo suite",
      "office phone numbers",
      "whatsapp hotline",
      "contact front desk",
      "hubungi front desk"
    ],
    responseType: "options",
    response: "<b>CEO SUITE Regional Contact Directory:</b><br/><br/>• <b>Indonesia (Jakarta):</b> +62 (21) 8063 1888 | WA: +62 8111 508 481<br/>• <b>Malaysia (KL):</b> +60 (3) 2615 0000 | WA: +60 12 360 6982<br/>• <b>Singapore:</b> +65 6829 7000 | WA: +65 9182 9667<br/>• <b>Hong Kong:</b> +852 3166 6166 | WA: +852 6086 6673<br/>• <b>China (Shanghai/Beijing/Hangzhou):</b> +86 (21) 5116 5116<br/>• <b>South Korea (Seoul):</b> +82 (2) 2010 8888 | WA: +82 10 7445 8807<br/>• <b>Thailand (Bangkok):</b> +66 (2) 126 8000 | WA: +66 83 067 8870<br/>• <b>Philippines (Manila):</b> +63 (2) 8859 2888 | WA: +63 93 9932 7673<br/>• <b>Vietnam (Hanoi/HCMC):</b> +84 (24) 3267 3999 | WA: +84 83 878 8999",
    options: "Speak to CS Agent|CS: Speak to Human Agent / Live Support, Our Centres & Locations|Locations: Select City, Main Menu|Start / Main Menu",
    metadata: { category: "Support" }
  },

  // --- CITY LOOKUP SHORTCUTS (DIRECT TO CENTRES) ---
  {
    name: "City Directory: Jakarta",
    trainingPhrases: ["jakarta", "in jakarta", "centres in jakarta", "lokasi jakarta", "other centres in jakarta"],
    responseType: "options",
    response: "Here are our 4 prime Grade-A locations in Jakarta. Please select a centre to view address, facilities, and contact details:",
    options: "Sahid Sudirman Center|PO Centre: Sahid Sudirman Center, AXA Tower|PO Centre: Axa Tower, Indonesia Stock Exchange|PO Centre: Indonesia Stock Exchange Tower 2, One Pacific Place|PO Centre: One Pacific Place, Other Cities|Locations: Select City",
    metadata: { city: "Jakarta" }
  },
  {
    name: "City Directory: Kuala Lumpur",
    trainingPhrases: ["kuala lumpur", "in kuala lumpur", "centres in kuala lumpur", "lokasi kl", "kl sentral", "other centres in kuala lumpur"],
    responseType: "options",
    response: "Here are our 4 prime business locations in Kuala Lumpur. Please select a centre:",
    options: "Axiata Tower|PO Centre: Axiata Tower, Q Sentral|PO Centre: Q Sentral, Menara Maxis 36|PO Centre: Manara Maxis 36, Menara Maxis 26|PO Centre: Manara Maxis 26, Other Cities|Locations: Select City",
    metadata: { city: "Kuala Lumpur" }
  },
  {
    name: "City Directory: Singapore",
    trainingPhrases: ["singapore", "in singapore", "singapore office", "centennial tower", "other centres in singapore"],
    responseType: "options",
    response: "Here is our flagship centre in Singapore. Select below for full details:",
    options: "Centennial Tower|PO Centre: Centennial Tower, Other Cities|Locations: Select City",
    metadata: { city: "Singapore" }
  },
  {
    name: "City Directory: Hong Kong",
    trainingPhrases: ["hong kong", "in hong kong", "centres in hong kong", "other centres in hong kong"],
    responseType: "options",
    response: "Here are our premium centres in Hong Kong. Please select a centre:",
    options: "Chinachem Tower|PO Centre: Chinachem Tower, K11 Atelier Victoria Dockside|PO Centre: K11 Atelier Victoria Dockside, Other Cities|Locations: Select City",
    metadata: { city: "Hong Kong" }
  },
  {
    name: "City Directory: Shanghai",
    trainingPhrases: ["shanghai", "in shanghai", "centres in shanghai", "other centres in shanghai"],
    responseType: "options",
    response: "Here are our 3 prime business centres in Shanghai. Please select a centre:",
    options: "Lujiazui Finance Plaza|PO Centre: Lujiazui Finance Plaza, Shanghai World Financial Center|PO Centre: Shanghai World Financial Center, Hong Kong New World Tower (K11)|PO Centre: Hong Kong New World Tower (K11), Other Cities|Locations: Select City",
    metadata: { city: "Shanghai" }
  },
  {
    name: "City Directory: Beijing",
    trainingPhrases: ["beijing", "in beijing", "centres in beijing", "other centres in beijing"],
    responseType: "options",
    response: "Here are our premium centres in Beijing. Please select a centre:",
    options: "Sunshine Financial Center|PO Centre: Sunshine Financial Center, The Exchange Twin Towers|PO Centre: The Exchange Twin Towers, Other Cities|Locations: Select City",
    metadata: { city: "Beijing" }
  },
  {
    name: "City Directory: Hangzhou",
    trainingPhrases: ["hangzhou", "in hangzhou", "ping an finance center", "other centres in hangzhou"],
    responseType: "options",
    response: "Here is our premium centre in Hangzhou. Select below for full details:",
    options: "Ping An Finance Center|PO Centre: Ping An Finance Center, Other Cities|Locations: Select City",
    metadata: { city: "Hangzhou" }
  },
  {
    name: "City Directory: Seoul",
    trainingPhrases: ["seoul", "in seoul", "centres in seoul", "korea", "other centres in seoul"],
    responseType: "options",
    response: "Here are our premier business centres in Seoul. Please select a centre:",
    options: "Kyobo Building|PO Centre: Kyobo Building, Parnas Tower|PO Centre: Parnas Tower, Other Cities|Locations: Select City",
    metadata: { city: "Seoul" }
  },
  {
    name: "City Directory: Bangkok",
    trainingPhrases: ["bangkok", "in bangkok", "athenee tower", "thailand", "other centres in bangkok"],
    responseType: "options",
    response: "Here is our prestigious centre in Bangkok. Select below for full details:",
    options: "Athenee Tower|PO Centre: Athenee Tower, Other Cities|Locations: Select City",
    metadata: { city: "Bangkok" }
  },
  {
    name: "City Directory: Manila",
    trainingPhrases: ["manila", "in manila", "lkg tower", "makati", "other centres in manila"],
    responseType: "options",
    response: "Here is our flagship centre in Manila. Select below for full details:",
    options: "LKG Tower|PO Centre: Lkg Tower, Other Cities|Locations: Select City",
    metadata: { city: "Manila" }
  },
  {
    name: "City Directory: Hanoi",
    trainingPhrases: ["hanoi", "in hanoi", "lotte center", "other centres in hanoi"],
    responseType: "options",
    response: "Here is our flagship centre in Hanoi. Select below for full details:",
    options: "Lotte Center|PO Centre: Hanoi Lotte Center, Other Cities|Locations: Select City",
    metadata: { city: "Hanoi" }
  },
  {
    name: "City Directory: Ho Chi Minh City",
    trainingPhrases: ["ho chi minh city", "hcmc", "vietcombank tower", "saigon", "other centres in ho chi minh city"],
    responseType: "options",
    response: "Here is our premier waterfront centre in Ho Chi Minh City. Select below for full details:",
    options: "Vietcombank Tower|PO Centre: Vietcombank Tower, Other Cities|Locations: Select City",
    metadata: { city: "Ho Chi Minh City" }
  }
];

// --- CENTRE-SPECIFIC FRONT DESK CONTACT INTENTS ---
const frontDeskIntents = Object.entries(centresMeta).map(([centreName, meta]) => {
  const waDisplay = meta.whatsapp ? ` | <b>WhatsApp:</b> <a href='https://wa.me/${meta.whatsapp.replace(/[^0-9]/g, '')}'>${meta.whatsapp}</a>` : '';

  return {
    name: `Front Desk: ${centreName}`,
    trainingPhrases: [
      `Front Desk: ${centreName}`,
      `Contact Front Desk: ${centreName}`,
      `Front desk ${centreName}`,
      `Contact front desk ${centreName}`,
      `Hubungi front desk ${centreName}`,
      `Kontak front desk ${centreName}`,
      `Resepsionis ${centreName}`
    ],
    responseType: "options",
    response: `<div class='card'><div class='card-title'>Front Desk & Reception - ${centreName} (${meta.city})</div><div class='small'><b>Address:</b> ${meta.address}<br/><b>Phone:</b> ${meta.phone}${waDisplay}<br/><b>Reception Hours:</b> Monday - Friday, 8:30 AM – 6:00 PM<br/><b>Services:</b> Guest Registration, Access Cards, Meeting Room Support, Mail & Courier Handling, On-site IT Assistance.<br/><br/>Our on-duty front desk reception team at ${centreName} is ready to assist you.</div></div><div class='cta-note'>Need direct assistance from an on-duty receptionist or customer support agent? Choose an option below:</div>`,
    options: `Speak to Front Desk Agent|CS: Speak to Human Agent / Live Support, Operating Hours & Access|Facilities: Building Access & Access Cards, Centre Facilities & Amenities|CS: Facilities & Amenities Menu, Other Centres in ${meta.city}|City Directory: ${meta.city}, Start again|Start / Main Menu`,
    metadata: {
      category: "Front Desk",
      centre: centreName,
      city: meta.city
    }
  };
});

// Combine new CS Support intents (priority) with existing product intents
const allIntents = [...csIntents, ...frontDeskIntents, ...filteredIntents];

// --- INTENT TRAINING PHRASE ENRICHMENT & LINK GUARANTEE PASS ---
// Build quick lookup table
const intentByName = new Map();
allIntents.forEach(i => {
  intentByName.set(i.name, i);
  intentByName.set(i.name.toLowerCase().trim(), i);
});

function addPhrase(intent, phrase) {
  if (!phrase || typeof phrase !== 'string') return;
  const trimmed = phrase.trim();
  if (!trimmed) return;
  if (!intent.trainingPhrases) intent.trainingPhrases = [];
  const lower = trimmed.toLowerCase();
  if (!intent.trainingPhrases.some(p => p.toLowerCase().trim() === lower)) {
    intent.trainingPhrases.push(trimmed);
  }
}

// 1. Ensure EVERY intent has its own intent.name in trainingPhrases
for (const intent of allIntents) {
  addPhrase(intent, intent.name);
}

// 2. Ensure every option's Value, Label, and spelling variations are registered to the target intent
for (const intent of allIntents) {
  if (!intent.options || typeof intent.options !== 'string') continue;
  const rawOpts = intent.options.split(',');
  for (const raw of rawOpts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const pipeIdx = trimmed.indexOf('|');
    const label = pipeIdx !== -1 ? trimmed.substring(0, pipeIdx).trim() : trimmed;
    const value = pipeIdx !== -1 ? trimmed.substring(pipeIdx + 1).trim() : trimmed;

    let target = intentByName.get(value) || intentByName.get(value.toLowerCase().trim());
    if (!target) {
      target = allIntents.find(it => (it.trainingPhrases || []).some(p => p.toLowerCase().trim() === value.toLowerCase().trim()));
    }

    if (target) {
      addPhrase(target, value);
      addPhrase(target, label);

      // Handle centre / center variations
      if (label.toLowerCase().includes('centre')) {
        addPhrase(target, label.replace(/centre/gi, (m) => m === 'CENTRE' ? 'CENTER' : m === 'Centre' ? 'Center' : 'center'));
      }
      if (label.toLowerCase().includes('center')) {
        addPhrase(target, label.replace(/center/gi, (m) => m === 'CENTER' ? 'CENTRE' : m === 'Center' ? 'Centre' : 'centre'));
      }
      if (value.toLowerCase().includes('centre')) {
        addPhrase(target, value.replace(/centre/gi, (m) => m === 'CENTRE' ? 'CENTER' : m === 'Centre' ? 'Center' : 'center'));
      }
      if (value.toLowerCase().includes('center')) {
        addPhrase(target, value.replace(/center/gi, (m) => m === 'CENTER' ? 'CENTRE' : m === 'Center' ? 'Centre' : 'centre'));
      }
    }
  }
}

// 3. For all 23 PO Centre intents, ensure bare centre names are also recognized
for (const intent of allIntents) {
  const m = intent.name.match(/^PO Centre:\s*(.*)$/);
  if (m) {
    const bareName = m[1].trim();
    addPhrase(intent, bareName);
    if (bareName.includes('Centre')) {
      addPhrase(intent, bareName.replace(/Centre/g, 'Center'));
    } else if (bareName.includes('Center')) {
      addPhrase(intent, bareName.replace(/Center/g, 'Centre'));
    }
  }
}

const newFlow = {
  version: "1.0",
  type: "agent_flow",
  data: {
    name: "CEO SUITE Customer Service & Support Flow",
    description: "Customer Service, Support, Q&A, and Centre Information flow for CEO SUITE, replacing sales funnels with comprehensive visitor and client support.",
    config: {
      name: "Claire",
      description: "CEO SUITE Virtual CS Assistant",
      agentId: "ceo_suite_cs_bot_01",
      llmProvider: "gemini",
      systemPrompt: "You are Claire, the Customer Service & Support Virtual Assistant for CEO SUITE across Asia. Your primary role is to answer questions, guide visitors and clients on workspace services (Serviced Office, Coworking, Virtual Office, Meeting Rooms, Business Support), provide centre locations, contacts, operating hours, facilities, and handle customer service inquiries (Wi-Fi, access, mail, billing, complaints, human agent escalation). Be professional, polite, and helpful. If a user asks to speak with a human agent or reports a complex complaint, provide customer service contact options and tag with [HANDOFF_REQUESTED].",
      humanPrompt: "{input}",
      language: "en",
      speakingStyle: "professional",
      responseLength: "short",
      welcomeMessage: "Hello, I’m Claire from CEO SUITE Customer Support. How can I assist you today?",
      defaultFeedback: "Was this helpful?"
    },
    metadata: {
      focus: "Customer Service, Q&A, Facilities & Centre Support",
      source: "https://www.ceosuite.com/sitemap/"
    },
    intents: allIntents
  }
};

fs.writeFileSync(outputFilePath, JSON.stringify(newFlow, null, 2), 'utf8');

console.log('Successfully generated:', outputFilePath);
console.log('Original intents count:', rawOriginal.data.intents.length);
console.log('New flow intents count:', newFlow.data.intents.length);
const formsInNew = newFlow.data.intents.filter(it => it.responseType === 'form');
console.log('Sales forms in new flow:', formsInNew.length);
