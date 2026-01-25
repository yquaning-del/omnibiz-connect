// Location constants for lease generation

export interface Country {
  code: string;
  name: string;
  requiresState: boolean;
  requiresCity: boolean;
}

export interface USState {
  code: string;
  name: string;
}

export interface GhanaCity {
  name: string;
  region: string;
}

export const LEASE_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', requiresState: true, requiresCity: false },
  { code: 'GH', name: 'Ghana', requiresState: false, requiresCity: true },
  { code: 'NG', name: 'Nigeria', requiresState: true, requiresCity: false },
  { code: 'KE', name: 'Kenya', requiresState: false, requiresCity: true },
  { code: 'ZA', name: 'South Africa', requiresState: true, requiresCity: false },
  { code: 'GB', name: 'United Kingdom', requiresState: false, requiresCity: true },
  { code: 'CA', name: 'Canada', requiresState: true, requiresCity: false },
  { code: 'OTHER', name: 'Other Country', requiresState: false, requiresCity: false },
];

export const US_STATES: USState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

export const GHANA_CITIES: GhanaCity[] = [
  { name: 'Accra', region: 'Greater Accra' },
  { name: 'Tema', region: 'Greater Accra' },
  { name: 'Kumasi', region: 'Ashanti' },
  { name: 'Tamale', region: 'Northern' },
  { name: 'Takoradi', region: 'Western' },
  { name: 'Cape Coast', region: 'Central' },
  { name: 'Sunyani', region: 'Bono' },
  { name: 'Koforidua', region: 'Eastern' },
  { name: 'Ho', region: 'Volta' },
  { name: 'Bolgatanga', region: 'Upper East' },
  { name: 'Wa', region: 'Upper West' },
  { name: 'Techiman', region: 'Bono East' },
  { name: 'Obuasi', region: 'Ashanti' },
  { name: 'Kasoa', region: 'Central' },
  { name: 'Sekondi', region: 'Western' },
];

export const NIGERIA_STATES: USState[] = [
  { code: 'AB', name: 'Abia' },
  { code: 'AD', name: 'Adamawa' },
  { code: 'AK', name: 'Akwa Ibom' },
  { code: 'AN', name: 'Anambra' },
  { code: 'BA', name: 'Bauchi' },
  { code: 'BY', name: 'Bayelsa' },
  { code: 'BE', name: 'Benue' },
  { code: 'BO', name: 'Borno' },
  { code: 'CR', name: 'Cross River' },
  { code: 'DE', name: 'Delta' },
  { code: 'EB', name: 'Ebonyi' },
  { code: 'ED', name: 'Edo' },
  { code: 'EK', name: 'Ekiti' },
  { code: 'EN', name: 'Enugu' },
  { code: 'FC', name: 'FCT Abuja' },
  { code: 'GO', name: 'Gombe' },
  { code: 'IM', name: 'Imo' },
  { code: 'JI', name: 'Jigawa' },
  { code: 'KD', name: 'Kaduna' },
  { code: 'KN', name: 'Kano' },
  { code: 'KT', name: 'Katsina' },
  { code: 'KE', name: 'Kebbi' },
  { code: 'KO', name: 'Kogi' },
  { code: 'KW', name: 'Kwara' },
  { code: 'LA', name: 'Lagos' },
  { code: 'NA', name: 'Nasarawa' },
  { code: 'NI', name: 'Niger' },
  { code: 'OG', name: 'Ogun' },
  { code: 'ON', name: 'Ondo' },
  { code: 'OS', name: 'Osun' },
  { code: 'OY', name: 'Oyo' },
  { code: 'PL', name: 'Plateau' },
  { code: 'RI', name: 'Rivers' },
  { code: 'SO', name: 'Sokoto' },
  { code: 'TA', name: 'Taraba' },
  { code: 'YO', name: 'Yobe' },
  { code: 'ZA', name: 'Zamfara' },
];

export const KENYA_CITIES: GhanaCity[] = [
  { name: 'Nairobi', region: 'Nairobi County' },
  { name: 'Mombasa', region: 'Mombasa County' },
  { name: 'Kisumu', region: 'Kisumu County' },
  { name: 'Nakuru', region: 'Nakuru County' },
  { name: 'Eldoret', region: 'Uasin Gishu County' },
  { name: 'Thika', region: 'Kiambu County' },
  { name: 'Malindi', region: 'Kilifi County' },
  { name: 'Kitale', region: 'Trans-Nzoia County' },
  { name: 'Garissa', region: 'Garissa County' },
  { name: 'Nyeri', region: 'Nyeri County' },
];

export const SOUTH_AFRICA_PROVINCES: USState[] = [
  { code: 'EC', name: 'Eastern Cape' },
  { code: 'FS', name: 'Free State' },
  { code: 'GP', name: 'Gauteng' },
  { code: 'KZN', name: 'KwaZulu-Natal' },
  { code: 'LP', name: 'Limpopo' },
  { code: 'MP', name: 'Mpumalanga' },
  { code: 'NC', name: 'Northern Cape' },
  { code: 'NW', name: 'North West' },
  { code: 'WC', name: 'Western Cape' },
];

export const UK_CITIES: GhanaCity[] = [
  { name: 'London', region: 'Greater London' },
  { name: 'Birmingham', region: 'West Midlands' },
  { name: 'Manchester', region: 'Greater Manchester' },
  { name: 'Leeds', region: 'West Yorkshire' },
  { name: 'Glasgow', region: 'Scotland' },
  { name: 'Liverpool', region: 'Merseyside' },
  { name: 'Bristol', region: 'South West' },
  { name: 'Sheffield', region: 'South Yorkshire' },
  { name: 'Edinburgh', region: 'Scotland' },
  { name: 'Cardiff', region: 'Wales' },
];

export const CANADA_PROVINCES: USState[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// Helper function to get states/provinces for a country
export function getStatesForCountry(countryCode: string): USState[] {
  switch (countryCode) {
    case 'US':
      return US_STATES;
    case 'NG':
      return NIGERIA_STATES;
    case 'ZA':
      return SOUTH_AFRICA_PROVINCES;
    case 'CA':
      return CANADA_PROVINCES;
    default:
      return [];
  }
}

// Helper function to get cities for a country
export function getCitiesForCountry(countryCode: string): GhanaCity[] {
  switch (countryCode) {
    case 'GH':
      return GHANA_CITIES;
    case 'KE':
      return KENYA_CITIES;
    case 'GB':
      return UK_CITIES;
    default:
      return [];
  }
}

// Helper function to check if location is valid
export function isLocationValid(country: string, state?: string, city?: string): boolean {
  const countryConfig = LEASE_COUNTRIES.find(c => c.code === country);
  if (!countryConfig) return false;
  
  if (countryConfig.requiresState && !state) return false;
  if (countryConfig.requiresCity && !city) return false;
  
  return true;
}

// Helper function to get location validation error
export function getLocationValidationError(country: string, state?: string, city?: string): string | null {
  const countryConfig = LEASE_COUNTRIES.find(c => c.code === country);
  
  if (!country) return 'Please select a country';
  if (!countryConfig) return 'Invalid country selected';
  if (countryConfig.requiresState && !state) {
    return `State/Province is required for ${countryConfig.name} properties`;
  }
  if (countryConfig.requiresCity && !city) {
    return `City is required for ${countryConfig.name} properties`;
  }
  
  return null;
}
