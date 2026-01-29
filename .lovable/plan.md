

# Configure Paystack for Live Revenue Collection

## What You Need

Before proceeding, you'll need to get these credentials from your [Paystack Dashboard](https://dashboard.paystack.com):

### 1. Secret Key
- Go to **Settings → API Keys & Webhooks**
- Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)

### 2. Webhook Secret
- Go to **Settings → API Keys & Webhooks → Webhook URL**
- Set your webhook URL to: `https://kjkmoxoossrtvxlywhro.supabase.co/functions/v1/paystack-webhook`
- Copy the **Webhook Secret Key** shown after saving

## Implementation Steps

### Step 1: Add PAYSTACK_SECRET_KEY
Add your Paystack secret key to enable payment initialization. This key authenticates your server-side API calls to Paystack.

### Step 2: Add PAYSTACK_WEBHOOK_SECRET  
Add your webhook secret to enable secure payment confirmation. This ensures only legitimate Paystack notifications are processed.

## What Gets Enabled

Once configured, the following features will go live:

| Feature | Current State | After Configuration |
|---------|---------------|---------------------|
| Subscription Payments | Demo mode (simulated) | Real Paystack checkout |
| Tenant Rent Payments | Manual recording only | Online card/mobile money |
| Webhook Processing | Skips verification | HMAC-SHA512 validated |
| Transaction Status | Always succeeds | Real payment status |

## Payment Flow After Configuration

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   User      │────▶│  paystack-payment│────▶│  Paystack   │
│   clicks    │     │  Edge Function   │     │  Checkout   │
│   "Pay"     │     │  (uses secret)   │     │  Page       │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                    │
                                                    ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Subscription│◀────│ paystack-webhook │◀────│  Payment    │
│  Activated  │     │ (verifies sig)   │     │  Complete   │
└─────────────┘     └──────────────────┘     └─────────────┘
```

## Security Notes

- Secret keys are stored encrypted and never exposed to the frontend
- Webhook signature verification prevents fraudulent payment confirmations
- All transactions are logged in the `payment_transactions` table for audit

## Recommendation

Start with **test mode keys** (`sk_test_...`) to verify the integration works correctly, then switch to **live mode keys** (`sk_live_...`) when ready to accept real payments.

