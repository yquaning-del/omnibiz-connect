-- Create tables table for restaurant floor plan
CREATE TABLE public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  shape TEXT NOT NULL DEFAULT 'square',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_id, table_number)
);

-- Enable RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_tables
CREATE POLICY "Users can view tables in their locations" ON public.restaurant_tables
  FOR SELECT USING (location_id IN (SELECT public.get_user_location_ids(auth.uid())));

CREATE POLICY "Managers can manage tables" ON public.restaurant_tables
  FOR ALL USING (
    location_id IN (
      SELECT location_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'org_admin', 'location_manager')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_restaurant_tables_updated_at 
  BEFORE UPDATE ON public.restaurant_tables 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();