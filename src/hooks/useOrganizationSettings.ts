import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';

export interface OrganizationSettings {
  taxRate: number;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  businessHours?: {
    open: string;
    close: string;
  };
  paymentMethods?: string[];
}

const DEFAULT_SETTINGS: OrganizationSettings = {
  taxRate: 0.10, // 10%
  currency: 'USD',
  currencySymbol: '$',
  timezone: 'America/New_York',
  dateFormat: 'MM/dd/yyyy',
  paymentMethods: ['cash', 'card', 'mobile_money'],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

export function useOrganizationSettings() {
  const { currentOrganization } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const orgSettings = currentOrganization.settings as Record<string, unknown> || {};
    
    setSettings({
      taxRate: typeof orgSettings.taxRate === 'number' ? orgSettings.taxRate : DEFAULT_SETTINGS.taxRate,
      currency: typeof orgSettings.currency === 'string' ? orgSettings.currency : DEFAULT_SETTINGS.currency,
      currencySymbol: CURRENCY_SYMBOLS[orgSettings.currency as string] || DEFAULT_SETTINGS.currencySymbol,
      timezone: typeof orgSettings.timezone === 'string' ? orgSettings.timezone : DEFAULT_SETTINGS.timezone,
      dateFormat: typeof orgSettings.dateFormat === 'string' ? orgSettings.dateFormat : DEFAULT_SETTINGS.dateFormat,
      businessHours: orgSettings.businessHours as OrganizationSettings['businessHours'],
      paymentMethods: Array.isArray(orgSettings.paymentMethods) ? orgSettings.paymentMethods : DEFAULT_SETTINGS.paymentMethods,
    });
    
    setLoading(false);
  }, [currentOrganization]);

  const updateSettings = useCallback(async (updates: Partial<OrganizationSettings>) => {
    if (!currentOrganization) return { error: new Error('No organization selected') };

    const newSettings = { ...settings, ...updates };
    
    // Update currency symbol if currency changed
    if (updates.currency) {
      newSettings.currencySymbol = CURRENCY_SYMBOLS[updates.currency] || updates.currency;
    }

    const { error } = await supabase
      .from('organizations')
      .update({ 
        settings: {
          ...(currentOrganization.settings as Record<string, unknown>),
          ...newSettings,
        }
      })
      .eq('id', currentOrganization.id);

    if (!error) {
      setSettings(newSettings);
    }

    return { error };
  }, [currentOrganization, settings]);

  const formatCurrency = useCallback((amount: number): string => {
    return `${settings.currencySymbol}${amount.toFixed(2)}`;
  }, [settings.currencySymbol]);

  const calculateTax = useCallback((subtotal: number): number => {
    return subtotal * settings.taxRate;
  }, [settings.taxRate]);

  const calculateTotal = useCallback((subtotal: number, discount: number = 0): { tax: number; total: number } => {
    const discountedSubtotal = subtotal - discount;
    const tax = calculateTax(discountedSubtotal);
    return {
      tax,
      total: discountedSubtotal + tax,
    };
  }, [calculateTax]);

  return {
    settings,
    loading,
    updateSettings,
    formatCurrency,
    calculateTax,
    calculateTotal,
    currencySymbols: CURRENCY_SYMBOLS,
  };
}
