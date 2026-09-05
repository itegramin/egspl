/**
 * Utility functions for Indian Numbering System and Currency conversion to words.
 *
 * Examples:
 *  - 1,500 -> "Rupees One Thousand Five Hundred Only"
 *  - 1,25,000 -> "Rupees One Lakh Twenty-Five Thousand Only"
 *  - 15,40,250.75 -> "Rupees Fifteen Lakh Forty Thousand Two Hundred Fifty and Seventy-Five Paise Only"
 *  - 1,00,00,000 -> "Rupees One Crore Only"
 *  - 100,00,00,000 -> "Rupees One Hundred Crore Only"
 */

const ONES: string[] = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS: string[] = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

/**
 * Converts a positive integer (0 to 999) to words.
 */
function convertThreeDigits(num: number): string {
  let result = '';

  if (num >= 100) {
    const hundredDigit = Math.floor(num / 100);
    result += ONES[hundredDigit] + ' Hundred';
    num %= 100;
    if (num > 0) {
      result += ' ';
    }
  }

  if (num >= 20) {
    const tenDigit = Math.floor(num / 10);
    const unitDigit = num % 10;
    result += TENS[tenDigit];
    if (unitDigit > 0) {
      result += '-' + ONES[unitDigit];
    }
  } else if (num > 0) {
    result += ONES[num];
  }

  return result;
}

/**
 * Converts an integer number into words following the Indian Numbering System:
 * Crores (1,00,00,000+), Lakhs (1,00,000 - 99,99,999), Thousands (1,00,000 - 99,999), Hundreds (100 - 999), and Units.
 */
export function convertIntegerToIndianWords(n: number): string {
  if (isNaN(n) || n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + convertIntegerToIndianWords(Math.abs(n));

  // Round down to integer
  let num = Math.floor(n);
  const parts: string[] = [];

  // Crores (>= 1,00,00,000)
  // Handles multi-crore amounts recursively e.g. 100 Crore, 1000 Crore, etc.
  if (num >= 10000000) {
    const croreValue = Math.floor(num / 10000000);
    parts.push(convertIntegerToIndianWords(croreValue) + ' Crore');
    num %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (num >= 100000) {
    const lakhValue = Math.floor(num / 100000);
    parts.push(convertThreeDigits(lakhValue) + ' Lakh');
    num %= 100000;
  }

  // Thousands (>= 1,000)
  if (num >= 1000) {
    const thousandValue = Math.floor(num / 1000);
    parts.push(convertThreeDigits(thousandValue) + ' Thousand');
    num %= 1000;
  }

  // Hundreds, Tens and Units (0 - 999)
  if (num > 0) {
    parts.push(convertThreeDigits(num));
  }

  return parts.filter(Boolean).join(' ');
}

export interface AmountInWordsOptions {
  currency?: string; // e.g. 'INR', 'USD' (default 'INR')
  includePrefix?: boolean; // e.g. 'Rupees' prefix (default true)
  includeSuffix?: boolean; // e.g. 'Only' suffix (default true)
  includePaise?: boolean; // whether to convert decimal places to Paise (default true)
}

/**
 * Converts any numeric amount (including decimals/paise) to formal Indian currency words format.
 *
 * Example:
 *  - `formatAmountInWords(150000)` -> `"Rupees One Lakh Fifty Thousand Only"`
 *  - `formatAmountInWords(2500.5)` -> `"Rupees Two Thousand Five Hundred and Fifty Paise Only"`
 *  - `formatAmountInWords(0)` -> `"Rupees Zero Only"`
 *  - `formatAmountInWords("")` -> `""`
 */
export function formatAmountInWords(
  amount: number | string | null | undefined,
  options: AmountInWordsOptions = {}
): string {
  if (amount === undefined || amount === null || amount === '') {
    return '';
  }

  const rawNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(rawNum)) return '';

  const {
    currency = 'INR',
    includePrefix = true,
    includeSuffix = true,
    includePaise = true,
  } = options;

  const isNegative = rawNum < 0;
  const absNum = Math.abs(rawNum);

  // Integer and decimal parts (precision to 2 decimal places for currency)
  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  const integerWords = integerPart === 0 && decimalPart > 0 ? '' : convertIntegerToIndianWords(integerPart);
  const paiseWords =
    includePaise && decimalPart > 0
      ? convertThreeDigits(decimalPart) + ' Paise'
      : '';

  const currencyName = currency.toUpperCase() === 'INR' ? 'Rupees' : currency;

  let formatted = '';

  if (integerWords && paiseWords) {
    formatted = `${integerWords} and ${paiseWords}`;
  } else if (integerWords) {
    formatted = integerWords;
  } else if (paiseWords) {
    formatted = paiseWords;
  } else {
    formatted = 'Zero';
  }

  let result = '';

  if (isNegative) {
    result += 'Minus ';
  }

  if (includePrefix && currency.toUpperCase() === 'INR') {
    result += `${currencyName} ${formatted}`;
  } else if (includePrefix) {
    result += `${currency} ${formatted}`;
  } else {
    result += formatted;
  }

  if (includeSuffix) {
    result += ' Only';
  }

  return result.trim();
}

export interface FormatCurrencyOptions {
  showSymbol?: boolean;
  currency?: string;
  decimals?: number;
}

/**
 * Formats a number in the Indian numbering system with ₹ symbol (e.g. ₹ 1,50,000.00).
 */
export function formatIndianCurrency(
  amount: number | string | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  if (amount === undefined || amount === null || amount === '') return '₹ 0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹ 0.00';

  const { showSymbol = true, decimals = 2 } = options;
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `₹ ${formatted}` : formatted;
}
