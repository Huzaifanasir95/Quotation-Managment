-- Sample Products for QMS System
-- Run this script to populate the products table with sample data

-- First, insert a sample product category if it doesn't exist
INSERT INTO public.product_categories (id, name, description, is_active) 
VALUES ('01234567-89ab-cdef-0123-456789abcdef', 'General Products', 'General product category for testing', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO public.products (
  id, sku, name, description, category_id, type, unit_of_measure, 
  current_stock, reorder_point, max_stock_level, last_purchase_price, 
  average_cost, selling_price, status
) VALUES 
(
  gen_random_uuid(), 
  'PRD-001', 
  'Steel Rod 12mm', 
  'High quality steel rod 12mm diameter', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'raw_material', 
  'meters', 
  500, 
  50, 
  1000, 
  150.00, 
  160.00, 
  200.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-002', 
  'Cement Bag 50kg', 
  'Portland Cement 50kg bag', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'raw_material', 
  'bags', 
  200, 
  20, 
  500, 
  400.00, 
  420.00, 
  500.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-003', 
  'Laptop Computer', 
  'Business laptop with 16GB RAM and 512GB SSD', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'finished_good', 
  'pieces', 
  25, 
  5, 
  50, 
  45000.00, 
  47000.00, 
  55000.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-004', 
  'Consultation Service', 
  'Technical consultation and advisory services', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'service', 
  'hours', 
  0, 
  0, 
  0, 
  2000.00, 
  2000.00, 
  2500.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-005', 
  'Electric Motor 5HP', 
  '5 Horsepower electric motor for industrial use', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'spare_parts', 
  'pieces', 
  10, 
  2, 
  20, 
  15000.00, 
  15500.00, 
  18000.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-006', 
  'PVC Pipe 4 inch', 
  'PVC drainage pipe 4 inch diameter', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'raw_material', 
  'meters', 
  1000, 
  100, 
  2000, 
  80.00, 
  85.00, 
  110.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-007', 
  'Office Chair', 
  'Ergonomic office chair with lumbar support', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'finished_good', 
  'pieces', 
  15, 
  3, 
  30, 
  3500.00, 
  3700.00, 
  4500.00, 
  'active'
),
(
  gen_random_uuid(), 
  'PRD-008', 
  'Installation Service', 
  'Product installation and setup service', 
  '01234567-89ab-cdef-0123-456789abcdef', 
  'service', 
  'hours', 
  0, 
  0, 
  0, 
  1500.00, 
  1500.00, 
  2000.00, 
  'active'
);
