import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SMSType = 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'general';

interface SMSData {
  to: string;
  message: string;
  type?: SMSType;
}

export function useSMSNotifications() {
  const { currentOrganization } = useAuth();

  const sendSMS = useCallback(async ({ to, message, type = 'general' }: SMSData): Promise<boolean> => {
    if (!to) {
      console.error('No phone number provided for SMS');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to, message, type },
      });

      if (error) throw error;

      if (data.demo) {
        console.log('Demo SMS sent:', data.preview);
      }

      return true;
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }, []);

  const sendOrderConfirmation = useCallback(async (
    phone: string,
    orderDetails: { orderNumber: string; total: string; itemCount: number }
  ) => {
    const message = `Order Confirmed! Your order #${orderDetails.orderNumber} for ${orderDetails.total} (${orderDetails.itemCount} item${orderDetails.itemCount > 1 ? 's' : ''}) has been received. Thank you for shopping with ${currentOrganization?.name || 'us'}!`;
    
    return sendSMS({
      to: phone,
      message,
      type: 'order_confirmation',
    });
  }, [sendSMS, currentOrganization]);

  const sendOrderShipped = useCallback(async (
    phone: string,
    orderDetails: { orderNumber: string; trackingNumber?: string }
  ) => {
    let message = `Your order #${orderDetails.orderNumber} has been shipped!`;
    if (orderDetails.trackingNumber) {
      message += ` Tracking: ${orderDetails.trackingNumber}`;
    }
    message += ` - ${currentOrganization?.name || 'Team'}`;
    
    return sendSMS({
      to: phone,
      message,
      type: 'order_shipped',
    });
  }, [sendSMS, currentOrganization]);

  const sendOrderDelivered = useCallback(async (
    phone: string,
    orderDetails: { orderNumber: string }
  ) => {
    const message = `Great news! Your order #${orderDetails.orderNumber} has been delivered. Thank you for choosing ${currentOrganization?.name || 'us'}!`;
    
    return sendSMS({
      to: phone,
      message,
      type: 'order_delivered',
    });
  }, [sendSMS, currentOrganization]);

  return {
    sendSMS,
    sendOrderConfirmation,
    sendOrderShipped,
    sendOrderDelivered,
  };
}
