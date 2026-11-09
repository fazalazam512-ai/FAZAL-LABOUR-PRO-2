import { CurrencyCode, CurrencyConfig } from '../types';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    locale: 'ur-PK',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    locale: 'ar-AE',
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Saudi Riyal',
    locale: 'ar-SA',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    locale: 'en-CA',
  },
  AUD: {
    code: 'AUD',
    symbol: 'AU$',
    name: 'Australian Dollar',
    locale: 'en-AU',
  },
};

export function formatMoney(amount: number | null | undefined, currencyCode: CurrencyCode = 'PKR', options?: { showSign?: boolean; showCents?: boolean }): string {
  const safeCode = (currencyCode && SUPPORTED_CURRENCIES[currencyCode]) ? currencyCode : 'PKR';
  const config = SUPPORTED_CURRENCIES[safeCode];
  const num = typeof amount === 'number' && Number.isFinite(amount) ? amount : (Number(amount) || 0);
  const isNegative = num < 0;
  const absAmount = Math.abs(num);
  
  // Format with thousands separator
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: options?.showCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const sign = options?.showSign ? (isNegative ? '-' : '+') : (isNegative ? '-' : '');
  return `${sign}${config.symbol} ${formattedNumber}`;
}
