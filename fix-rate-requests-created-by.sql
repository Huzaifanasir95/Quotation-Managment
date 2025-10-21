-- Fix the created_by constraint to allow NULL values
-- Run this in Supabase SQL Editor if you still get errors

-- Make created_by nullable in rate_requests table
ALTER TABLE public.rate_requests 
  ALTER COLUMN created_by DROP NOT NULL;

-- Update the foreign key constraint to handle NULL properly
ALTER TABLE public.rate_requests
  DROP CONSTRAINT IF EXISTS rate_requests_created_by_fkey,
  ADD CONSTRAINT rate_requests_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES public.users(id) 
    ON DELETE SET NULL;

-- Verify the change
SELECT 
  column_name, 
  is_nullable,
  data_type 
FROM information_schema.columns 
WHERE table_name = 'rate_requests' 
  AND column_name = 'created_by';

-- Should show: created_by | YES | uuid
