-- Fix the incorrectly stored organization vertical
UPDATE public.organizations 
SET primary_vertical = 'pharmacy' 
WHERE id = 'e56cbd71-0aa9-431e-809a-481207712a5e';

-- Fix the incorrectly stored location vertical
UPDATE public.locations 
SET vertical = 'pharmacy' 
WHERE id = '39610206-bb2f-4d46-a955-4da96024803d';