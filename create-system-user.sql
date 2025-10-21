-- Create a system/admin user for backend operations
-- Run this in Supabase SQL Editor

-- First, check if any users exist
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- If no users exist, create a system admin user
  IF user_count = 0 THEN
    INSERT INTO public.users (
      id,
      email,
      first_name,
      last_name,
      role,
      password,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'system@anoosh.com',
      'System',
      'Admin',
      'admin',
      'admin123', -- Change this in production!
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'System admin user created successfully';
  ELSE
    RAISE NOTICE 'Users already exist, skipping system user creation';
  END IF;
END $$;

-- Verify the system user exists
SELECT id, email, first_name, last_name, role 
FROM public.users 
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR email = 'system@anoosh.com';
