'use strict';
// Cennik, presety, ikony — klasyczny skrypt (var/function = global)
var NAPRAWA_SERVICES = [
  { id: 'drobne', label: 'Drobne naprawy', price: 50 },
  { id: 'przygotowanie', label: 'Przygotowanie', price: 100 },
  { id: 'przeglad_podst', label: 'Przegląd podstawowy', price: 150 },
  { id: 'przeglad_pelny', label: 'Przegląd pełny', price: 250 },
  { id: 'diag_ebike', label: 'Diagnostyka e-Bike', price: 100 },
  { id: 'zlozenie_100', label: 'Złożenie roweru 100', price: 100 },
  { id: 'zlozenie_150', label: 'Złożenie roweru 150', price: 150 },
  { id: 'zlozenie_200', label: 'Złożenie roweru 200', price: 200 },
  { id: 'zlozenie_250', label: 'Złożenie roweru 250', price: 250 },
];

var DEFAULTS = [
  // Naprawa domyślnie zaznaczona przy nowym zleceniu; kwota pozostaje pusta
  { name: 'Naprawa', price: 0, checked: true, options: NAPRAWA_SERVICES.map(x => ({...x})) },
  { name: 'Mechanizm korbowy', price: 0, checked: false,
    presets: [{label:'Kwadrat',price:119},{label:'Octalink',price:189},{label:'Hollowtech',price:229}] },
  { name: 'Support',    price: 0,   checked: false,
    presets: [{label:'Neco',price:45},{label:'Nexelo',price:65},{label:'Octalink',price:80},{label:'Hollowtech',price:79},{label:'Hollowtech Pro',price:129},{label:'TOKEN',price:229}] },
  { name: 'Łańcuch',    price: 0,   checked: false,
    presets: [{label:'7/8s KMC',price:39},{label:'7/8s Shimano HG40',price:59},{label:'7/8s Shimano HG71',price:70},{label:'7/8s KMC X8',price:65},{label:'7/8s KMC X8S',price:79},{label:'9s KMC X9',price:85},{label:'10s Shimano',price:79},{label:'10s KMC X10',price:89},{label:'10s KMC X10S',price:109},{label:'11s KMC X11',price:99},{label:'11s KMC X11BS',price:119},{label:'12s KMC X12',price:169},{label:'E10 KMC',price:129},{label:'E11 KMC',price:139},{label:'E12 KMC',price:159},{label:'Wippermann',price:199}] },
  { name: 'Kaseta',     price: 0,   checked: false,
    presets: [{label:'6s Wolnobieg SHI',price:69},{label:'7s Wolnobieg SHI',price:79},{label:'8s Shimano',price:99},{label:'9s Shimano',price:109},{label:'10s Shimano',price:149}] },
  { name: 'Przerzutka przednia', price: 0, checked: false },
  { name: 'Przerzutka tylna',  price: 0, checked: false,
    presets: [
      {label:'Kółka maszynowe',price:45},
      {label:'6/7/8',price:69},
      {label:'7/8',price:89},
      {label:'8/9',price:99},
      {label:'10/11',price:149}
    ] },
  { name: 'Hak',        price: 0,   checked: false },
  { name: 'Pedała',     price: 0,   checked: false,
    presets: [{label:'Plastikowe',price:25},{label:'Aluminium',price:39},{label:'Nexelo',price:79},{label:'Zeray',price:119}] },
  { name: 'Dźwignie',   price: 0, checked: false },
  { name: 'Hamulce',    price: 0, checked: false },
  { name: 'Tarcza',     price: 0,   checked: false, qty: 0,
    presets: [{label:'RT10',price:45},{label:'RT56',price:65},{label:'RT66',price:90},{label:'Centerline',price:120},{label:'Magura',price:120}] },
  { name: 'Klocki',     price: 0,   checked: false, qty: 0,
    presets: [{label:'VBreak',price:30},{label:'Zamiennik',price:39},{label:'Oryginał',price:55},{label:'Oryginał+',price:79},{label:'E-bike',price:60}] },
  { name: 'Płyn',       price: 0,   checked: false, qty: 0,
    presets: [{label:'Shimano',price:20},{label:'Magura',price:30},{label:'SRAM',price:40}] },
  { name: 'Linka',      price: 0,   checked: false, qty: 0 },
  { name: 'Pancerz',    price: 0,   checked: false, qty: 0 },
  { name: 'Końcówki',   price: 0,   checked: false, qty: 0 },
  { name: 'Fajka/Gumka', price: 0, checked: false, qty: 0 },
  { name: 'Opona',      price: 0,   checked: false, qty: 0 },
  { name: 'Dętka',      price: 0,   checked: false, qty: 0,
    presets: [{label:'Standard',price:25},{label:'Vittoria/Vredestein',price:39},{label:'Premium',price:49}] },
  { name: 'Ochraniacz', price: 6,   checked: false, qty: 0 },
  { name: 'Koło tylne',  price: 0,  checked: false },
  { name: 'Koło przednie', price: 0, checked: false },
  { name: 'Owijka',     price: 0, checked: false },
  { name: 'Siodło',     price: 0, checked: false },
  { name: 'Amortyzator', price: 0,  checked: false },
  { name: 'Akcesoria',  price: 0, checked: false },
  { name: 'Części i akcesoria', price: 0, checked: false, note: true },
];

// Mapa starych nazw → nowych (migracja danych)
var NAME_ALIASES = {
  'Pedały': 'Pedała',
  'Korba': 'Mechanizm korbowy',
  'Fajka': 'Fajka/Gumka',
  'Owijka/Chwyty': 'Owijka',
};
function findDefault(name) {
  const canonical = NAME_ALIASES[name] || name;
  return DEFAULTS.find(d => d.name === canonical);
}
function canonicalName(name) {
  return NAME_ALIASES[name] || name;
}

// ── CR: złożenie roweru ──
var CR_ASSEMBLY_CLASSIC = [
  { id: 'mtb', label: 'MTB/Cross/Miejski/Trekkingowy/Składany', price: 149 },
  { id: 'kids', label: 'Dziecięcy/BMX/Dirt/Street', price: 99 },
  { id: 'road', label: 'Szosowy/Gravelowy/Przełajowy', price: 199 },
];
var CR_ASSEMBLY_EBIKE = [
  { id: 'mtb', label: 'MTB/Cross/Miejski/Trekkingowy/Składany', price: 199 },
  { id: 'kids', label: 'Dziecięcy/BMX/Dirt/Street', price: 149 },
  { id: 'road', label: 'Szosowy/Gravelowy/Przełajowy', price: 199 },
];
var CR_EXTRAS = [
  { id: 'bagażnik', label: 'Montaż Bagażnik', price: 49, priceLabel: '49 - 59 zł' },
  { id: 'blotniki', label: 'Montaż Błotniki', price: 29 },
  { id: 'licznik', label: 'Montaż Licznik rowerowy', price: 29 },
  { id: 'oswietlenie', label: 'Montaż Oświetlenie rowerowe', price: 19 },
  { id: 'stopka', label: 'Montaż Stopka/podpórka rowerowa', price: 19 },
];

var ITEM_ICONS = {
  'Naprawa':              `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="#3b7cf4" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  'Mechanizm korbowy':     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 9V3M12 21v-6M9 12H3M21 12h-6"/></svg>`,
  'Support':              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
  'Łańcuch':              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  'Kaseta':               `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>`,
  'Przerzutka przednia':  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  'Przerzutka tylna':     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  'Hak':                  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10a4 4 0 0 1-8 0v-1"/><circle cx="12" cy="3" r="1"/></svg>`,
  'Pedała':               `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="10" width="20" height="4" rx="2"/></svg>`,
  'Tarcza':               `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  'Klocki':               `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="16" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,
  'Płyn':                 `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6 9 4 13.5 4 16a8 8 0 0 0 16 0c0-2.5-2-7-8-14z"/></svg>`,
  'Linka':                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  'Pancerz':              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  'Końcówki':             `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>`,
  'Dętka':                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`,
  'Opona':                `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/></svg>`,
  'Koło tylne':           `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/></svg>`,
  'Koło przednie':        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/></svg>`,
  'Owijka':               `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v18M18 3v18M6 8h12M6 16h12"/></svg>`,
  'Ochraniacz':           `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  'Dźwignie':             `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 3a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/></svg>`,
  'Hamulce':              `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="4" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="20"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="20" y2="12"/></svg>`,
  'Amortyzator':          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M8 6h8M8 18h8M9 10h6M9 14h6"/></svg>`,
  'Części i akcesoria':   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><line x1="8" y1="11" x2="8" y2="16"/><line x1="11" y1="8" x2="16" y2="8"/></svg>`,
};

function getItemIcon(name) {
  return ITEM_ICONS[name] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b7cf4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>`;
}
