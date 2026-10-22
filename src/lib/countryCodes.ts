// ============================================================
// MR. VIVASAYI - Country Calling Codes & Phone Normalization
// ============================================================

export interface CountryInfo {
  code: string;       // ISO 3166-1 alpha-2 (e.g. 'IN')
  name: string;       // Country name (e.g. 'India')
  callingCode: string;// e.g. '+91'
  flag: string;       // Emoji flag (e.g. '🇮🇳')
  phoneLength: number;// Typical national phone digit length
  placeholder: string;// Example national phone
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳', phoneLength: 10, placeholder: '98765 43210' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '+971', flag: '🇦🇪', phoneLength: 9, placeholder: '50 123 4567' },
  { code: 'SG', name: 'Singapore', callingCode: '+65', flag: '🇸🇬', phoneLength: 8, placeholder: '8123 4567' },
  { code: 'MY', name: 'Malaysia', callingCode: '+60', flag: '🇲🇾', phoneLength: 9, placeholder: '12 345 6789' },
  { code: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸', phoneLength: 10, placeholder: '202 555 0123' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧', phoneLength: 10, placeholder: '7911 123456' },
  { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦', phoneLength: 10, placeholder: '416 555 0199' },
  { code: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺', phoneLength: 9, placeholder: '412 345 678' },
  { code: 'LK', name: 'Sri Lanka', callingCode: '+94', flag: '🇱🇰', phoneLength: 9, placeholder: '71 234 5678' },
  { code: 'SA', name: 'Saudi Arabia', callingCode: '+966', flag: '🇸🇦', phoneLength: 9, placeholder: '50 123 4567' },
  { code: 'QA', name: 'Qatar', callingCode: '+974', flag: '🇶🇦', phoneLength: 8, placeholder: '3312 3456' },
  { code: 'OM', name: 'Oman', callingCode: '+968', flag: '🇴🇲', phoneLength: 8, placeholder: '9123 4567' },
  { code: 'KW', name: 'Kuwait', callingCode: '+965', flag: '🇰🇼', phoneLength: 8, placeholder: '9123 4567' },
  { code: 'NZ', name: 'New Zealand', callingCode: '+64', flag: '🇳🇿', phoneLength: 9, placeholder: '21 123 4567' },
  { code: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪', phoneLength: 10, placeholder: '151 23456789' },
  { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷', phoneLength: 9, placeholder: '6 12 34 56 78' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)

/**
 * Returns country info matching the given ISO code (e.g. 'IN')
 */
export function getCountryByCode(code?: string): CountryInfo {
  if (!code) return DEFAULT_COUNTRY;
  const upper = code.trim().toUpperCase();
  return COUNTRIES.find(c => c.code === upper) || DEFAULT_COUNTRY;
}

/**
 * Returns country info matching the given calling code (e.g. '+91' or '91')
 */
export function getCountryByCallingCode(callingCode?: string): CountryInfo {
  if (!callingCode) return DEFAULT_COUNTRY;
  const clean = callingCode.startsWith('+') ? callingCode : `+${callingCode}`;
  return COUNTRIES.find(c => c.callingCode === clean) || DEFAULT_COUNTRY;
}

/**
 * Normalizes a phone number by stripping spaces, hyphens, and redundant country calling code prefixes.
 * Returns only the pure national digits (e.g. '9789325262').
 */
export function normalizePhoneNumber(phone?: string, callingCode: string = '+91'): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  // Strip leading calling code digits if present (e.g. '91' for '+91' or '1' for '+1')
  const codeDigits = callingCode.replace(/\D/g, '');
  if (codeDigits && digits.startsWith(codeDigits) && digits.length > codeDigits.length + 6) {
    digits = digits.slice(codeDigits.length);
  }

  // Strip single leading zero (common in local mobile dialing e.g. 09789325262)
  if (digits.startsWith('0') && digits.length > 9) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Formats a phone number for UI display with calling code, e.g. "+91 97893 25262"
 */
export function formatPhoneWithCountry(phone?: string, callingCode: string = '+91'): string {
  if (!phone) return '—';
  const clean = normalizePhoneNumber(phone, callingCode);
  const code = callingCode.startsWith('+') ? callingCode : `+${callingCode}`;
  if (!clean) return phone;
  if (clean.length === 10) {
    return `${code} ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return `${code} ${clean}`;
}

/**
 * Formats phone number for direct wa.me link without any spaces or symbols, e.g. "919789325262"
 */
export function formatWhatsAppE164(phone?: string, callingCode: string = '+91'): string {
  if (!phone) return '919876543210';
  const cleanCalling = callingCode.replace(/\D/g, '') || '91';
  const cleanPhone = normalizePhoneNumber(phone, callingCode);
  return `${cleanCalling}${cleanPhone}`;
}

/**
 * Generates a clean, unique customer ID starting from 0001 (0001, 0002, 0003, etc.)
 */
export function generateUniqueCustomerId(existingCustomers: Array<{ id?: string; customer_id?: string }>): string {
  const existingNumbers = (existingCustomers || [])
    .map(c => {
      const candidates = [c.customer_id, c.id].filter(Boolean) as string[];
      for (const cand of candidates) {
        const match = cand.match(/CUST-(\d+)/i) || cand.match(/cus-(\d+)/i) || cand.match(/^(\d+)$/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num < 1000000) return num;
        }
      }
      return null;
    })
    .filter((n): n is number => n !== null);

  const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNum = maxNum + 1;
  return String(nextNum).padStart(4, '0');
}

/**
 * Finds an existing customer in the directory using normalized phone and calling code
 * to prevent duplicates across POS, WhatsApp, and Website orders.
 */
export function findCustomerByPhoneAndCountry<T extends { phone?: string; whatsapp_number?: string; calling_code?: string; country_code?: string }>(
  customers: T[],
  phone?: string,
  callingCode: string = '+91'
): T | undefined {
  if (!phone) return undefined;
  const searchDigits = normalizePhoneNumber(phone, callingCode);
  if (!searchDigits) return undefined;

  return customers.find(c => {
    const custDigits1 = normalizePhoneNumber(c.phone, c.calling_code || callingCode);
    const custDigits2 = normalizePhoneNumber(c.whatsapp_number, c.calling_code || callingCode);
    return custDigits1 === searchDigits || custDigits2 === searchDigits;
  });
}
