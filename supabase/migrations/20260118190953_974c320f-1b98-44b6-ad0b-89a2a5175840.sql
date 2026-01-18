-- Track user login sessions for DAU/WAU/MAU calculations
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Only super admins can view all sessions
CREATE POLICY "Super admins can view all sessions"
  ON public.user_sessions
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Users can insert their own session
CREATE POLICY "Users can insert own session"
  ON public.user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for efficient date-based queries
CREATE INDEX idx_user_sessions_logged_in_at ON public.user_sessions(logged_in_at DESC);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('payment_failed', 'new_signup', 'subscription_upgrade', 'subscription_cancel', 'support_ticket', 'system_alert')),
  title TEXT NOT NULL,
  message TEXT,
  target_type TEXT, -- 'organization', 'user', 'subscription'
  target_id UUID,
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only super admins can access notifications
CREATE POLICY "Super admins can manage notifications"
  ON public.admin_notifications
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Add index for unread notifications
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read, created_at DESC) WHERE is_read = false;

-- Add is_suspended column to profiles for user suspension functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Create function to log user sessions automatically
CREATE OR REPLACE FUNCTION public.log_user_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the session when a user logs in
  INSERT INTO public.user_sessions (user_id, logged_in_at)
  VALUES (NEW.id, now())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to calculate platform metrics
CREATE OR REPLACE FUNCTION public.calculate_platform_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  calculated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_total_orgs INTEGER;
  v_total_users INTEGER;
  v_active_subs INTEGER;
  v_trial_subs INTEGER;
  v_paid_subs INTEGER;
  v_mrr NUMERIC;
  v_dau INTEGER;
  v_wau INTEGER;
  v_mau INTEGER;
  v_trial_conversion NUMERIC;
  v_churn_rate NUMERIC;
BEGIN
  -- Total organizations
  SELECT COUNT(*) INTO v_total_orgs FROM organizations;
  
  -- Total users
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  
  -- Subscription counts
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('active', 'trialing')),
    COUNT(*) FILTER (WHERE status = 'trialing'),
    COUNT(*) FILTER (WHERE status = 'active')
  INTO v_active_subs, v_trial_subs, v_paid_subs
  FROM organization_subscriptions;
  
  -- Calculate MRR
  SELECT COALESCE(SUM(sp.price_monthly), 0) INTO v_mrr
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.status = 'active';
  
  -- DAU (Daily Active Users) - users who logged in today
  SELECT COUNT(DISTINCT user_id) INTO v_dau
  FROM user_sessions
  WHERE logged_in_at >= CURRENT_DATE;
  
  -- WAU (Weekly Active Users) - users who logged in this week
  SELECT COUNT(DISTINCT user_id) INTO v_wau
  FROM user_sessions
  WHERE logged_in_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- MAU (Monthly Active Users) - users who logged in this month
  SELECT COUNT(DISTINCT user_id) INTO v_mau
  FROM user_sessions
  WHERE logged_in_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Trial conversion rate (trials that became paid / total completed trials)
  SELECT CASE 
    WHEN COUNT(*) FILTER (WHERE status IN ('active', 'canceled', 'expired')) > 0 
    THEN (COUNT(*) FILTER (WHERE status = 'active')::NUMERIC / 
          COUNT(*) FILTER (WHERE status IN ('active', 'canceled', 'expired'))::NUMERIC) * 100
    ELSE 0
  END INTO v_trial_conversion
  FROM organization_subscriptions
  WHERE trial_ends_at < NOW();
  
  -- Churn rate (canceled in last 30 days / active at start of period)
  SELECT CASE
    WHEN (SELECT COUNT(*) FROM organization_subscriptions WHERE status = 'active') > 0
    THEN (COUNT(*) FILTER (WHERE cancelled_at >= CURRENT_DATE - INTERVAL '30 days')::NUMERIC / 
          NULLIF((SELECT COUNT(*) FROM organization_subscriptions WHERE status = 'active'), 0)::NUMERIC) * 100
    ELSE 0
  END INTO v_churn_rate
  FROM organization_subscriptions;

  -- Return all metrics
  RETURN QUERY
  SELECT 'total_organizations'::TEXT, v_total_orgs::NUMERIC, NOW()
  UNION ALL SELECT 'total_users'::TEXT, v_total_users::NUMERIC, NOW()
  UNION ALL SELECT 'active_subscriptions'::TEXT, v_active_subs::NUMERIC, NOW()
  UNION ALL SELECT 'trial_subscriptions'::TEXT, v_trial_subs::NUMERIC, NOW()
  UNION ALL SELECT 'paid_subscriptions'::TEXT, v_paid_subs::NUMERIC, NOW()
  UNION ALL SELECT 'mrr'::TEXT, v_mrr::NUMERIC, NOW()
  UNION ALL SELECT 'dau'::TEXT, v_dau::NUMERIC, NOW()
  UNION ALL SELECT 'wau'::TEXT, v_wau::NUMERIC, NOW()
  UNION ALL SELECT 'mau'::TEXT, v_mau::NUMERIC, NOW()
  UNION ALL SELECT 'trial_conversion_rate'::TEXT, ROUND(v_trial_conversion, 2)::NUMERIC, NOW()
  UNION ALL SELECT 'churn_rate'::TEXT, ROUND(v_churn_rate, 2)::NUMERIC, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;