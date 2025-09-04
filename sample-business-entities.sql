-- Sample Business Entities for QMS System
-- Run this script to populate the business_entities table with sample data

INSERT INTO public.business_entities (name, legal_name, gst_number, tax_id, address, city, state, country, postal_code, phone, email, is_active) VALUES
('ABC Manufacturing Ltd.', 'ABC Manufacturing Private Limited', '27AABCA1234A1Z5', 'AABCA1234A', '123 Industrial Area, Sector 15', 'Gurgaon', 'Haryana', 'India', '122001', '+91-124-4567890', 'info@abcmanufacturing.com', true),
('XYZ Exports Pvt Ltd', 'XYZ Exports Private Limited', '19AABCX5678B1Z2', 'AABCX5678B', '456 Export House, Nehru Place', 'New Delhi', 'Delhi', 'India', '110019', '+91-11-2345678', 'exports@xyzexports.com', true),
('Global Trade Corp', 'Global Trade Corporation', '29AABCG9012C1Z8', 'AABCG9012C', '789 Trade Center, Bandra Kurla Complex', 'Mumbai', 'Maharashtra', 'India', '400051', '+91-22-9876543', 'contact@globaltrade.com', true),
('TechnoImport Solutions', 'TechnoImport Solutions Private Limited', '33AABCT3456D1Z1', 'AABCT3456D', '321 Tech Park, Electronic City', 'Bangalore', 'Karnataka', 'India', '560100', '+91-80-1234567', 'solutions@technoimport.com', true),
('Premier Logistics Ltd', 'Premier Logistics Limited', '24AABCP7890E1Z4', 'AABCP7890E', '654 Logistics Hub, Whitefield', 'Bangalore', 'Karnataka', 'India', '560066', '+91-80-8765432', 'logistics@premierlogistics.com', true);
