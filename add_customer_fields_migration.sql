-- Migration script to add new fields to customers table
-- Add customer_ref_no and customer_type fields
-- Run this on your Supabase database

-- Add customer_ref_no column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'customer_ref_no'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN customer_ref_no character varying;
  END IF;
END $$;

-- Add customer_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customers' 
    AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN customer_type character varying;
  END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name IN ('customer_ref_no', 'customer_type', 'fax')
ORDER BY column_name;
