-- Check if business entities table exists and has data
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM business_entities;

-- Show all business entities if any exist
SELECT * FROM business_entities ORDER BY name;

-- Check table structure
\d business_entities;
