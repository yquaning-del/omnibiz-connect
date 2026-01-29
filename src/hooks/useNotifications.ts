import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type NotificationType = 'rent_reminder' | 'lease_expiry' | 'maintenance_update' | 'payment_confirmation';

interface NotificationData {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
}

export function useNotifications() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  const sendNotification = useCallback(async ({
    type,
    recipientEmail,
    recipientName,
    data,
  }: NotificationData): Promise<boolean> => {
    if (!currentOrganization) {
      console.error('No organization context for notifications');
      return false;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type,
          recipientEmail,
          recipientName,
          organizationName: currentOrganization.name,
          data,
        },
      });

      if (error) throw error;

      if (result.demo) {
        console.log('Demo notification sent:', result.preview);
      }

      return true;
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }, [currentOrganization]);

  const sendRentReminder = useCallback(async (
    tenant: { email: string; name: string; userId?: string },
    payment: { amount: string; dueDate: string; unitNumber: string }
  ) => {
    return sendNotification({
      type: 'rent_reminder',
      recipientEmail: tenant.email,
      recipientName: tenant.name,
      data: {
        userId: tenant.userId,
        amount: payment.amount,
        dueDate: payment.dueDate,
        unitNumber: payment.unitNumber,
      },
    });
  }, [sendNotification]);

  const sendLeaseExpiryReminder = useCallback(async (
    tenant: { email: string; name: string; userId?: string },
    lease: { expiryDate: string; unitNumber: string }
  ) => {
    return sendNotification({
      type: 'lease_expiry',
      recipientEmail: tenant.email,
      recipientName: tenant.name,
      data: {
        userId: tenant.userId,
        expiryDate: lease.expiryDate,
        unitNumber: lease.unitNumber,
      },
    });
  }, [sendNotification]);

  const sendMaintenanceUpdate = useCallback(async (
    tenant: { email: string; name: string; userId?: string },
    request: { requestId: string; title: string; status: string; notes?: string }
  ) => {
    return sendNotification({
      type: 'maintenance_update',
      recipientEmail: tenant.email,
      recipientName: tenant.name,
      data: {
        userId: tenant.userId,
        requestId: request.requestId,
        title: request.title,
        status: request.status,
        notes: request.notes,
      },
    });
  }, [sendNotification]);

  const sendPaymentConfirmation = useCallback(async (
    tenant: { email: string; name: string; userId?: string },
    payment: { amount: string; transactionId: string; date: string }
  ) => {
    return sendNotification({
      type: 'payment_confirmation',
      recipientEmail: tenant.email,
      recipientName: tenant.name,
      data: {
        userId: tenant.userId,
        amount: payment.amount,
        transactionId: payment.transactionId,
        date: payment.date,
      },
    });
  }, [sendNotification]);

  return {
    sendNotification,
    sendRentReminder,
    sendLeaseExpiryReminder,
    sendMaintenanceUpdate,
    sendPaymentConfirmation,
  };
}
