/**
 * Validation helpers and country codes for Auth and Profile forms.
 */

export interface CountryCodeOption {
  code: string;
  name: string;
  flag: string;
  sample: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+91', name: 'India', flag: '🇮🇳', sample: '9876543210' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸', sample: '2025550123' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', sample: '7911123456' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', sample: '501234567' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', sample: '81234567' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', sample: '412345678' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', sample: '15123456789' },
  { code: '+33', name: 'France', flag: '🇫🇷', sample: '612345678' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', sample: '9012345678' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', sample: '501234567' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', sample: '1712345678' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', sample: '9812345678' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', sample: '712345678' },
];

/**
 * Validates whether an email string follows standard email formatting (e.g. user@domain.tld).
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates whether a mobile number string has a valid number of digits (min 7, max 15 digits).
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return true; // Optional field
  const clean = phone.replace(/[^0-9]/g, '');
  return clean.length >= 7 && clean.length <= 15;
}

/**
 * Formats a full international phone number with selected country code.
 */
export function formatFullPhoneNumber(countryCode: string, localNumber: string): string {
  const cleanNum = localNumber.trim().replace(/^0+/, ''); // strip leading zeroes
  if (!cleanNum) return '';
  return `${countryCode} ${cleanNum}`;
}
