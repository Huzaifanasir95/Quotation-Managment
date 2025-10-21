-- Quick fix: Make created_by nullable so it doesn't require a user
-- Run this single line in Supabase SQL Editor

ALTER TABLE public.rate_requests ALTER COLUMN created_by DROP NOT NULL;
