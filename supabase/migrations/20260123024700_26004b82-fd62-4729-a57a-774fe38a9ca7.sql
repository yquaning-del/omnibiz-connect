-- Fix PHI access logs policy to require authentication
DROP POLICY IF EXISTS "Service role can insert PHI access logs" ON phi_access_logs;

-- Allow authenticated users to log their own access (more secure than true)
CREATE POLICY "Authenticated users can log PHI access" 
ON phi_access_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);