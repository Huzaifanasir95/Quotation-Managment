-- SQL Script to Create Rate Request Tables
-- Run this in your Supabase SQL Editor
-- These tables are required for the Vendor Category Rate Request feature

-- =============================================
-- 1. CREATE rate_requests TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.rate_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_number character varying NOT NULL UNIQUE,
  category_id uuid NOT NULL,
  quotation_id uuid,
  quotation_item_id uuid,
  request_type character varying DEFAULT 'category'::character varying CHECK (request_type::text = ANY (ARRAY['category'::character varying::text, 'specific_item'::character varying::text])),
  title character varying NOT NULL,
  description text,
  quantity numeric,
  unit_of_measure character varying,
  specifications jsonb,
  deadline date,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'sent'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text])),
  created_by uuid NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  sent_at timestamp without time zone,
  CONSTRAINT rate_requests_pkey PRIMARY KEY (id),
  CONSTRAINT rate_requests_quotation_item_id_fkey FOREIGN KEY (quotation_item_id) REFERENCES public.quotation_items(id) ON DELETE CASCADE,
  CONSTRAINT rate_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT rate_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE CASCADE,
  CONSTRAINT rate_requests_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_requests_category_id ON public.rate_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_rate_requests_quotation_id ON public.rate_requests(quotation_id);
CREATE INDEX IF NOT EXISTS idx_rate_requests_status ON public.rate_requests(status);
CREATE INDEX IF NOT EXISTS idx_rate_requests_created_at ON public.rate_requests(created_at DESC);

-- =============================================
-- 2. CREATE rate_request_vendors TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.rate_request_vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rate_request_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'sent'::character varying::text, 'responded'::character varying::text, 'declined'::character varying::text])),
  sent_at timestamp without time zone,
  responded_at timestamp without time zone,
  email_sent boolean DEFAULT false,
  whatsapp_sent boolean DEFAULT false,
  response_data jsonb,
  quoted_price numeric,
  quoted_delivery_time integer,
  vendor_notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rate_request_vendors_pkey PRIMARY KEY (id),
  CONSTRAINT rate_request_vendors_rate_request_id_fkey FOREIGN KEY (rate_request_id) REFERENCES public.rate_requests(id) ON DELETE CASCADE,
  CONSTRAINT rate_request_vendors_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT rate_request_vendors_unique UNIQUE (rate_request_id, vendor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_request_vendors_rate_request_id ON public.rate_request_vendors(rate_request_id);
CREATE INDEX IF NOT EXISTS idx_rate_request_vendors_vendor_id ON public.rate_request_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_rate_request_vendors_status ON public.rate_request_vendors(status);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.rate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_request_vendors ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. CREATE RLS POLICIES
-- =============================================

-- Policy: Allow authenticated users to read all rate requests
CREATE POLICY "Allow authenticated users to read rate requests" 
  ON public.rate_requests FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Allow authenticated users to create rate requests
CREATE POLICY "Allow authenticated users to create rate requests" 
  ON public.rate_requests FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy: Allow authenticated users to update rate requests
CREATE POLICY "Allow authenticated users to update rate requests" 
  ON public.rate_requests FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy: Allow authenticated users to delete rate requests
CREATE POLICY "Allow authenticated users to delete rate requests" 
  ON public.rate_requests FOR DELETE 
  TO authenticated 
  USING (true);

-- Policy: Allow authenticated users to read all rate request vendors
CREATE POLICY "Allow authenticated users to read rate request vendors" 
  ON public.rate_request_vendors FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Allow authenticated users to create rate request vendors
CREATE POLICY "Allow authenticated users to create rate request vendors" 
  ON public.rate_request_vendors FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy: Allow authenticated users to update rate request vendors
CREATE POLICY "Allow authenticated users to update rate request vendors" 
  ON public.rate_request_vendors FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy: Allow authenticated users to delete rate request vendors
CREATE POLICY "Allow authenticated users to delete rate request vendors" 
  ON public.rate_request_vendors FOR DELETE 
  TO authenticated 
  USING (true);

-- =============================================
-- 5. GRANT PERMISSIONS
-- =============================================
GRANT ALL ON public.rate_requests TO authenticated;
GRANT ALL ON public.rate_request_vendors TO authenticated;
GRANT ALL ON public.rate_requests TO service_role;
GRANT ALL ON public.rate_request_vendors TO service_role;

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this after executing the above to verify tables were created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('rate_requests', 'rate_request_vendors');

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
-- If no errors appeared, the tables have been created successfully!
-- You can now use the Vendor Category Rate Request feature.
