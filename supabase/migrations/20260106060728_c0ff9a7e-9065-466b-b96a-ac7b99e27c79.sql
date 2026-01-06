-- Ensure organizations.created_by is always set for reliable onboarding
ALTER TABLE public.organizations
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Backfill existing organizations that are missing created_by (best-effort)
UPDATE public.organizations o
SET created_by = (
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.organization_id = o.id
  ORDER BY ur.created_at ASC
  LIMIT 1
)
WHERE o.created_by IS NULL;