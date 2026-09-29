// FBI Field Offices coordinates & international hotspots
export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  state?: string;
  country?: string;
}

export const FBI_FIELD_OFFICES: Record<string, GeoPoint> = {
  newyork: { name: "New York", lat: 40.7128, lng: -74.006, state: "NY" },
  losangeles: { name: "Los Angeles", lat: 34.0522, lng: -118.2437, state: "CA" },
  chicago: { name: "Chicago", lat: 41.8781, lng: -87.6298, state: "IL" },
  miami: { name: "Miami", lat: 25.7617, lng: -80.1918, state: "FL" },
  houston: { name: "Houston", lat: 29.7604, lng: -95.3698, state: "TX" },
  washington: { name: "Washington D.C.", lat: 38.9072, lng: -77.0369, state: "DC" },
  washingtondc: { name: "Washington D.C.", lat: 38.9072, lng: -77.0369, state: "DC" },
  sanfrancisco: { name: "San Francisco", lat: 37.7749, lng: -122.4194, state: "CA" },
  boston: { name: "Boston", lat: 42.3601, lng: -71.0589, state: "MA" },
  atlanta: { name: "Atlanta", lat: 33.749, lng: -84.388, state: "GA" },
  dallas: { name: "Dallas", lat: 32.7767, lng: -96.797, state: "TX" },
  elpaso: { name: "El Paso", lat: 31.7619, lng: -106.485, state: "TX" },
  philadelphia: { name: "Philadelphia", lat: 39.9526, lng: -75.1652, state: "PA" },
  phoenix: { name: "Phoenix", lat: 33.4484, lng: -112.074, state: "AZ" },
  detroit: { name: "Detroit", lat: 42.3314, lng: -83.0458, state: "MI" },
  seattle: { name: "Seattle", lat: 47.6062, lng: -122.3321, state: "WA" },
  denver: { name: "Denver", lat: 39.7392, lng: -104.9903, state: "CO" },
  sandiego: { name: "San Diego", lat: 32.7157, lng: -117.1611, state: "CA" },
  tampa: { name: "Tampa", lat: 27.9506, lng: -82.4572, state: "FL" },
  louisville: { name: "Louisville", lat: 38.2527, lng: -85.7585, state: "KY" },
  stlouis: { name: "St. Louis", lat: 38.627, lng: -90.1994, state: "MO" },
  baltimore: { name: "Baltimore", lat: 39.2904, lng: -76.6122, state: "MD" },
  charlotte: { name: "Charlotte", lat: 35.2271, lng: -80.8431, state: "NC" },
  sanantonio: { name: "San Antonio", lat: 29.4241, lng: -98.4936, state: "TX" },
  lasvegas: { name: "Las Vegas", lat: 36.1699, lng: -115.1398, state: "NV" },
  minneapolis: { name: "Minneapolis", lat: 44.9778, lng: -93.265, state: "MN" },
  neworleans: { name: "New Orleans", lat: 29.9511, lng: -90.0715, state: "LA" },
  pittsburgh: { name: "Pittsburgh", lat: 40.4406, lng: -79.9959, state: "PA" },
  cleveland: { name: "Cleveland", lat: 41.4993, lng: -81.6944, state: "OH" },
  cincinnati: { name: "Cincinnati", lat: 39.1031, lng: -84.512, state: "OH" },
  indianapolis: { name: "Indianapolis", lat: 39.7684, lng: -86.1581, state: "IN" },
  kansascity: { name: "Kansas City", lat: 39.0997, lng: -94.5786, state: "MO" },
  milwaukee: { name: "Milwaukee", lat: 43.0389, lng: -87.9065, state: "WI" },
  columbia: { name: "Columbia", lat: 34.0007, lng: -81.0348, state: "SC" },
  memphis: { name: "Memphis", lat: 35.1495, lng: -90.049, state: "TN" },
  knoxville: { name: "Knoxville", lat: 35.9606, lng: -83.9207, state: "TN" },
  sacramento: { name: "Sacramento", lat: 38.5816, lng: -121.4944, state: "CA" },
  portland: { name: "Portland", lat: 45.5152, lng: -122.6784, state: "OR" },
  saltlakecity: { name: "Salt Lake City", lat: 40.7608, lng: -111.891, state: "UT" },
  sanjuan: { name: "San Juan", lat: 18.4655, lng: -66.1057, state: "PR" },
  honolulu: { name: "Honolulu", lat: 21.3069, lng: -157.8583, state: "HI" },
  anchorage: { name: "Anchorage", lat: 61.2181, lng: -149.9003, state: "AK" },
  albuquerque: { name: "Albuquerque", lat: 35.0844, lng: -106.6504, state: "NM" },
  birmingham: { name: "Birmingham", lat: 33.5186, lng: -86.8104, state: "AL" },
  buffalo: { name: "Buffalo", lat: 42.8864, lng: -78.8784, state: "NY" },
  jackson: { name: "Jackson", lat: 32.2988, lng: -90.1848, state: "MS" },
  jacksonville: { name: "Jacksonville", lat: 30.3322, lng: -81.6557, state: "FL" },
  littlerock: { name: "Little Rock", lat: 34.7465, lng: -92.2896, state: "AR" },
  mobile: { name: "Mobile", lat: 30.6954, lng: -88.0399, state: "AL" },
  newark: { name: "Newark", lat: 40.7357, lng: -74.1724, state: "NJ" },
  newhaven: { name: "New Haven", lat: 41.3083, lng: -72.9279, state: "CT" },
  norfolk: { name: "Norfolk", lat: 36.8508, lng: -76.2859, state: "VA" },
  oklahomacity: { name: "Oklahoma City", lat: 35.4676, lng: -97.5164, state: "OK" },
  omaha: { name: "Omaha", lat: 41.2565, lng: -95.9345, state: "NE" },
  richmond: { name: "Richmond", lat: 37.5407, lng: -77.436, state: "VA" },
  springfield: { name: "Springfield", lat: 39.7817, lng: -89.6501, state: "IL" },
};

export const SUSPECTED_COUNTRIES: Record<string, GeoPoint> = {
  MX: { name: "Mexico", lat: 23.6345, lng: -102.5528, country: "Mexico" },
  HN: { name: "Honduras", lat: 15.2, lng: -86.2419, country: "Honduras" },
  BG: { name: "Bulgaria (Sofia)", lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
  IN: { name: "India (Punjab)", lat: 31.1471, lng: 75.3412, country: "India" },
  CO: { name: "Colombia", lat: 4.5709, lng: -74.2973, country: "Colombia" },
  RU: { name: "Russia", lat: 61.524, lng: 105.3188, country: "Russia" },
  GR: { name: "Greece (Athens)", lat: 37.9838, lng: 23.7275, country: "Greece" },
  CA: { name: "Canada", lat: 56.1304, lng: -106.3468, country: "Canada" },
  JM: { name: "Jamaica", lat: 18.1096, lng: -77.2975, country: "Jamaica" },
  DO: { name: "Dominican Republic", lat: 18.7357, lng: -70.1627, country: "Dominican Rep." },
  CN: { name: "China", lat: 35.8617, lng: 104.1954, country: "China" },
  AE: { name: "United Arab Emirates", lat: 23.4241, lng: 53.8478, country: "UAE" },
  GT: { name: "Guatemala", lat: 15.7835, lng: -90.2308, country: "Guatemala" },
  SV: { name: "El Salvador", lat: 13.7942, lng: -88.8965, country: "El Salvador" },
  BR: { name: "Brazil", lat: -14.235, lng: -51.9253, country: "Brazil" },
  DE: { name: "Germany", lat: 51.1657, lng: 10.4515, country: "Germany" },
  UK: { name: "United Kingdom", lat: 55.3781, lng: -3.436, country: "UK" },
  VN: { name: "Vietnam", lat: 14.0583, lng: 108.2772, country: "Vietnam" },
  VE: { name: "Venezuela", lat: 6.4238, lng: -66.5897, country: "Venezuela" },
};

// Known famous fugitive ties for ultra-rich visualization
export const FUGITIVE_CUSTOM_LOCATIONS: Record<string, { crime: GeoPoint; escape: GeoPoint }> = {
  // Ruja Ignatova (Cryptoqueen): Multi-billion OneCoin fraud in NY, last seen boarding flight to Athens
  "RUJA IGNATOVA": {
    crime: { name: "New York (SDNY)", lat: 40.7128, lng: -74.006 },
    escape: { name: "Athens, Greece (Last Seen)", lat: 37.9838, lng: 23.7275 },
  },
  // Yulan Archaga Carias (MS-13 leader in Honduras): $10M bounty, operating in Honduras
  "YULAN ADONAY ARCHAGA CARIAS": {
    crime: { name: "New York / Houston", lat: 40.7128, lng: -74.006 },
    escape: { name: "San Pedro Sula, Honduras", lat: 15.5042, lng: -88.025 },
  },
  // Fausto Isidro Meza-Flores (Chapo Isidro cartel): trafficking to DC, based in Sinaloa
  "FAUSTO ISIDRO MEZA-FLORES": {
    crime: { name: "Washington D.C.", lat: 38.9072, lng: -77.0369 },
    escape: { name: "Guasave, Sinaloa, Mexico", lat: 25.5678, lng: -108.468 },
  },
  // Wilver Villegas-Palomino (ELN narco-terrorism): indicted in Houston, hiding in Catatumbo Colombia
  "WILVER VILLEGAS-PALOMINO": {
    crime: { name: "Houston, Texas", lat: 29.7604, lng: -95.3698 },
    escape: { name: "Catatumbo, Colombia", lat: 8.5833, lng: -73.0 },
  },
  // Satinderjeet Singh (Goldy Brar): gang violence / murder conspiracy in California & Punjab
  "SATINDERJEET SINGH": {
    crime: { name: "Los Angeles, California", lat: 34.0522, lng: -118.2437 },
    escape: { name: "Punjab, India / Canada", lat: 31.1471, lng: 75.3412 },
  },
  // Bhadreshkumar Patel: wanted for homicide in Hanover MD, ties to Gujarat India
  "BHADRESHKUMAR CHETANBHAI PATEL": {
    crime: { name: "Hanover / Baltimore, MD", lat: 39.1929, lng: -76.7241 },
    escape: { name: "Gujarat, India", lat: 22.2587, lng: 71.1924 },
  },
  // Giovanni Vicente Mosquera Serrano: money laundering for Clan del Golfo
  "GIOVANNI VICENTE MOSQUERA SERRANO": {
    crime: { name: "Houston / Miami", lat: 29.7604, lng: -95.3698 },
    escape: { name: "Medellín, Colombia", lat: 6.2442, lng: -75.5812 },
  },
  // Omar Alexander Cardenas: violent gang murder in Los Angeles, fled to Mexico
  "OMAR ALEXANDER CARDENAS": {
    crime: { name: "Los Angeles, California", lat: 34.0522, lng: -118.2437 },
    escape: { name: "Michoacán, Mexico", lat: 19.5665, lng: -101.7068 },
  },
  // Samuel Ramirez, Jr.: drive-by murder in Yakima WA, fled to Mexico
  "SAMUEL RAMIREZ, JR.": {
    crime: { name: "Yakima / Seattle, WA", lat: 46.6021, lng: -120.5059 },
    escape: { name: "Sonora, Mexico", lat: 29.2972, lng: -110.3309 },
  },
  // Anibal Alexander Canelon Aguirre: armed robberies in Nebraska / Iowa
  "ANIBAL ALEXANDER CANELON AGUIRRE": {
    crime: { name: "Omaha, Nebraska", lat: 41.2565, lng: -95.9345 },
    escape: { name: "Aragua, Venezuela", lat: 10.2353, lng: -67.5911 },
  },
  // Trung Duc Lu: large scale MDMA trafficking ring in Philadelphia
  "TRUNG DUC LU": {
    crime: { name: "Philadelphia, Pennsylvania", lat: 39.9526, lng: -75.1652 },
    escape: { name: "Ho Chi Minh City, Vietnam", lat: 10.8231, lng: 106.6297 },
  },
  // Gregory Henderson, Jr.: armed drug trafficking conspiracy in Indianapolis
  "GREGORY HENDERSON, JR.": {
    crime: { name: "Indianapolis, Indiana", lat: 39.7684, lng: -86.1581 },
    escape: { name: "Gary, IN / Chicago, IL", lat: 41.5934, lng: -87.3464 },
  },
  // KaShawn Nicola Roper: carjacking and murder in Kansas City
  "KASHAWN NICOLA ROPER": {
    crime: { name: "Kansas City, Missouri", lat: 39.0997, lng: -94.5786 },
    escape: { name: "St. Louis, Missouri", lat: 38.627, lng: -90.1994 },
  },
};
