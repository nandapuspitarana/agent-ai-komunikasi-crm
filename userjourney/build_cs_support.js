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
      "list of questions",
      "CS: FAQ Menu"
    ],
    responseType: "options",
    response: "Here are the most frequently asked questions about CEO SUITE services, workspaces, and facilities. Please choose a topic below:",
    options: "What is a Serviced Office|FAQ: What is a Serviced Office, Coworking & Shared Office|FAQ: What is a Coworking Space, What is a Virtual Office|FAQ: What is a Virtual Office, Book a Meeting Room|FAQ: How to Book a Meeting Room, Event Staff & Catering|FAQ: Event Staffing & Meeting Assistance, Why Choose CEO SUITE|FAQ: Why Choose CEO SUITE, More FAQ Topics|CS: FAQ More Topics, Main Menu|Start / Main Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "CS: FAQ More Topics",
    trainingPhrases: [
      "more faq topics",
      "other faqs",
      "more questions",
      "additional faq",
      "CS: FAQ More Topics"
    ],
    responseType: "options",
    response: "Here are additional frequently asked questions from our official FAQ knowledge base:",
    options: "Why Need Serviced Office|FAQ: Why Would I Need a Serviced Office, Serviced vs Traditional Lease|FAQ: Why Serviced Office vs Traditional, Why Need Virtual Office|FAQ: Why Would I Need a Virtual Office, Upgrade or Downgrade Plan|FAQ: Upgrade or Downgrade Plan, Early Setup & After-Hours|FAQ: Early Setup & After-Hours Meeting, Meeting AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, FAQ Menu|CS: FAQ Menu",
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
      "managed office",
      "FAQ: What is a Serviced Office"
    ],
    responseType: "options",
    response: "<b>What is a serviced office?</b><br/><br/>Also known as managed offices, business centers and executive suites, serviced offices provide fully-equipped facilities managed by a service facility management company. They empower businesses, from start-ups to small-, medium-sized enterprises and large-scale companies to rent office spaces that are suitable and customizable to their needs. Naturally, a serviced office room can cater to as few as one individual and as many as 20 persons.",
    options: "Why Need Serviced Office|FAQ: Why Would I Need a Serviced Office, Value vs Traditional Office|FAQ: Why Serviced Office vs Traditional, Explore Private Offices|Direct: Private Office, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Why Would I Need a Serviced Office",
    trainingPhrases: [
      "why would i need a serviced office",
      "why do i need a serviced office",
      "kenapa butuh serviced office",
      "benefits of serviced office",
      "keuntungan serviced office",
      "why choose serviced office",
      "FAQ: Why Would I Need a Serviced Office"
    ],
    responseType: "options",
    response: "<b>Why would I need a serviced office?</b><br/><br/>With minimal to no capital investment needed in leasing a serviced office, you can enjoy immediate access to fully furnished and well-equipped office without losing time and focus on growing your business. This modern approach to office space provides a complete business solution, and is increasingly popular with small firms and start-ups. However, due to serviced offices’ complete and fully-equipped nature, even large-scale companies find that business support services have considerable appeal.",
    options: "Value vs Traditional Office|FAQ: Why Serviced Office vs Traditional, What is a Serviced Office|FAQ: What is a Serviced Office, Explore Private Offices|Direct: Private Office, FAQ Menu|CS: FAQ Menu",
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
      "traditional office comparison",
      "FAQ: Why Serviced Office vs Traditional"
    ],
    responseType: "options",
    response: "<b>Are serviced offices better value than traditional office space?</b><br/><br/>This really depends on several varying factors, such as location, building facilities and the included amenities. On its own, traditional office space may be less expensive than serviced offices but you’d only be getting an empty space.<br/><br/>Additional expenses with traditional office space usually include overheads such as building dues, electricity, office space set-up, IT set-up, office furniture, telephone lines and office space interiors. Serviced office spaces are offered at a higher price because they already include all of these costs. Most importantly, serviced office spaces buy you more time for your business so you can focus on the more important matters and keep your business running smoothly.",
    options: "What is a Serviced Office|FAQ: What is a Serviced Office, Why Choose CEO SUITE|FAQ: Why Choose CEO SUITE, Explore Private Offices|Direct: Private Office, FAQ Menu|CS: FAQ Menu",
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
      "ceo suite difference",
      "FAQ: Why Choose CEO SUITE"
    ],
    responseType: "options",
    response: "<b>Why choose CEO SUITE?</b><br/><br/>We’re Asia’s only one-stop Serviced Office Provider, run by multi-cultural industry experts. For more than 29 years, our predominantly female team have provided premium workplace solutions at reasonable rates, helping businesses of all sizes to expand throughout Asia with a minimum of culture shock.<br/><br/>Located in some of the most prestigious buildings in the Asia-Pacific region, we offer an unparalleled range of services, from sourcing the right local business partners to legal accounting, payroll and IT. We leverage our broad connections and experience to enable you to make an impact in a region where every city has its own regulations, culture and ways of conducting business. By joining one CEO SUITE location, you are supported at our premium locations across Asia.",
    options: "Our Centres & Locations|Locations: Select City, Business Support Services|Services: Business Support Overview, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: What is a Coworking Space",
    trainingPhrases: [
      "what is a co-working space, or shared office",
      "what is a coworking space, or shared office",
      "what is a coworking space",
      "what is a co-working space",
      "what is shared office",
      "apa itu coworking space",
      "do i need a co-working space",
      "do i need a coworking space",
      "why choose coworking",
      "FAQ: What is a Coworking Space"
    ],
    responseType: "options",
    response: "<b>What is a co-working space, or shared office?</b><br/><br/>In a nutshell, the term refers to a space that provides fully equipped and fully furnished workstations that are ready for use and perfect for entrepreneurs and freelancers who choose not to work from home, and/or branch office/s. Co-working spaces are offered at a much lower price than traditional working spaces and offer more flexibility with daily, weekly and monthly access. Facilities such as mail handling, telephone, internet and admin support can all be made available.<br/><br/><b>Do I need a co-working space?</b><br/>For many entrepreneurs, working from home can be a lonely experience. Co-working environments provide networking opportunities with other business owners and professional freelancers, resource sharing, and cost-effective flexibility to scale up or down without long-term commitments.",
    options: "Coworking vs Dedicated Desk|FAQ: Coworking vs Dedicated Desk, Explore Coworking|Direct: Coworking, Explore Dedicated Desk|Direct: Dedicated Workstation, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Coworking vs Dedicated Desk",
    trainingPhrases: [
      "what are the differences between standard co-working space and a dedicated workstation",
      "what are the differences between standard coworking space and a dedicated workstation",
      "what is the difference between standard coworking space and a dedicated workstation",
      "coworking vs dedicated workstation",
      "coworking vs dedicated desk",
      "hot desk vs dedicated desk",
      "perbedaan coworking dan dedicated desk",
      "FAQ: Coworking vs Dedicated Desk"
    ],
    responseType: "options",
    response: "<b>What are the differences between standard co-working space and a dedicated workstation?</b><br/><br/>• <b>Co-working Space:</b> Available by the day, week and month during office hours. A co-working client has access to either an unassigned work desk or workspace in a common area such as a business lounge with high-speed internet access.<br/>• <b>Dedicated Workstation:</b> Offers greater exclusivity, with <b>24/7 access</b> to their own assigned workspace, personal storage, and permanent setup.",
    options: "What is Coworking Space|FAQ: What is a Coworking Space, Dedicated Desk Details|Direct: Dedicated Workstation, Coworking Details|Direct: Coworking, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: What is a Virtual Office",
    trainingPhrases: [
      "what is a virtual office",
      "apa itu virtual office",
      "kantor virtual",
      "business address service",
      "how does virtual office work",
      "FAQ: What is a Virtual Office"
    ],
    responseType: "options",
    response: "<b>What is a virtual office?</b><br/><br/>A virtual office is a substitute for the traditional work environment, and delivers results through the web, telephone and other technologies. Virtual offices operate without any actual physical office space; all operations (whether internal or external business processes and communication) are performed via the Internet and phone lines. Employee(s) work remotely and perform daily office tasks with the use of software and application tools dependent on the Internet. Most virtual offices offer a prestigious business address for postal communication and secretarial support.",
    options: "Why Need Virtual Office|FAQ: Why Would I Need a Virtual Office, Company Registration FAQ|FAQ: Virtual Office Company Registration, Upgrade or Downgrade Plan|FAQ: Upgrade or Downgrade Plan, Explore Virtual Office|Direct: Virtual Office, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Why Would I Need a Virtual Office",
    trainingPhrases: [
      "why would i need a virtual office",
      "why do i need a virtual office",
      "kenapa butuh virtual office",
      "manfaat virtual office",
      "reasons for virtual office",
      "virtual office benefits",
      "FAQ: Why Would I Need a Virtual Office"
    ],
    responseType: "options",
    response: "<b>Why would I need a virtual office?</b><br/><br/>Although a virtual office is not a universal solution for every business, there are many good reasons why it makes sense to consider getting one:<br/><br/>• <b>Lean Start-ups:</b> Testing the waters with minimal capital. Establishing a virtual office gives you the advantage of a prestigious CBD business address to present to clients and prospects.<br/>• <b>SMEs:</b> Helps lower overheads by eliminating the cost of a physical office for small teams.<br/>• <b>International Expansion:</b> When exploring a new market across Asia, a virtual office provides an instant local presence with zero operational friction.",
    options: "Company Registration FAQ|FAQ: Virtual Office Company Registration, What is a Virtual Office|FAQ: What is a Virtual Office, Explore Virtual Office|Direct: Virtual Office, FAQ Menu|CS: FAQ Menu",
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
      "register business address",
      "Company Registration FAQ",
      "FAQ: Virtual Office Company Registration"
    ],
    responseType: "options",
    response: "<b>Can I use a Virtual Office for Company Registration?</b><br/><br/>Yes, in many jurisdictions CEO SUITE virtual office addresses can be utilized as a registered business address or domicile for company incorporation, subject to local statutory guidelines.<br/><br/>Our professional Corporate Services team also assists with company registration, licensing, tax registration, and legal compliance across Asia.",
    options: "Corporate Services|Services: Professional Services & Company Registration, Explore Virtual Office|Direct: Virtual Office, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Upgrade or Downgrade Plan",
    trainingPhrases: [
      "can i upgrade my virtual office to a serviced office with ceo suite",
      "can i upgrade my virtual office to a serviced office",
      "can i upgrade or downgrade my plan",
      "upgrade or downgrade plan",
      "package change & flexibility",
      "bisakah upgrade paket",
      "switch from virtual office to serviced office",
      "FAQ: Upgrade or Downgrade Plan"
    ],
    responseType: "options",
    response: "<b>Can I upgrade my virtual office to a serviced office with CEO SUITE?</b><br/><br/>Yes, you can. In fact, CEO SUITE welcomes upgrades and downgrades of your availed package. One of the things that separates us from our competitors is that our clients can customize their office solutions in accordance with their changing requirements.",
    options: "Speak to CS Agent|CS: Speak to Human Agent / Live Support, Billing & Payments|CS: Billing & Payment Overview, FAQ Menu|CS: FAQ Menu",
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
      "sewa ruang rapat",
      "FAQ: How to Book a Meeting Room"
    ],
    responseType: "options",
    response: "<b>How can I book a venue?</b><br/><br/>There are several different ways to book a venue with us:<br/>• <b>Online:</b> Via our booking portal at <a href='https://booking.ceosuite.com' target='_blank'>booking.ceosuite.com</a><br/>• <b>Phone or Email:</b> Contact our business center reception directly.<br/>• <b>WeChat:</b> (China locations only)<br/><br/><b>When making your booking, please tell us:</b><br/>• Your name and business name<br/>• Date and time of event<br/>• Number of participants<br/>• Equipment and setup requirements<br/>• Any other pertinent information regarding your event.",
    options: "Early Setup & After-Hours|FAQ: Early Setup & After-Hours Meeting, Meeting AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Event Staff & Catering|FAQ: Event Staffing & Meeting Assistance, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Early Setup & After-Hours Meeting",
    trainingPhrases: [
      "can i get access to the venue early to set-up",
      "can i get access to the venue early to setup",
      "can my event go beyond the business hours of your center",
      "can my event go beyond the business hours",
      "early setup meeting room",
      "after hours meeting",
      "meeting malam hari ac gedung",
      "setup time meeting room",
      "FAQ: Early Setup & After-Hours Meeting"
    ],
    responseType: "options",
    response: "<b>Venue Access: Early Setup & After-Hours Events:</b><br/><br/>• <b>Early Setup:</b> Yes, we extend a complimentary <b>30-minute leeway</b> for all clients. Beyond that, we charge a small one-time admin fee that varies for each center.<br/>• <b>After-Hours Events:</b> Yes. Please note that some of our centers are in buildings with centralized AC systems that automatically turn off after business hours, and additional charges may apply to turn on the AC.",
    options: "Meeting AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Catering & Outside Food Policy|FAQ: Catering & Outside Food Policy, Event Staff & Catering|FAQ: Event Staffing & Meeting Assistance, How to Book Meeting Room|FAQ: How to Book a Meeting Room, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Presentation Equipment & Technical Assistance",
    trainingPhrases: [
      "does ceo suite rent out presentation equipment",
      "do you provide technical assistance",
      "rent presentation equipment",
      "meeting room av & equipment",
      "presentation equipment & av",
      "sewa proyektor layar",
      "av equipment rental",
      "bantuan teknis meeting",
      "it specialist on site",
      "FAQ: Presentation Equipment & Technical Assistance"
    ],
    responseType: "options",
    response: "<b>Presentation Equipment & Technical Assistance:</b><br/><br/>• <b>Equipment Rental:</b> Yes, we have in-house presentation equipment available for rent (projectors, large screens, conference speakerphones, video conferencing).<br/>• <b>Technical Assistance:</b> Yes, we’ll help out in whatever way we can to make your event a success. Our IT specialists and/or office assistants can help in setting-up any presentation equipment.",
    options: "Wi-Fi & Internet Support|Facilities: Wi-Fi & Internet Connectivity, Event Staff & Catering|FAQ: Event Staffing & Meeting Assistance, Early Setup & After-Hours|FAQ: Early Setup & After-Hours Meeting, FAQ Menu|CS: FAQ Menu",
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
      "snack meeting",
      "FAQ: Catering & Outside Food Policy"
    ],
    responseType: "options",
    response: "<b>Catering Services & Outside Food Policy:</b><br/><br/>• <b>Catering Services:</b> Yes, we do. Once you get in touch with us, our manager can send you a list of food items and cuisines to choose from. If you would prefer food from a specific establishment, we can order it for you (a service charge on top of your food bill may be applicable).<br/>• <b>Outside Food & Beverages:</b> Yes, with applicable service and corkage fees depending on your food items and if you require assistance on food service or beverage refills.<br/>• <b>Lounge Refreshments:</b> Fresh fruit-infused water, gourmet coffee, and tea are always available.",
    options: "Event Staffing & Support|FAQ: Event Staffing & Meeting Assistance, Pantry & Refreshments|Facilities: Pantry & Refreshments, How to Book Meeting Room|FAQ: How to Book a Meeting Room, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },
  {
    name: "FAQ: Event Staffing & Meeting Assistance",
    trainingPhrases: [
      "are you able to provide staff for my event",
      "event staff",
      "can you provide waiters for meeting",
      "meeting minutes secretary",
      "staf untuk acara rapat",
      "notulensi rapat sekretaris",
      "office assistant event support",
      "FAQ: Event Staffing & Meeting Assistance"
    ],
    responseType: "options",
    response: "<b>Are you able to provide staff for my event?</b><br/><br/>• <b>Waiters:</b> You can request for waiters to be assigned to your event if you select a catering package.<br/>• <b>Office Assistants:</b> You can ask our office assistants for occasional tasks, but they can’t be assigned for the whole duration of the event as they need to attend to other clients within our business centers.<br/>• <b>Meeting Minutes:</b> You can also request for our secretaries to record minutes of the meeting on your behalf for a small fee.",
    options: "Catering & Outside Food|FAQ: Catering & Outside Food Policy, Meeting AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, How to Book Meeting Room|FAQ: How to Book a Meeting Room, FAQ Menu|CS: FAQ Menu",
    metadata: { category: "FAQ" }
  },

  // --- FACILITIES & OPERATIONAL SUPPORT ---
  {
    name: "Facilities: Wi-Fi & Internet Connectivity",
    trainingPhrases: [
      "is wired/wireless internet access available",
      "is wired wireless internet access available",
      "wi-fi access",
      "wi-fi & internet support",
      "internet speed",
      "cara koneksi wifi",
      "password wifi",
      "wired internet connection",
      "network support",
      "Facilities: Wi-Fi & Internet Connectivity"
    ],
    responseType: "options",
    response: "<b>Is wired/wireless internet access available?</b><br/><br/>Yes, all CEO SUITE facilities are equipped with both enterprise-grade wired Ethernet and high-speed secure wireless (Wi-Fi) internet access.<br/><br/>Dedicated private bandwidth, VLANs, static IPs, and server rack hosting are also available for enterprise members upon request. Our on-site IT team is available to assist.",
    options: "Building Access & Cards|Facilities: Building Access & Access Cards, Meeting AV & Equipment|FAQ: Presentation Equipment & Technical Assistance, Speak to CS Agent|CS: Speak to Human Agent / Live Support, FAQ Menu|CS: FAQ Menu",
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
