-- Admin Audit Logs table for tracking all admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster querying
CREATE INDEX idx_admin_audit_logs_admin_user ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Only super admins can insert audit logs
CREATE POLICY "Super admins can create audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Platform Metrics table for caching aggregated platform data
CREATE TABLE public.platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vertical TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_type, metric_date, vertical)
);

-- Create indexes for platform metrics
CREATE INDEX idx_platform_metrics_type_date ON platform_metrics(metric_type, metric_date DESC);
CREATE INDEX idx_platform_metrics_vertical ON platform_metrics(vertical);

-- Enable RLS
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Only super admins can view platform metrics
CREATE POLICY "Super admins can view platform metrics"
ON public.platform_metrics
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Only super admins can manage platform metrics
CREATE POLICY "Super admins can manage platform metrics"
ON public.platform_metrics
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Add updated_at trigger for platform_metrics
CREATE TRIGGER update_platform_metrics_updated_at
BEFORE UPDATE ON public.platform_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Admin impersonation sessions table
CREATE TABLE public.admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_organization_id UUID REFERENCES public.organizations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Create indexes
CREATE INDEX idx_impersonation_admin ON admin_impersonation_sessions(admin_user_id);
CREATE INDEX idx_impersonation_active ON admin_impersonation_sessions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage impersonation sessions
CREATE POLICY "Super admins can manage impersonation sessions"
ON public.admin_impersonation_sessions
FOR ALL
USING (public.is_super_admin(auth.uid()));