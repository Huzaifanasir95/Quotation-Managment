-- Add custom item fields to quotation_items table
ALTER TABLE quotation_items
ADD COLUMN is_custom BOOLEAN DEFAULT FALSE,
ADD COLUMN actual_price DECIMAL(12,2),
ADD COLUMN profit_percent DECIMAL(5,2),
ADD COLUMN gst_percent DECIMAL(5,2),
ADD COLUMN rate_per_unit DECIMAL(12,2),
ADD COLUMN custom_description TEXT,
ADD COLUMN total DECIMAL(12,2);

-- Update existing records to have is_custom = FALSE
UPDATE quotation_items SET is_custom = FALSE WHERE is_custom IS NULL;

-- Add index for better performance on is_custom queries
CREATE INDEX idx_quotation_items_is_custom ON quotation_items(is_custom);

-- Add a comment to the table describing the changes
COMMENT ON TABLE quotation_items IS 'Stores quotation line items, including both inventory and custom items. Custom items have additional fields for pricing calculations.';

-- Add comments on the new columns
COMMENT ON COLUMN quotation_items.is_custom IS 'Indicates if this is a custom item (TRUE) or an inventory item (FALSE)';
COMMENT ON COLUMN quotation_items.actual_price IS 'Base price before profit margin and GST for custom items';
COMMENT ON COLUMN quotation_items.profit_percent IS 'Profit percentage applied to custom items';
COMMENT ON COLUMN quotation_items.gst_percent IS 'GST percentage for custom items';
COMMENT ON COLUMN quotation_items.rate_per_unit IS 'Final rate per unit including profit and GST for custom items';
COMMENT ON COLUMN quotation_items.custom_description IS 'Detailed description for custom items';
COMMENT ON COLUMN quotation_items.total IS 'Total amount for the line item after all calculations';