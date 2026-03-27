
-- Add missing FK constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_patient_id_fkey'
  ) THEN
    ALTER TABLE public.prescriptions
      ADD CONSTRAINT prescriptions_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_folios_reservation_id_fkey'
  ) THEN
    ALTER TABLE public.guest_folios
      ADD CONSTRAINT guest_folios_reservation_id_fkey
      FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;
  END IF;
END $$;
