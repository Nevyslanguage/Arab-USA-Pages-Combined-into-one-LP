export const COUNTRY_DIGIT_LIMITS: { [key: string]: number } = {
  // North America
  '+1': 10,      // Canada/USA
  '+52': 10,     // Mexico
  
  // Europe
  '+44': 10,     // UK
  '+33': 9,      // France
  '+49': 11,     // Germany
  '+39': 10,     // Italy
  '+34': 9,      // Spain
  '+31': 9,      // Netherlands
  '+46': 9,      // Sweden
  '+47': 8,      // Norway
  '+45': 8,      // Denmark
  '+41': 9,      // Switzerland
  '+43': 10,     // Austria
  '+32': 9,      // Belgium
  '+351': 9,     // Portugal
  '+30': 10,     // Greece
  '+48': 9,      // Poland
  '+420': 9,     // Czech Republic
  '+421': 9,     // Slovakia
  '+36': 9,      // Hungary
  '+40': 9,      // Romania
  '+359': 9,     // Bulgaria
  '+385': 9,     // Croatia
  '+386': 8,     // Slovenia
  '+372': 8,     // Estonia
  '+371': 8,     // Latvia
  '+370': 8,     // Lithuania
  '+353': 9,     // Ireland
  '+354': 7,     // Iceland
  '+358': 9,     // Finland
  '+352': 9,     // Luxembourg
  '+377': 8,     // Monaco
  '+378': 9,     // San Marino
  '+423': 7,     // Liechtenstein
  '+376': 6,     // Andorra
  '+356': 8,     // Malta
  '+357': 8,     // Cyprus
  
  // Asia
  '+86': 11,     // China
  '+81': 10,     // Japan
  '+82': 10,     // South Korea
  '+850': 10,    // North Korea
  '+91': 10,     // India
  '+92': 10,     // Pakistan
  '+880': 10,    // Bangladesh
  '+94': 9,      // Sri Lanka
  '+977': 10,    // Nepal
  '+975': 8,     // Bhutan
  '+93': 9,      // Afghanistan
  '+98': 10,     // Iran
  '+964': 10,    // Iraq
  '+90': 10,     // Turkey
  '+7': 10,      // Russia/Kazakhstan
  '+996': 9,     // Kyrgyzstan
  '+992': 9,     // Tajikistan
  '+998': 9,     // Uzbekistan
  '+993': 8,     // Turkmenistan
  '+856': 8,     // Laos
  '+84': 9,      // Vietnam
  '+855': 9,     // Cambodia
  '+66': 9,      // Thailand
  '+60': 9,      // Malaysia
  '+65': 8,      // Singapore
  '+62': 10,     // Indonesia
  '+63': 10,     // Philippines
  '+886': 9,     // Taiwan
  '+852': 8,     // Hong Kong
  '+853': 8,     // Macau
  '+95': 9,      // Myanmar
  '+673': 7,     // Brunei
  '+670': 8,     // East Timor
  '+960': 7,     // Maldives
  
  // Middle East
  '+966': 9,     // Saudi Arabia
  '+971': 9,     // UAE
  '+965': 8,     // Kuwait
  '+973': 8,     // Bahrain
  '+974': 8,     // Qatar
  '+968': 8,     // Oman
  '+962': 9,     // Jordan
  '+961': 8,     // Lebanon
  '+963': 9,     // Syria
  '+972': 9,     // Israel
  '+970': 9,     // Palestine
  '+967': 9,     // Yemen
  
  // Africa
  '+20': 10,     // Egypt
  '+27': 9,      // South Africa
  '+234': 10,    // Nigeria
  '+254': 9,     // Kenya
  '+251': 9,     // Ethiopia
  '+212': 9,     // Morocco
  '+213': 9,     // Algeria
  '+216': 8,     // Tunisia
  '+218': 9,     // Libya
  '+249': 9,     // Sudan
  '+233': 9,     // Ghana
  '+225': 8,     // Côte d'Ivoire
  '+221': 9,     // Senegal
  '+226': 8,     // Burkina Faso
  '+223': 8,     // Mali
  '+227': 8,     // Niger
  '+228': 8,     // Togo
  '+229': 8,     // Benin
  '+230': 8,     // Mauritius
  '+231': 8,     // Liberia
  '+232': 8,     // Sierra Leone
  '+235': 8,     // Chad
  '+236': 8,     // Central African Republic
  '+237': 9,     // Cameroon
  '+238': 7,     // Cape Verde
  '+240': 9,     // Equatorial Guinea
  '+241': 8,     // Gabon
  '+242': 9,     // Congo
  '+243': 9,     // Congo Democratic Republic
  '+244': 9,     // Angola
  '+245': 7,     // Guinea-Bissau
  '+246': 7,     // British Indian Ocean Territory
  '+248': 7,     // Seychelles
  '+250': 9,     // Rwanda
  '+252': 8,     // Somalia
  '+253': 8,     // Djibouti
  '+255': 9,     // Tanzania
  '+256': 9,     // Uganda
  '+257': 8,     // Burundi
  '+258': 9,     // Mozambique
  '+260': 9,     // Zambia
  '+261': 9,     // Madagascar
  '+262': 9,     // Réunion/Mayotte
  '+263': 9,     // Zimbabwe
  '+264': 9,     // Namibia
  '+265': 9,     // Malawi
  '+266': 8,     // Lesotho
  '+267': 8,     // Botswana
  '+268': 8,     // Swaziland
  '+269': 7,     // Comoros
  '+290': 4,     // Saint Helena
  '+291': 7,     // Eritrea
  
  // Oceania
  '+61': 9,      // Australia
  '+64': 8,      // New Zealand
  '+679': 7,     // Fiji
  '+685': 7,     // Samoa
  '+676': 7,     // Tonga
  '+678': 7,     // Vanuatu
  '+686': 8,     // Kiribati
  '+687': 6,     // New Caledonia
  '+688': 6,     // Tuvalu
  '+689': 8,     // French Polynesia
  '+690': 4,     // Tokelau
  '+691': 7,     // Micronesia
  '+692': 7,     // Marshall Islands
  '+674': 7,     // Nauru
  '+675': 8,     // Papua New Guinea
  '+677': 7,     // Solomon Islands
  '+681': 6,     // Wallis and Futuna
  
  // South America
  '+55': 11,     // Brazil
  '+54': 10,     // Argentina
  '+56': 8,      // Chile
  '+57': 10,     // Colombia
  '+51': 9,      // Peru
  '+58': 10,     // Venezuela
  '+593': 9,     // Ecuador
  '+595': 9,     // Paraguay
  '+598': 8,     // Uruguay
  '+597': 7,     // Suriname
  '+592': 7,     // Guyana
  '+590': 9,     // Guadeloupe
  '+596': 9,     // Martinique
  '+594': 9,     // French Guiana
  
  // Central America & Caribbean
  '+502': 8,     // Guatemala
  '+503': 8,     // El Salvador
  '+504': 8,     // Honduras
  '+505': 8,     // Nicaragua
  '+506': 8,     // Costa Rica
  '+507': 8,     // Panama
  '+509': 8,     // Haiti
  '+1876': 10,   // Jamaica
  '+1242': 10,   // Bahamas
  '+1246': 10,   // Barbados
  '+1264': 10,   // Anguilla
  '+1268': 10,   // Antigua and Barbuda
  '+1284': 10,   // British Virgin Islands
  '+1340': 10,   // Virgin Islands
  '+1345': 10,   // Cayman Islands
  '+1473': 10,   // Grenada
  '+1649': 10,   // Turks and Caicos Islands
  '+1664': 10,   // Montserrat
  '+1670': 10,   // Northern Mariana Islands
  '+1671': 10,   // Guam
  '+1684': 10,   // American Samoa
  '+1758': 10,   // Saint Lucia
  '+1767': 10,   // Dominica
  '+1784': 10,   // Saint Vincent and the Grenadines
  '+1787': 10,   // Puerto Rico
  '+1809': 10,   // Dominican Republic
  '+1868': 10,   // Trinidad and Tobago
  '+1869': 10,   // Saint Kitts and Nevis
};

export function getMaxDigitsForCountry(countryCode: string): number {
  return COUNTRY_DIGIT_LIMITS[countryCode] || 15; // Default to 15 if country not found
}
