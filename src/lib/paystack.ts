/**
 * Paystack Inline Payment Integration
 * Loads Paystack inline JS script and provides payment popup functionality
 */

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackOptions) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number; // Amount in kobo/pesewas (smallest currency unit)
  currency?: string;
  ref: string;
  callback: (response: PaystackResponse) => void;
  onClose?: () => void;
  metadata?: Record<string, unknown>;
}

export interface PaystackResponse {
  reference: string;
  status: string;
  message?: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const scriptUrl = 'https://js.paystack.co/v1/inline.js';

/**
 * Loads Paystack inline JS script dynamically
 * @returns Promise that resolves when script is loaded
 */
export function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (scriptLoaded && window.PaystackPop) {
      resolve();
      return;
    }

    // If currently loading, wait for it
    if (scriptLoading) {
      const checkInterval = setInterval(() => {
        if (scriptLoaded && window.PaystackPop) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      scriptLoading = true;
      existingScript.addEventListener('load', () => {
        scriptLoaded = true;
        scriptLoading = false;
        resolve();
      });
      existingScript.addEventListener('error', () => {
        scriptLoading = false;
        reject(new Error('Failed to load Paystack script'));
      });
      return;
    }

    // Load the script
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Paystack script'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Opens Paystack payment popup
 * @param options Paystack payment options
 */
export async function openPaystackPopup(options: PaystackOptions): Promise<void> {
  try {
    // Ensure script is loaded
    await loadPaystackScript();

    if (!window.PaystackPop) {
      throw new Error('Paystack script not loaded');
    }

    // Open Paystack popup
    const handler = window.PaystackPop.setup(options);
    handler.openIframe();
  } catch (error) {
    console.error('Error opening Paystack popup:', error);
    throw error;
  }
}

/**
 * Converts amount to kobo/pesewas (smallest currency unit)
 * Paystack expects amounts in the smallest currency unit
 * @param amount Amount in major currency unit (e.g., 1000 for 1000 NGN)
 * @returns Amount in smallest currency unit (e.g., 100000 for 1000 NGN)
 */
export function convertToSmallestUnit(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Generates a unique transaction reference
 */
export function generateTransactionReference(): string {
  return `PSK_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}
