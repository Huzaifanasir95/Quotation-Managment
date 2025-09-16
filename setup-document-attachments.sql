-- Document Attachments Table Setup and Sample Data
-- Run this script in your Supabase SQL editor to ensure the table exists and has sample data

-- Ensure the document_attachments table exists with correct structure
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference_type character varying NOT NULL,
  reference_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_path character varying NOT NULL,
  file_size integer,
  mime_type character varying,
  uploaded_by uuid,
  uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  document_type character varying,
  linked_reference_type character varying,
  linked_reference_number character varying,
  linked_reference_id uuid,
  customer_id uuid,
  vendor_id uuid,
  business_entity_id uuid,
  compliance_status character varying DEFAULT 'pending'::character varying CHECK (compliance_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'under_review'::character varying]::text[])),
  compliance_notes text,
  ocr_status character varying DEFAULT 'pending'::character varying CHECK (ocr_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
  document_date date,
  expiry_date date,
  issuing_authority character varying,
  country_of_origin character varying,
  notes text,
  CONSTRAINT document_attachments_pkey PRIMARY KEY (id)
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add business_entity_id foreign key if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'document_attachments_business_entity_id_fkey'
  ) THEN
    ALTER TABLE public.document_attachments 
    ADD CONSTRAINT document_attachments_business_entity_id_fkey 
    FOREIGN KEY (business_entity_id) REFERENCES public.business_entities(id);
  END IF;

  -- Add customer_id foreign key if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'document_attachments_customer_id_fkey'
  ) THEN
    ALTER TABLE public.document_attachments 
    ADD CONSTRAINT document_attachments_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  END IF;

  -- Add vendor_id foreign key if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'document_attachments_vendor_id_fkey'
  ) THEN
    ALTER TABLE public.document_attachments 
    ADD CONSTRAINT document_attachments_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);
  END IF;

  -- Add uploaded_by foreign key if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'document_attachments_uploaded_by_fkey'
  ) THEN
    ALTER TABLE public.document_attachments 
    ADD CONSTRAINT document_attachments_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id);
  END IF;
END $$;

-- Insert sample documents if table is empty (optional - remove if you don't want sample data)
INSERT INTO public.document_attachments (
  reference_type,
  reference_id,
  file_name,
  file_path,
  file_size,
  mime_type,
  document_type,
  linked_reference_type,
  linked_reference_number,
  compliance_status,
  ocr_status,
  document_date,
  country_of_origin,
  notes
)
SELECT 
  'sample',
  gen_random_uuid(),
  'sample_bill_of_lading.pdf',
  '/uploads/sample_bill_of_lading.pdf',
  245760,
  'application/pdf',
  'bill_of_lading',
  'purchase_order',
  'PO-2024-001',
  'approved',
  'completed',
  CURRENT_DATE - INTERVAL '5 days',
  'China',
  'Sample Bill of Lading document for testing'
WHERE NOT EXISTS (SELECT 1 FROM public.document_attachments LIMIT 1)

UNION ALL

SELECT 
  'sample',
  gen_random_uuid(),
  'sample_commercial_invoice.pdf',
  '/uploads/sample_commercial_invoice.pdf',
  189440,
  'application/pdf',
  'commercial_invoice',
  'sales_order',
  'SO-2024-002',
  'pending',
  'processing',
  CURRENT_DATE - INTERVAL '3 days',
  'India',
  'Sample Commercial Invoice document for testing'
WHERE NOT EXISTS (SELECT 1 FROM public.document_attachments LIMIT 1)

UNION ALL

SELECT 
  'sample',
  gen_random_uuid(),
  'sample_packing_list.pdf',
  '/uploads/sample_packing_list.pdf',
  156320,
  'application/pdf',
  'packing_list',
  'quotation',
  'Q-2024-003',
  'under_review',
  'completed',
  CURRENT_DATE - INTERVAL '1 day',
  'USA',
  'Sample Packing List document for testing'
WHERE NOT EXISTS (SELECT 1 FROM public.document_attachments LIMIT 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_attachments_document_type ON public.document_attachments(document_type);
CREATE INDEX IF NOT EXISTS idx_document_attachments_compliance_status ON public.document_attachments(compliance_status);
CREATE INDEX IF NOT EXISTS idx_document_attachments_uploaded_at ON public.document_attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_document_attachments_customer_id ON public.document_attachments(customer_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_vendor_id ON public.document_attachments(vendor_id);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_attachments TO authenticated;
-- GRANT USAGE ON SCHEMA public TO authenticated;

-- Display table info
SELECT 
  'Document Attachments Table Setup Complete' as status,
  COUNT(*) as total_documents
FROM public.document_attachments;