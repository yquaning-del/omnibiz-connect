-- Create data_migrations table to track import jobs
CREATE TABLE public.data_migrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  migration_type TEXT NOT NULL,
  source_file_name TEXT,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_log JSONB DEFAULT '[]'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  imported_record_ids JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's migrations"
  ON public.data_migrations
  FOR SELECT
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create migrations for their organization"
  ON public.data_migrations
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update their organization's migrations"
  ON public.data_migrations
  FOR UPDATE
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Add updated_at trigger
CREATE TRIGGER update_data_migrations_updated_at
  BEFORE UPDATE ON public.data_migrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_data_migrations_org ON public.data_migrations(organization_id);
CREATE INDEX idx_data_migrations_status ON public.data_migrations(status);