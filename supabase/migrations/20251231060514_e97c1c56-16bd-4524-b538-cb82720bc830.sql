
-- Create housekeeping_tasks table
CREATE TABLE public.housekeeping_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL DEFAULT 'cleaning',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TIME,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for viewing tasks in user's locations
CREATE POLICY "Users can view housekeeping tasks in their locations"
ON public.housekeeping_tasks
FOR SELECT
USING (location_id IN (SELECT get_user_location_ids(auth.uid())));

-- Policy for managers to manage all tasks
CREATE POLICY "Managers can manage housekeeping tasks"
ON public.housekeeping_tasks
FOR ALL
USING (location_id IN (
  SELECT location_id FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('super_admin', 'org_admin', 'location_manager', 'department_lead')
));

-- Policy for staff to update their assigned tasks
CREATE POLICY "Staff can update their assigned tasks"
ON public.housekeeping_tasks
FOR UPDATE
USING (assigned_to = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_housekeeping_tasks_updated_at
BEFORE UPDATE ON public.housekeeping_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for housekeeping tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
