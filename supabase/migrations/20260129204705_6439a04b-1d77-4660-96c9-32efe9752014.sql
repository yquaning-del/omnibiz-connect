-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for unit photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-photos', 'unit-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for documents bucket (private - org members only)
CREATE POLICY "Org members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Org members can view their documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Org members can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- RLS policies for unit-photos bucket (public read, org write)
CREATE POLICY "Anyone can view unit photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'unit-photos');

CREATE POLICY "Org members can upload unit photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'unit-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Org members can delete unit photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'unit-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id IN (SELECT get_user_org_ids(auth.uid()))
  )
);

-- Add photos array column to property_units if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_units' 
    AND column_name = 'photos'
  ) THEN
    ALTER TABLE public.property_units ADD COLUMN photos TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Create tenant_documents table
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_documents
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_documents
CREATE POLICY "Managers can manage tenant documents"
ON public.tenant_documents FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'org_admin', 'location_manager')
  )
);

CREATE POLICY "Users can view tenant documents in their org"
ON public.tenant_documents FOR SELECT
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Tenants can view their own documents
CREATE POLICY "Tenants can view own documents"
ON public.tenant_documents FOR SELECT
USING (
  tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);