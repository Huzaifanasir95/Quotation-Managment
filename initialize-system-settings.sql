-- Initialize system_settings table with default terms and conditions
INSERT INTO system_settings (
  default_terms,
  quotation_terms,
  invoice_terms,
  purchase_order_terms,
  default_currency,
  default_tax_rate,
  quotation_number_format,
  invoice_number_format,
  email_notifications,
  sms_notifications,
  created_at,
  updated_at
) VALUES (
  '1. Payment is due within 30 days of invoice date.
2. All prices are in USD and exclude shipping.
3. Products are subject to availability.
4. Returns accepted within 14 days with original packaging.
5. Late payments may incur additional charges.
6. Delivery terms as per agreement.',
  
  '1. This quotation is valid for 30 days from the date of issue.
2. Prices are subject to change without notice.
3. Payment terms: 50% advance, 50% on delivery.
4. Delivery time: 7-14 business days after order confirmation.',
  
  '1. Payment is due within 30 days of invoice date.
2. Late payment charges: 2% per month.
3. All disputes must be raised within 7 days of invoice date.
4. Goods once sold cannot be returned without prior approval.',
  
  '1. Delivery as per agreed schedule.
2. Quality as per specifications.
3. Payment terms as agreed.
4. Penalties for delayed delivery may apply.',
  
  'USD',
  18.0,
  'Q-YYYY-###',
  'INV-YYYY-###',
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;
