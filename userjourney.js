const centrePhotos = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=900&auto=format&fit=crop"
];

const cities = [
  {city:"Bangkok", region:"Thailand", centres:[
    {name:"Athenee Tower", address:"23rd Floor, 63 Wireless Road, Lumpini, Pathumwan, Bangkok 10330", photo:centrePhotos[0]}
  ]},
  {city:"Beijing", region:"China", centres:[
    {name:"Sunshine Financial Center", address:"31st Floor, No. 33 Jinghui Avenue, Chaoyang District, Beijing 100020", photo:centrePhotos[1]},
    {name:"The Exchange Twin Towers", address:"10th Floor, B-12 Jianguomenwai Avenue, Chaoyang District, Beijing 100022", photo:centrePhotos[2]}
  ]},
  {city:"Hangzhou", region:"China", centres:[
    {name:"Ping An Finance Center (Tower B)", address:"7th–9th Floor, 159 Jiangjin Road, Shangcheng District, Hangzhou 310020", photo:centrePhotos[0]}
  ]},
  {city:"Hanoi", region:"Vietnam", centres:[
    {name:"Lotte Center (East Tower)", address:"29th Floor, 54 Lieu Giai Street, Ba Dinh District, Hanoi 100000", photo:centrePhotos[3]}
  ]},
  {city:"Ho Chi Minh City", region:"Vietnam", centres:[
    {name:"Vietcombank Tower", address:"Level 21, 5 Me Linh Square, District 1, Ho Chi Minh City 70000", photo:centrePhotos[0]}
  ]},
  {city:"Hong Kong", region:"Hong Kong", centres:[
    {name:"Chinachem Tower", address:"Levels 5–7, 34–37 Connaught Road Central, Central", photo:centrePhotos[1]},
    {name:"K11 Atelier Victoria Dockside", address:"Level 7, 18 Salisbury Road, Tsim Sha Tsui", photo:centrePhotos[2]}
  ]},
  {city:"Jakarta", region:"Indonesia", centres:[
    {name:"Sahid Sudirman Center", address:"56th Floor, Jl. Jend. Sudirman No. 86, Jakarta 10220", photo:centrePhotos[0]},
    {name:"AXA Tower", address:"45th Floor, Jl. Prof. Dr. Satrio Kav. 18, Kuningan City, Jakarta 12940", photo:centrePhotos[1]},
    {name:"Indonesia Stock Exchange", address:"17th Floor, Jl. Jend. Sudirman Kav. 52-53, Jakarta 12190", photo:centrePhotos[2]},
    {name:"One Pacific Place", address:"15th Floor, Jl. Jend. Sudirman Kav. 52-53, Jakarta 12190", photo:centrePhotos[3]}
  ]},
  {city:"Kuala Lumpur", region:"Malaysia", centres:[
    {name:"Menara Maxis (26th Floor)", address:"26th Floor, KLCC, Kuala Lumpur 50088", photo:centrePhotos[0]},
    {name:"Axiata Tower", address:"27th Floor, Jalan Stesen Sentral 5, KL Sentral, Kuala Lumpur 50470", photo:centrePhotos[1]},
    {name:"Q Sentral (East Wing)", address:"Level 35-02, 2A Jalan Stesen Sentral 2, KL Sentral, Kuala Lumpur 50470", photo:centrePhotos[2]},
    {name:"Menara Maxis (36th Floor)", address:"36th Floor, KLCC, Kuala Lumpur 50088", photo:centrePhotos[3]}
  ]},
  {city:"Manila", region:"Philippines", centres:[
    {name:"LKG Tower", address:"37th Floor, 6801 Ayala Avenue, Makati City 1226", photo:centrePhotos[0]}
  ]},
  {city:"Seoul", region:"South Korea", centres:[
    {name:"Kyobo Building", address:"15th Floor, 1 Jongno, Jongno-gu, Seoul 03154", photo:centrePhotos[1]},
    {name:"Parnas Tower", address:"29th Floor, 521 Teheran-ro, Gangnam-gu, Seoul 06164", photo:centrePhotos[2]}
  ]},
  {city:"Shanghai", region:"China", centres:[
    {name:"Lujiazui Finance Plaza", address:"18th Floor, 826 Century Avenue, Pudong, Shanghai 200120", photo:centrePhotos[0]},
    {name:"Shanghai World Financial Center", address:"28th Floor, 100 Century Avenue, Pudong, Shanghai 200120", photo:centrePhotos[1]},
    {name:"Hong Kong New World Tower (K11)", address:"47th Floor, 300 Huaihai Zhong Road, Shanghai 200021", photo:centrePhotos[2]}
  ]},
  {city:"Singapore", region:"Singapore", centres:[
    {name:"Centennial Tower", address:"21st Floor, 3 Temasek Avenue, Singapore 039190", photo:centrePhotos[3]}
  ]}
];

const pricing = {
  "Beijing": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 450", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 200", period:"per 30 minutes"},
    video:{label:"Video Conferencing", price:"RMB 900", period:"per hour"}
  },
  "Shanghai": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 350", period:"per month"},
    meeting:{label:"Meeting Room", price:"RMB 300", period:"per 30 minutes"},
    video:{label:"Video Conferencing", price:"RMB 600", period:"per hour"}
  },
  "Hong Kong": {
    coworking:{label:"Coworking", price:"HKD 400", period:"per day", options:[
      {label:"Coworking Day Pass", price:"HKD 400", period:"per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"HKD 6,990", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from HKD 6,800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"HKD 584", period:"per month"},
    meeting:{label:"Meeting Room", price:"HKD 550", period:"per hour"}
  },
  "Jakarta": {
    coworking:{label:"Coworking", price:"IDR 150,000", period:"per day", options:[
      {label:"Coworking Day Pass", price:"IDR 150,000", period:"per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"IDR 1,900,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from IDR 2,500,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"IDR 250,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"IDR 200,000", period:"per hour"},
    video:{label:"Video Conferencing", price:"IDR 900,000", period:"per hour"}
  },
  "Kuala Lumpur": {
    coworking:{label:"Coworking", price:"MYR 50", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"MYR 50", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"MYR 933", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from MYR 933", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"MYR 150", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"MYR 150", period:"per hour"},
    video:{label:"Video Conferencing", price:"MYR 600", period:"per hour"}
  },
  "Bangkok": {
    coworking:{label:"Coworking", price:"THB 500", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"THB 500", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"THB 4,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from THB 6,500", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"THB 1,250", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"THB 1,050", period:"per hour"},
    video:{label:"Video Conferencing", price:"THB 6,000", period:"per hour"}
  },
  "Seoul": {
    coworking:{label:"Coworking", price:"KRW 50,000", period:"per day", options:[
      {label:"Coworking Day Pass", price:"KRW 50,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"KRW 450,000", period:"per person / per month"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"KRW 650,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from KRW 700,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"KRW 190,000", period:"per month"},
    meeting:{label:"Meeting Room", price:"KRW 60,000", period:"per hour"},
    video:{label:"Video Conferencing", price:"KRW 250,000", period:"per hour"}
  },
  "Ho Chi Minh City": {
    coworking:{label:"Coworking", price:"VND 600,000", period:"per workstation / per day", options:[
      {label:"Coworking Day Pass", price:"VND 600,000", period:"per workstation / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"VND 7,000,000", period:"per workstation / per month"},
    office:{label:"Private Office", price:"Starting from VND 8,000,000", period:"per workstation / per month"},
    virtual:{label:"Virtual Office", price:"VND 1,000,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"VND 850,000", period:"per hour"}
  },
  "Hanoi": {
    coworking:{label:"Coworking", price:"VND 700,000", period:"per day", options:[
      {label:"Coworking Day Pass", price:"VND 700,000", period:"per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"VND 5,000,000", period:"per workstation / per month"},
    office:{label:"Private Office", price:"Starting from VND 5,000,000", period:"per workstation / per month"},
    virtual:{label:"Virtual Office", price:"VND 1,000,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"VND 760,000", period:"per hour"}
  },
  "Manila": {
    coworking:{label:"Coworking", price:"PHP 500", period:"per day", options:[
      {label:"Coworking Day Pass", price:"PHP 500", period:"per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"PHP 10,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from PHP 11,800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"PHP 2,500", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"PHP 1,100", period:"per hour"}
  },
  "Singapore": {
    coworking:{label:"Coworking", price:"SGD 75", period:"per day", options:[
      {label:"Coworking Day Pass", price:"SGD 75", period:"per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"SGD 799", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from SGD 800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"SGD 54", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"SGD 100", period:"per hour"},
    video:{label:"Video Conferencing", price:"SGD 190", period:"per hour"}
  }
};

const centrePricing = {
  "Athenee Tower": {
    coworking:{label:"Coworking", price:"THB 500", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"THB 500", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"THB 4,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from THB 6,500", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"THB 1,250", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"THB 1,050", period:"per hour"}
  },
  "Sunshine Financial Center": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 450", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 200", period:"per 30 minutes"}
  },
  "The Exchange Twin Towers": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 450", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 200", period:"per 30 minutes"}
  },
  "Ping An Finance Center (Tower B)": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 1,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 900", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 350", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 100", period:"per 30 minutes"}
  },
  "Chinachem Tower": {
    coworking:{label:"Coworking", price:"HKD 350", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"HKD 350", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"HKD 5,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from HKD 4,500", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"HKD 380", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"HKD 380", period:"per hour"}
  },
  "K11 Atelier Victoria Dockside": {
    coworking:{label:"Coworking", price:"HKD 400", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"HKD 400", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"HKD 6,990", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from HKD 6,800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"HKD 584", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"HKD 550", period:"per hour"}
  },
  "Lujiazui Finance Plaza": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 350", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 300", period:"per 30 minutes"}
  },
  "Shanghai World Financial Center": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 2,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 2,500", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 450", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 210", period:"per 30 minutes"}
  },
  "Hong Kong New World Tower (K11)": {
    coworking:{label:"Coworking", price:"RMB 99", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"RMB 99", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"RMB 1,500", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from RMB 1,500", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"RMB 350", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"RMB 75", period:"per 30 minutes"}
  },
  "Sahid Sudirman Center": {
    coworking:{label:"Coworking", price:"IDR 150,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"IDR 150,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"IDR 1,900,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from IDR 2,500,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"IDR 250,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"IDR 200,000", period:"per hour"}
  },
  "AXA Tower": {
    coworking:{label:"Coworking", price:"IDR 150,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"IDR 150,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"IDR 1,900,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from IDR 2,500,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"IDR 250,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"IDR 200,000", period:"per hour"}
  },
  "Indonesia Stock Exchange": {
    coworking:{label:"Coworking", price:"IDR 150,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"IDR 150,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"IDR 2,500,000", period:"per desk / per month"},
    virtual:{label:"Virtual Office", price:"IDR 250,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"IDR 200,000", period:"per hour"}
  },
  "One Pacific Place": {
    coworking:{label:"Coworking", price:"IDR 150,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"IDR 150,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"IDR 2,500,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from IDR 3,000,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"IDR 250,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"IDR 200,000", period:"per hour"}
  },
  "Kyobo Building": {
    coworking:{label:"Coworking", price:"KRW 50,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"KRW 50,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"KRW 450,000", period:"per person / per month"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"KRW 650,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from KRW 700,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"KRW 190,000", period:"per month"},
    meeting:{label:"Meeting Room", price:"KRW 60,000", period:"per hour"}
  },
  "Parnas Tower": {
    coworking:{label:"Coworking", price:"KRW 50,000", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"KRW 50,000", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"KRW 450,000", period:"per person / per month"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"KRW 650,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from KRW 700,000", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"KRW 190,000", period:"per month"},
    meeting:{label:"Meeting Room", price:"KRW 60,000", period:"per hour"}
  },
  "Menara Maxis (26th Floor)": {
    coworking:{label:"Coworking", price:"MYR 50", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"MYR 50", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"MYR 933", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from MYR 933", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"MYR 150", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"MYR 150", period:"per hour"}
  },
  "Menara Maxis (36th Floor)": {
    coworking:{label:"Coworking", price:"MYR 50", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"MYR 50", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"MYR 933", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from MYR 933", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"MYR 150", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"MYR 150", period:"per hour"}
  },
  "Axiata Tower": {
    coworking:{label:"Coworking", price:"MYR 50", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"MYR 50", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"MYR 933", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from MYR 933", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"MYR 150", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"MYR 150", period:"per hour"}
  },
  "Q Sentral (East Wing)": {
    coworking:{label:"Coworking", price:"MYR 50", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"MYR 50", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"MYR 933", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from MYR 933", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"MYR 150", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"MYR 150", period:"per hour"}
  },
  "LKG Tower": {
    coworking:{label:"Coworking", price:"PHP 500", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"PHP 500", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"PHP 10,000", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from PHP 11,800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"PHP 2,500", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"PHP 1,100", period:"per hour"}
  },
  "Centennial Tower": {
    coworking:{label:"Coworking", price:"SGD 75", period:"per person / per day", options:[
      {label:"Coworking Day Pass", price:"SGD 75", period:"per person / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"SGD 799", period:"per desk / per month"},
    office:{label:"Private Office", price:"Starting from SGD 800", period:"per person / per month"},
    virtual:{label:"Virtual Office", price:"SGD 54", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"SGD 100", period:"per hour"}
  },
  "Lotte Center (East Tower)": {
    coworking:{label:"Coworking", price:"VND 700,000", period:"per workstation / per day", options:[
      {label:"Coworking Day Pass", price:"VND 700,000", period:"per workstation / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"VND 5,000,000", period:"per workstation / per month"},
    office:{label:"Private Office", price:"Starting from VND 5,000,000", period:"per workstation / per month"},
    virtual:{label:"Virtual Office", price:"VND 1,000,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"VND 760,000", period:"per hour"}
  },
  "Vietcombank Tower": {
    coworking:{label:"Coworking", price:"VND 600,000", period:"per workstation / per day", options:[
      {label:"Coworking Day Pass", price:"VND 600,000", period:"per workstation / per day"},
      {label:"Coworking Monthly Pass", price:"x.xxx", period:"placeholder price"}
    ]},
    dedicated:{label:"Dedicated Workstation", price:"VND 7,000,000", period:"per workstation / per month"},
    office:{label:"Private Office", price:"Starting from VND 8,000,000", period:"per workstation / per month"},
    virtual:{label:"Virtual Office", price:"VND 1,000,000", period:"per month, billed annually"},
    meeting:{label:"Meeting Room", price:"VND 850,000", period:"per hour"}
  }
};

const centreContacts = {
  "Athenee Tower":["+66 (2) 126 8000", "+66 83 067 8870"],
  "Sunshine Financial Center":["+86 (10) 8660 8888"],
  "The Exchange Twin Towers":["+86 (10) 8660 8888"],
  "Ping An Finance Center (Tower B)":["+86 21 2052 0666"],
  "Chinachem Tower":["+852 3166 6166", "+852 6795 3268"],
  "K11 Atelier Victoria Dockside":["+852 3166 6166", "+852 6086 6673"],
  "Lujiazui Finance Plaza":["+86 (21) 5116 5116"],
  "Shanghai World Financial Center":["+86 (21) 2052 0666"],
  "Hong Kong New World Tower (K11)":["+86 (21) 5116 2888"],
  "Sahid Sudirman Center":["+62 (21) 8063 1888", "+62 8111 50 836"],
  "AXA Tower":["+62 (21) 3005 3500", "+62 8111 50 894"],
  "Indonesia Stock Exchange":["+62 (21) 515 7777", "+62 8111 50 857"],
  "One Pacific Place":["+62 (21) 2550 2550", "+62 8111 50 849"],
  "Kyobo Building":["+82 (2) 2010 8888", "+82 10 7445 8807"],
  "Parnas Tower":["+82 (2) 2097 8288", "+82 10 7445 8807"],
  "Menara Maxis (26th Floor)":["+60 (3) 2615 2688", "+60 (12) 360 6982"],
  "Menara Maxis (36th Floor)":["+60 3 2615 0000", "+60 (12) 360 6982"],
  "Axiata Tower":["+60 (3) 2776 6888", "+60 (12) 360 8913"],
  "Q Sentral (East Wing)":["+60 (3) 2731 9388", "+60 (12) 360 7089"],
  "LKG Tower":["+63 (2) 8859 2888", "+63 93 9932 7673"],
  "Centennial Tower":["+65 6829 7000", "+65 9182 9667"],
  "Lotte Center (East Tower)":["+84 (24) 3267 3999", "+84 83 878 8999"],
  "Vietcombank Tower":["+84 (28) 3827 1988", "+84 83 704 8668"]
};

let state = {
  service:null,
  city:null,
  centre:null,
  package:null
};

const serviceLabels = {
  office:"Private Office",
  dedicated:"Dedicated Workstation",
  coworking:"Coworking",
  virtual:"Virtual Office",
  meeting:"Meeting Room",
  dayOffice:"Day Office"
};

const serviceRecommendations = {
  office:"Best for teams that need a private, ready-to-use office with flexible terms.",
  dedicated:"Best for individuals or small teams who want a regular desk without taking a full office.",
  coworking:"Best for flexible access, short visits, or occasional workdays in the city.",
  virtual:"Best for a business address, mail handling, and local presence without a physical desk.",
  meeting:"Best for client meetings, interviews, board meetings, and short room bookings.",
  dayOffice:"Best when you need a private office for a day or short-term use."
};

const guidedNeeds = {
  team:{label:"Space for my team", service:"office"},
  desk:{label:"A regular desk", service:"dedicated"},
  flexible:{label:"Occasional workspace", service:"coworking"},
  address:{label:"Business address", service:"virtual"},
  room:{label:"Meeting room", service:"meeting"},
  dayOffice:{label:"Private office for a day", service:"dayOffice"}
};

const virtualPackages = [
  {
    id:"mail-starter",
    label:"Mail-starter",
    bestFor:"A business address and mail handling only.",
    features:["Business address", "Mail receipt", "Good for lean local presence"],
    ecommerceUrl:"#"
  },
  {
    id:"tel-starter",
    label:"Tel-starter",
    bestFor:"A local telephone presence without a full virtual office package.",
    features:["Dedicated phone support", "Call handling", "Good for sales enquiries"],
    ecommerceUrl:"#"
  },
  {
    id:"virtual-office",
    label:"Virtual Office",
    bestFor:"The balanced package for address, mail, and business presence.",
    features:["Business address", "Mail handling", "Telephone presence", "Most common choice"],
    ecommerceUrl:"#"
  },
  {
    id:"international-vo",
    label:"International VO",
    bestFor:"Companies needing a broader regional or international presence.",
    features:["International presence", "Multi-market support", "Best for regional expansion"],
    ecommerceUrl:"#"
  }
];

const quoteOnly = ["office", "dedicated", "dayOffice"];
const onlineSignup = ["coworking", "virtual", "meeting"];

const chat = document.getElementById("chat");

function centreName(centre){
  return typeof centre === "string" ? centre : centre.name;
}

function getPricingData(){
  if(state.service === "dayOffice"){
    return {label:"Day Office", price:"x.xxx", period:"placeholder price"};
  }

  const centreData = state.centre && centrePricing[state.centre] && centrePricing[state.centre][state.service];
  const cityData = pricing[state.city] && pricing[state.city][state.service];
  return centreData || cityData;
}

function getPricingEntries(){
  const data = getPricingData();
  if(!data) return [];
  return data.options || [data];
}

function formatPricingEntries(entries){
  return entries.map(entry=>`${entry.label}: ${entry.price} ${entry.period}`).join("; ");
}

function getVirtualEntryPrice(){
  return getPricingData() || {label:"Virtual Office", price:"x.xxx", period:"per month, billed annually"};
}

function getVirtualPackagePrice(pkg){
  const entryPrice = getVirtualEntryPrice();
  if(pkg.id === "mail-starter" || pkg.id === "tel-starter"){
    return entryPrice.price;
  }
  return "x.xxx";
}

function getVirtualPackagePeriod(pkg){
  if(pkg.id === "mail-starter" || pkg.id === "tel-starter"){
    return "per month (billed annually)";
  }
  return "placeholder price";
}

function getVirtualPackageNote(){
  const entryPrice = getVirtualEntryPrice();
  const currency = entryPrice.price.split(" ")[0] || "";
  const amount = entryPrice.price.replace(currency, "").trim();
  const numeric = Number(amount.replace(/,/g, ""));
  const standard = Number.isFinite(numeric) && numeric > 0 ? `${currency} ${(numeric * 2).toLocaleString("en-US")}` : `${currency} x.xxx`;
  const saving = Number.isFinite(numeric) && numeric > 0 ? `${currency} ${(numeric * 12).toLocaleString("en-US")}` : `${currency} x.xxx`;

  return `Virtual Office 50% discount applies when 12 months are prepaid upfront. Non-prepayment price starts from ${standard} per month. PER MONTH (Billed Annually). You save ${saving} per year.`;
}

function getPricingFootnote(){
  const entryPrice = getPricingData();
  const currencyMap = {
    THB:"Thai Baht (THB)",
    RMB:"RMB",
    HKD:"Hong Kong Dollars (HKD)",
    IDR:"Indonesian Rupiah (IDR)",
    MYR:"Malaysia Ringgit (MYR)",
    KRW:"Korean Won (KRW)",
    VND:"Vietnamese Dong (VND)",
    PHP:"Philippine Peso (PHP)",
    SGD:"Singapore Dollar (SGD)"
  };
  const priceText = entryPrice && entryPrice.price ? entryPrice.price : "";
  const code = Object.keys(currencyMap).find(currencyCode=>priceText.includes(currencyCode)) || "";
  const currency = currencyMap[code] || code || "local currency";
  const tax = code === "THB" ? "VAT" : "applicable taxes";

  return `Starting prices vary depending on package, location and/or ongoing promotion. All prices are in ${currency} and exclusive of ${tax}.`;
}

function escapeText(value){
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function addMessage(text, who="bot"){
  const div = document.createElement("div");
  div.className = "message " + who;
  if(who === "user"){
    div.textContent = text;
  } else {
    div.innerHTML = text;
  }
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function addOptions(options){
  const wrap = document.createElement("div");
  wrap.className = "options";
  options.forEach(o=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option" + (o.variant ? " " + o.variant : "");
    btn.innerText = o.label;
    btn.onclick = o.action;
    wrap.appendChild(btn);
  });
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function restart(){
  state = {service:null, city:null, centre:null, package:null};
  chat.innerHTML = "";
  addMessage("Hello, I’m Claire from CEO SUITE. What are you looking for today?");
  addOptions([
    {label:"Help me choose", action:helpMeChoose, variant:"primary-choice"},
    {label:"Private Office", action:()=>chooseService("office")},
    {label:"Day Office", action:()=>chooseService("dayOffice")},
    {label:"Dedicated Workstation", action:()=>chooseService("dedicated")},
    {label:"Coworking", action:()=>chooseService("coworking")},
    {label:"Virtual Office", action:()=>chooseService("virtual")},
    {label:"Meeting Room", action:()=>chooseService("meeting")},
    {label:"I have other questions", action:questionFlow, variant:"secondary-choice"}
  ]);
}

function helpMeChoose(){
  addMessage("Help me choose", "user");
  addMessage("Sure. Which need sounds closest?");
  addOptions(Object.keys(guidedNeeds).map(key=>({
    label:guidedNeeds[key].label,
    action:()=>chooseNeed(key),
    variant:"primary-choice"
  })));
}

function chooseNeed(key){
  const need = guidedNeeds[key];
  addMessage(need.label, "user");
  addMessage(`I recommend ${serviceLabels[need.service]}. ${serviceRecommendations[need.service]}`);
  chooseService(need.service, true);
}

function chooseService(service, guided=false){
  state.service = service;
  if(!guided){
    addMessage(serviceLabels[service], "user");
    addMessage(serviceRecommendations[service]);
  }
  addMessage("Which city are you interested in?");
  addOptions(cities.map(c=>({label:c.city, action:()=>chooseCity(c.city)})));
}

function chooseCity(city, silent=false){
  state.city = city;
  if(!silent) addMessage(city, "user");
  const cityData = cities.find(c=>c.city === city);
  if(!cityData || cityData.centres.length <= 1){
    state.centre = cityData ? centreName(cityData.centres[0]) : city;
    showPricing();
  }else{
    addMessage("Please choose a centre, or select “Not sure yet” and I can help narrow it down.");
    showCentreSelection(cityData);
  }
}

function chooseCentre(centre){
  state.centre = centreName(centre);
  addMessage(state.centre, "user");
  showPricing();
}

function showCentreSelection(cityData){
  const wrap = document.createElement("div");
  wrap.className = "centre-list";

  cityData.centres.forEach(centre=>{
    const card = document.createElement("div");
    card.className = "centre-card";
    card.innerHTML = `
      <div class="centre-photo" style="background-image:url('${centre.photo || ""}')"></div>
      <div class="centre-content">
        <div class="card-title">${centreName(centre)}</div>
        ${centre.address ? `<div class="small">${centre.address}</div>` : ""}
        <button class="submit-btn centre-select" type="button">Select this centre</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", ()=>chooseCentre(centre));
    wrap.appendChild(card);
  });

  const unsure = document.createElement("button");
  unsure.className = "option secondary-choice";
  unsure.type = "button";
  unsure.innerText = "Not sure yet";
  unsure.addEventListener("click", recommendCentre);
  wrap.appendChild(unsure);

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function recommendCentre(){
  addMessage("Not sure yet", "user");
  state.centre = null;
  addMessage("No problem. A few quick questions can help narrow the centre choices. Which sounds closest?");
  addOptions(getLocationDecisionOptions().concat([
    {label:"I have other questions", action:questionFlow, variant:"secondary-choice"},
    {label:"Show all centres", action:()=>chooseCity(state.city, true)}
  ]));
}

function getLocationDecisionOptions(){
  const cityOptions = {
    "Shanghai":[
      {label:"Pudong / Lujiazui", centres:["Lujiazui Finance Plaza", "Shanghai World Financial Center"]},
      {label:"Puxi", centres:["Hong Kong New World Tower (K11)"]}
    ],
    "Hong Kong":[
      {label:"Central Hong Kong", centres:["Chinachem Tower"]},
      {label:"Tsim Sha Tsui", centres:["K11 Atelier Victoria Dockside"]}
    ],
    "Jakarta":[
      {label:"Sudirman / SCBD", centres:["Sahid Sudirman Center", "Indonesia Stock Exchange", "One Pacific Place"]},
      {label:"Kuningan", centres:["AXA Tower"]}
    ],
    "Kuala Lumpur":[
      {label:"KLCC", centres:["Menara Maxis (26th Floor)", "Menara Maxis (36th Floor)"]},
      {label:"KL Sentral", centres:["Axiata Tower", "Q Sentral (East Wing)"]}
    ],
    "Seoul":[
      {label:"Jongno", centres:["Kyobo Building"]},
      {label:"Gangnam", centres:["Parnas Tower"]}
    ],
    "Beijing":[
      {label:"Jinghui Avenue / Financial Center", centres:["Sunshine Financial Center"]},
      {label:"Jianguomenwai / Twin Towers", centres:["The Exchange Twin Towers"]}
    ]
  };

  const areaOptions = (cityOptions[state.city] || []).map(option=>({
    label:option.label,
    action:()=>locationAreaPreference(option.label, option.centres),
    variant:"primary-choice"
  }));

  return areaOptions;
}

function locationAreaPreference(label, centreNames){
  addMessage(label, "user");
  const cityData = cities.find(c=>c.city === state.city);
  const matchingCentres = cityData ? cityData.centres.filter(centre=>centreNames.includes(centreName(centre))) : [];
  addMessage(`Thanks. Here are the ${label} centre options for ${state.city}.`);
  showCentreCards(matchingCentres.length ? matchingCentres : (cityData ? cityData.centres : []));
}

function showCentreCards(centresToShow){
  const wrap = document.createElement("div");
  wrap.className = "centre-list";

  centresToShow.forEach(centre=>{
    const card = document.createElement("div");
    card.className = "centre-card";
    card.innerHTML = `
      <div class="centre-photo" style="background-image:url('${centre.photo || ""}')"></div>
      <div class="centre-content">
        <div class="card-title">${centreName(centre)}</div>
        ${centre.address ? `<div class="small">${centre.address}</div>` : ""}
        <button class="submit-btn centre-select" type="button">Select this centre</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", ()=>chooseCentre(centre));
    wrap.appendChild(card);
  });

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function showPricing(){
  if(state.service === "virtual" && !state.package){
    showVirtualPackages();
    return;
  }

  const data = getPricingData();
  if(!data){
    addMessage("Pricing is not available for this selection yet. I can still help submit your enquiry.");
    showActions();
    return;
  }

  const centreText = state.centre ? `<div class="small">Centre: ${state.centre}</div>` : "";
  const pricingEntries = getPricingEntries();
  const virtualNote = state.service === "virtual" ? `<div class="notice">${getVirtualPackageNote()}</div>` : "";
  const pricingFootnote = `<div class="small">${getPricingFootnote()}</div>`;
  const card = document.createElement("div");
  card.className = "card";
  const priceBody = state.package ? `
    <div class="price">${getVirtualPackagePrice(state.package)}</div>
    <div class="small">${getVirtualPackagePeriod(state.package)}</div>
    <div class="notice">${state.package.bestFor}</div>
  ` : pricingEntries.length === 1 ? `
    <div class="price">${pricingEntries[0].price}</div>
    <div class="small">${pricingEntries[0].period}</div>
  ` : pricingEntries.map(entry=>`
    <div class="price-option">
      <div class="card-title">${entry.label}</div>
      <div class="price">${entry.price}</div>
      <div class="small">${entry.period}</div>
    </div>
  `).join("");
  card.innerHTML = `
    <div class="card-title">${state.package ? state.package.label : data.label} in ${state.city}</div>
    ${centreText}
    ${priceBody}
    ${virtualNote}
    ${quoteOnly.includes(state.service) ? 
      `<div class="notice">This service requires a quotation because availability, setup, layout, and contract terms may vary.</div>` :
      `<div class="notice">This service can be continued online, subject to availability and confirmation.</div>`
    }
    ${pricingFootnote}
    <div class="cta-note">Next, you can continue with the recommended action or ask a question before submitting your details.</div>
  `;
  chat.appendChild(card);
  showActions();
  chat.scrollTop = chat.scrollHeight;
}

function showVirtualPackages(){
  addMessage("Which virtual office package best matches what you need?");

  const wrap = document.createElement("div");
  wrap.className = "package-list";

  virtualPackages.forEach(pkg=>{
    const packagePrice = getVirtualPackagePrice(pkg);
    const packagePeriod = getVirtualPackagePeriod(pkg);
    const card = document.createElement("div");
    card.className = "package-card";
    card.innerHTML = `
      <div class="card-title">${pkg.label}</div>
      <div class="price">${packagePrice}</div>
      <div class="small">${packagePeriod}</div>
      <div class="small">${pkg.bestFor}</div>
      <div class="notice">${getVirtualPackageNote()}</div>
      <ul class="feature-list">
        ${pkg.features.map(feature=>`<li>${feature}</li>`).join("")}
      </ul>
      <button class="submit-btn package-select" type="button">Select package</button>
    `;
    card.querySelector("button").addEventListener("click", ()=>chooseVirtualPackage(pkg));
    wrap.appendChild(card);
  });

  const unsure = document.createElement("button");
  unsure.className = "option secondary-choice";
  unsure.type = "button";
  unsure.innerText = "Not sure yet";
  unsure.addEventListener("click", unsureVirtualPackage);
  wrap.appendChild(unsure);

  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function chooseVirtualPackage(pkg){
  state.package = pkg;
  addMessage(pkg.label, "user");
  showPricing();
}

function unsureVirtualPackage(){
  const recommended = virtualPackages[0];
  state.package = recommended;
  addMessage("Not sure yet", "user");
  addMessage("No problem. Mail-starter is usually a good place to start if you mainly need a business address and mail handling. Is it okay to continue with this package?");
  addOptions([
    {label:"OK, continue", action:()=>showPricing(), variant:"primary-choice"},
    {label:"Choose another package", action:showVirtualPackages},
    {label:"I have other questions", action:questionFlow, variant:"secondary-choice"}
  ]);
}

function showActions(){
  const opts = [];

  if(quoteOnly.includes(state.service)){
    opts.push({label:"Request quotation", action:()=>showForm("quotation"), variant:"primary-choice"});
  }

  if(onlineSignup.includes(state.service)){
    opts.push({
      label:state.service === "meeting" ? "Book online" : "Sign up online",
      action:state.service === "virtual" ? continueVirtualEcommerce : ()=>showForm("signup"),
      variant:"primary-choice"
    });
  }

  opts.push(
    {label:"Book a tour", action:()=>showForm("tour")},
    {label:"I have other questions", action:questionFlow, variant:"secondary-choice"},
    {label:"Start again", action:restart, variant:"secondary-choice"}
  );

  addOptions(opts);
}

function continueVirtualEcommerce(){
  addMessage("Sign up online", "user");
  addMessage(`Great. In the live version, this would take you to the secure checkout for ${state.package.label} at ${state.centre || state.city}.`);
  addOptions([
    {label:"I have other questions", action:questionFlow},
    {label:"Start again", action:restart}
  ]);
}

function showForm(type){
  const labels = {
    quotation:"Request quotation",
    signup:state.service === "meeting" ? "Book online" : "Sign up online",
    tour:"Book a tour"
  };
  addMessage(labels[type], "user");

  const data = getPricingData();
  const selectedService = state.package ? state.package.label : (data ? data.label : (serviceLabels[state.service] || ""));
  const selectedPrice = state.package ? `${getVirtualPackagePrice(state.package)} ${getVirtualPackagePeriod(state.package)}` : (data ? formatPricingEntries(getPricingEntries()) : "");

  const form = document.createElement("div");
  form.className = "form-card";

  if(type === "quotation"){
    form.innerHTML = `
      <div class="card-title">Request quotation</div>
      <div class="small">Selected: ${selectedService} • ${state.city}${state.centre ? " • " + state.centre : ""}</div>
      <div class="notice">Our team will review availability and follow up with quotation details.</div>
      <label>Name <span class="required">*</span></label>
      <input placeholder="Your full name" required>
      <label>Email <span class="required">*</span></label>
      <input type="email" placeholder="your@email.com" required>
      <label>Contact number <span class="required">*</span></label>
      <input placeholder="+65 ..." required>
      <div class="form-grid">
        <div>
          <label>Team size</label>
          <input placeholder="e.g. 3 pax">
        </div>
        <div>
          <label>Move-in date</label>
          <input type="date">
        </div>
      </div>
      <label>Requirements</label>
      <textarea placeholder="Tell us about your budget, preferred move-in date, lease term, or any special requirements."></textarea>
      <button class="submit-btn" type="button" onclick="submitForm('quotation')">Submit quotation request</button>
    `;
  } else if(type === "tour"){
    form.innerHTML = `
      <div class="card-title">Book a tour</div>
      <div class="small">Selected: ${selectedService} • ${state.city}${state.centre ? " • " + state.centre : ""}</div>
      <div class="notice">Choose your preferred slot and our team will confirm availability.</div>
      <label>Name <span class="required">*</span></label>
      <input placeholder="Your full name" required>
      <label>Email <span class="required">*</span></label>
      <input type="email" placeholder="your@email.com" required>
      <label>Contact number <span class="required">*</span></label>
      <input placeholder="+65 ..." required>
      <div class="form-grid">
        <div>
          <label>Preferred date</label>
          <input type="date">
        </div>
        <div>
          <label>Preferred time</label>
          <input type="time">
        </div>
      </div>
      <label>Remarks</label>
      <textarea placeholder="Any specific workspace you would like to view?"></textarea>
      <button class="submit-btn" type="button" onclick="submitForm('tour')">Submit tour request</button>
    `;
  } else {
    const signupTitle = state.service === "meeting" ? "Book online" : "Sign up online";
    const signupButton = state.service === "meeting" ? "Book online" : "Sign up online";
    form.innerHTML = `
      <div class="card-title">${signupTitle}</div>
      <div class="small">Selected: ${selectedService} • ${state.city}${state.centre ? " • " + state.centre : ""}</div>
      <div class="notice">Indicative price: ${selectedPrice}. Final confirmation is subject to availability and applicable terms.</div>
      <label>Name <span class="required">*</span></label>
      <input placeholder="Your full name" required>
      <label>Email <span class="required">*</span></label>
      <input type="email" placeholder="your@email.com" required>
      <label>Contact number <span class="required">*</span></label>
      <input placeholder="+65 ..." required>
      <label>Start date</label>
      <input type="date">
      <label>Billing / company name</label>
      <input placeholder="Individual or company name">
      <button class="submit-btn" type="button" onclick="submitForm('signup')">${signupButton}</button>
    `;
  }

  chat.appendChild(form);
  chat.scrollTop = chat.scrollHeight;
}

function submitForm(type){
  const messages = {
    quotation:"Thanks. Your quotation request has been captured. In the live version, this will be sent to the sales team and logged in CRM.",
    tour:"Thanks. Your tour request has been captured. In the live version, the team will confirm the available appointment slot.",
    signup:state.service === "meeting" ?
      "Thanks. In the live version, you would now continue to the meeting room booking and payment / confirmation page." :
      state.service === "virtual" ?
      "Thanks. In the live version, you would now continue to secure checkout for this virtual office package." :
      "Thanks. In the live version, you would now continue to the online sign-up and payment / confirmation page."
  };
  addMessage(messages[type]);
  addOptions([
    {label:"I have other questions", action:questionFlow},
    {label:"Start again", action:restart}
  ]);
}

function questionFlow(){
  addMessage("I have other questions", "user");
  addMessage("Sure. Type your question below and I’ll try to answer it here first.");
  addOptions([
    {label:"Start again", action:restart, variant:"secondary-choice"}
  ]);
}

function promptAnotherQuestion(){
  addMessage("Type your follow-up question below and I’ll try to answer it here first.");
}

function aiAnswerSatisfied(){
  addMessage("Yes, this answers my question", "user");
  addMessage("Glad I could help. You can continue from where you left off, or start again.");
  const opts = [];
  if(state.service && (state.city || state.service === "dayOffice")){
    opts.push({label:"Continue current journey", action:showActions, variant:"primary-choice"});
  }
  opts.push({label:"Start again", action:restart, variant:"secondary-choice"});
  addOptions(opts);
}

function showAIFollowupOptions(){
  addMessage("Does this answer your question? If you have a follow-up, you can type it below.");
  addOptions([
    {label:"Yes, this answers my question", action:aiAnswerSatisfied, variant:"primary-choice"},
    {label:"Speak to our team", action:humanEscalation, variant:"secondary-choice"}
  ]);
}

function humanEscalation(){
  addMessage("Speak to our team", "user");
  const form = document.createElement("div");
  form.className = "form-card";
  form.innerHTML = `
    <div class="card-title">Speak to our team</div>
    <div class="notice">Our team is not available 24/7. Please share your details and question so the right person can follow up during business hours.</div>
    <label>Name <span class="required">*</span></label>
    <input class="human-name" placeholder="Your full name" required>
    <label>Email <span class="required">*</span></label>
    <input class="human-email" type="email" placeholder="your@email.com" required>
    <label>Contact number <span class="required">*</span></label>
    <input class="human-phone" placeholder="+65 ..." required>
    <label>Your question <span class="required">*</span></label>
    <textarea class="human-question" placeholder="Please write your question or request." required></textarea>
    <button class="submit-btn" type="button" onclick="submitHuman(this)">Send to human agent</button>
  `;
  chat.appendChild(form);
  chat.scrollTop = chat.scrollHeight;
}

function submitHuman(button){
  const form = button.closest(".form-card");
  const fields = [
    form.querySelector(".human-name"),
    form.querySelector(".human-email"),
    form.querySelector(".human-phone"),
    form.querySelector(".human-question")
  ];
  const missing = fields.some(field=>!field.value.trim());

  if(missing){
    addMessage("Please complete your name, email, contact number, and question so I can connect you to the right team member.");
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";
  addMessage("I’ve shared my details. Please send this to a human agent.", "user");
  showHumanTransfer(fields[0].value.trim(), fields[3].value.trim());
}

function showHumanTransfer(name, question){
  const transfer = document.createElement("div");
  transfer.className = "handoff-card";
  transfer.innerHTML = `
    <div class="handoff-status">Sending to human agent</div>
    <div class="handoff-row active"><span></span>Sharing your contact details</div>
    <div class="handoff-row active"><span></span>Sending your question to the team</div>
    <div class="handoff-row"><span></span>Queueing for business-hours follow-up</div>
  `;
  chat.appendChild(transfer);
  chat.scrollTop = chat.scrollHeight;

  window.setTimeout(()=>{
    const rows = transfer.querySelectorAll(".handoff-row");
    rows[2].classList.add("active");
    chat.scrollTop = chat.scrollHeight;
  }, 700);

  window.setTimeout(()=>{
    addMessage(`Thanks ${escapeText(name || "there")}. Your question has been shared with the CEO SUITE team: "${escapeText(question)}". In the live version, the team would follow up during business hours.`);
    addOptions([
      {label:"I have other questions", action:promptAnotherQuestion},
      {label:"Start again", action:restart}
    ]);
  }, 1400);
}

function getAIResponse(question){
  const text = question.toLowerCase();
  const data = getPricingData();
  const place = state.centre || state.city || "your selected location";

  if(text.includes("price") || text.includes("pricing") || text.includes("cost") || text.includes("rate")){
    if(data){
      return `For ${data.label} in ${place}, the indicative pricing shown here is ${formatPricingEntries(getPricingEntries())}. Starting prices can vary by package, location, term, availability, and promotion.`;
    }
    return "Pricing depends on the service, city, and centre. Choose a service and location first and I can show the relevant indicative pricing where it is available.";
  }

  if(text.includes("location") || text.includes("centre") || text.includes("center") || text.includes("where")){
    if(state.city){
      const cityData = cities.find(c=>c.city === state.city);
      const centres = cityData ? cityData.centres.map(centre=>centreName(centre)).join(", ") : place;
      return `${state.city} centre options include ${centres}. If you are unsure which one to choose, use the area options or select Show all centres to compare them.`;
    }
    return "Start by choosing your preferred city. If that city has multiple centres, I can show the centre options and any clear area-based choices.";
  }

  if(text.includes("term") || text.includes("contract") || text.includes("agreement") || text.includes("lease")){
    return "Terms can vary by service, centre, package, and contract type. For online sign-up, key terms should be shown before confirmation. For quotation-based services, terms are normally confirmed in the quotation and agreement stage.";
  }

  if(text.includes("available") || text.includes("availability") || text.includes("move") || text.includes("date")){
    return "Availability depends on the centre, service type, and requested date. For quotation-based services, submit a quotation request with your preferred move-in date so the team can confirm options.";
  }

  return "Placeholder AI response: in the live chatbot, this answer will be generated from the AI training data and approved knowledge base, using the selected service and location context where available.";
}

function askAI(){
  const input = document.getElementById("freeText");
  const val = input.value.trim();
  if(!val) return;
  addMessage(val, "user");
  input.value = "";
  addMessage(getAIResponse(val));
  showAIFollowupOptions();
}

document.getElementById("freeText").addEventListener("keydown", event=>{
  if(event.key === "Enter"){
    askAI();
  }
});

restart();
