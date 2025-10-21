-- Add missing fields to sales_orders table for order conversion
-- Run this in your Supabase SQL Editor

ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR DEFAULT '30';

-- Add check constraint for priority
ALTER TABLE public.sales_orders
DROP CONSTRAINT IF EXISTS sales_orders_priority_check;

ALTER TABLE public.sales_orders
ADD CONSTRAINT sales_orders_priority_check 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add comment for documentation
COMMENT ON COLUMN public.sales_orders.priority IS 'Order priority level: low, normal, high, urgent';
COMMENT ON COLUMN public.sales_orders.shipping_cost IS 'Additional shipping cost for the order';
COMMENT ON COLUMN public.sales_orders.shipping_address IS 'Delivery address for the order';
COMMENT ON COLUMN public.sales_orders.billing_address IS 'Billing address for the order';
COMMENT ON COLUMN public.sales_orders.payment_terms IS 'Payment terms in days (e.g., 30, 60, etc.)';
