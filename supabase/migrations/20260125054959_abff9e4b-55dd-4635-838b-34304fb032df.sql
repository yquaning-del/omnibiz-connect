-- Add lease_number column to leases table
ALTER TABLE public.leases 
  ADD COLUMN lease_number TEXT;

-- Add index for faster lookups
CREATE INDEX idx_leases_lease_number ON public.leases(lease_number);