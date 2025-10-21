-- Fix document_attachments table to allow NULL for uploaded_by
-- This is needed when we don't have user authentication context

-- Make uploaded_by nullable if it isn't already
ALTER TABLE public.document_attachments 
ALTER COLUMN uploaded_by DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.document_attachments.uploaded_by IS 'User who uploaded the document (nullable for system uploads)';

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'document_attachments' 
AND column_name = 'uploaded_by';
