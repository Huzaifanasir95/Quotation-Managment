-- =====================================================
-- Database Migration for Quotation Items
-- Run this in Supabase SQL Editor
-- Date: October 20, 2025
-- =====================================================

-- Add au_field column to quotation_items table
-- This field indicates whether an item is Alternative/Update (A/U)
ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS au_field character varying DEFAULT 'No' CHECK (au_field IN ('Yes', 'No'));

-- Add comment to explain the column
COMMENT ON COLUMN public.quotation_items.au_field IS 'Alternative/Update field indicator - Yes or No';

-- Verify the columns exist (for reference)
-- The following columns should already exist in quotation_items:
-- - category (character varying)
-- - serial_number (character varying)
-- - item_name (character varying)
-- - unit_of_measure (character varying)
-- - gst_percent (numeric)
-- - item_type (character varying with CHECK constraint)

-- Optional: Add index on commonly queried fields for better performance
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_type ON public.quotation_items(item_type);
CREATE INDEX IF NOT EXISTS idx_quotation_items_au_field ON public.quotation_items(au_field);

-- Verify the migration
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'quotation_items'
  AND column_name IN ('au_field', 'category', 'serial_number', 'item_name', 'unit_of_measure', 'gst_percent', 'item_type')
ORDER BY column_name;
