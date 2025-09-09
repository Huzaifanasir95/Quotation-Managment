-- Create a storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;

-- Create RLS policies for the documents bucket
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to view documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to delete documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to update documents" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');
