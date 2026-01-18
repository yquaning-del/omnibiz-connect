/**
 * Currency formatting utilities
 */

export type SupportedCurrency = 'USD' | 'GHS';

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
