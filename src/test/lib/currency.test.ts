import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyCompact,
  getCurrencySymbol,
  parseCurrency,
  type SupportedCurrency,
} from '@/lib/currency';

describe('formatCurrency', () => {
  it('should format USD currency correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toContain('$');
  });

  it('should format GHS currency correctly', () => {
    const result = formatCurrency(1234.56, 'GHS');
    expect(result).toContain('₵');
  });

  it('should format NGN currency correctly', () => {
    const result = formatCurrency(1234.56, 'NGN');
    expect(result).toContain('₦');
  });

  it('should use USD as default currency', () => {
    const result = formatCurrency(100);
    expect(result).toContain('$');
  });

  it('should handle zero amount', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0.00');
  });

  it('should handle negative amounts', () => {
    const result = formatCurrency(-100, 'USD');
    expect(result).toContain('-');
  });

  it('should accept custom options', () => {
    const result = formatCurrency(1234.56, 'USD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    expect(result).toContain('1,235');
  });
});

describe('formatCurrencyCompact', () => {
  it('should format millions correctly', () => {
    const result = formatCurrencyCompact(2500000, 'USD');
    expect(result).toBe('$2.5M');
  });

  it('should format thousands correctly', () => {
    const result = formatCurrencyCompact(2500, 'USD');
    expect(result).toBe('$2.5K');
  });

  it('should format amounts less than 1000 normally', () => {
    const result = formatCurrencyCompact(500, 'USD');
    expect(result).toContain('500');
    expect(result).toContain('$');
  });

  it('should use USD as default currency', () => {
    const result = formatCurrencyCompact(2500);
    expect(result).toBe('$2.5K');
  });

  it('should handle different currencies', () => {
    const result = formatCurrencyCompact(2500, 'GHS');
    expect(result).toBe('₵2.5K');
  });
});

describe('getCurrencySymbol', () => {
  it('should return USD symbol', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('should return GHS symbol', () => {
    expect(getCurrencySymbol('GHS')).toBe('₵');
  });

  it('should return NGN symbol', () => {
    expect(getCurrencySymbol('NGN')).toBe('₦');
  });

  it('should return KES symbol', () => {
    expect(getCurrencySymbol('KES')).toBe('KSh');
  });

  it('should use USD as default', () => {
    expect(getCurrencySymbol()).toBe('$');
  });
});

describe('parseCurrency', () => {
  it('should parse currency string with symbol', () => {
    expect(parseCurrency('$123.45')).toBe(123.45);
  });

  it('should parse currency string with commas', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  it('should parse currency string without symbol', () => {
    expect(parseCurrency('123.45')).toBe(123.45);
  });

  it('should handle negative values', () => {
    expect(parseCurrency('-$123.45')).toBe(-123.45);
  });

  it('should return 0 for invalid input', () => {
    expect(parseCurrency('invalid')).toBe(0);
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('abc')).toBe(0);
  });

  it('should handle different currency symbols', () => {
    expect(parseCurrency('₵123.45')).toBe(123.45);
    expect(parseCurrency('₦123.45')).toBe(123.45);
  });
});
