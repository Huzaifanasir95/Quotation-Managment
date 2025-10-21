-- Quick verification query to check if rate request tables exist
-- Run this in Supabase SQL Editor to check table status

SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rate_requests', 'rate_request_vendors')
ORDER BY table_name;

-- If you see both tables with ✅ EXISTS, you're good to go!
-- If you see ❌ MISSING, run the create-rate-request-tables.sql script first.
