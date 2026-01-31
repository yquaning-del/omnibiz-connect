/**
 * Currency formatting utilities
 */

export type SupportedCurrency = 'USD' | 'GHS' | 'KES' | 'NGN' | 'ZAR' | 'TZS' | 'UGX' | 'RWF';

interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar',
  },
  GHS: {
    code: 'GHS',
    symbol: '₵',
    locale: 'en-GH',
    name: 'Ghana Cedi',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    locale: 'en-KE',
    name: 'Kenyan Shilling',
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    locale: 'en-NG',
    name: 'Nigerian Naira',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    locale: 'en-ZA',
    name: 'South African Rand',
  },
  TZS: {
    code: 'TZS',
    symbol: 'TSh',
    locale: 'sw-TZ',
    name: 'Tanzanian Shilling',
  },
  UGX: {
    code: 'UGX',
    symbol: 'USh',
    locale: 'en-UG',
    name: 'Ugandan Shilling',
  },
  RWF: {
    code: 'RWF',
    symbol: 'FRw',
    locale: 'rw-RW',
    name: 'Rwandan Franc',
  },
};

/**
 * Format an amount as currency
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  const config = CURRENCIES[currency];
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    return `${config.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format a compact currency value (e.g., $1.5K, $2.3M)
 */
export function formatCurrencyCompact(
  amount: number,
  currency: SupportedCurrency = 'USD'
): string {
  const config = CURRENCIES[currency];
  
  if (amount >= 1000000) {
    return `${config.symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${config.symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}

/**
 * Get the currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency = 'USD'): string {
  return CURRENCIES[currency]?.symbol || '$';
}

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
