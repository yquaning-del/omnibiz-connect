import React from 'react';
import { toast as sonnerToast } from 'sonner';

// Compatibility shim: maps the shadcn { title, description, variant } API to Sonner
type ToastOptions = {
  title?: string;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
};

function toast(options: ToastOptions) {
  const title = options.title || '';
  const desc = options.description ? String(options.description) : undefined;
  if (options.variant === 'destructive') {
    return sonnerToast.error(title, { description: desc });
  }
  return sonnerToast.success(title, { description: desc });
}

function useToast() {
  return { toast, toasts: [] as never[] };
}

export { useToast, toast };
