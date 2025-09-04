-- Database Performance Optimization: Indexes and Query Improvements
-- Run these commands on your Supabase PostgreSQL database

-- ============================================================================
-- INDEXES FOR SEARCH OPTIMIZATION
-- ============================================================================

-- Customers table indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_customers_email_search ON customers USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_customers_contact_search ON customers USING gin(to_tsvector('english', contact_person));
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Composite index for common customer queries
CREATE INDEX IF NOT EXISTS idx_customers_status_created ON customers(status, created_at DESC);

-- Vendors table indexes (similar pattern)
CREATE INDEX IF NOT EXISTS idx_vendors_name_search ON vendors USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_vendors_email_search ON vendors USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at DESC);

-- ============================================================================
-- QUOTATIONS TABLE OPTIMIZATION
-- ============================================================================

-- Quotations indexes for filtering and pagination
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);

-- Composite indexes for common quotation queries
CREATE INDEX IF NOT EXISTS idx_quotations_status_created ON quotations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_status ON quotations(customer_id, status);

-- Full-text search on quotation descriptions
CREATE INDEX IF NOT EXISTS idx_quotations_description_search ON quotations USING gin(to_tsvector('english', description));

-- ============================================================================
-- LEDGER ENTRIES OPTIMIZATION
-- ============================================================================

-- Ledger entries indexes for accounting queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference_type ON ledger_entries(reference_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_status ON ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference_number ON ledger_entries(reference_number);

-- Composite indexes for common ledger queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type_date ON ledger_entries(reference_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_status_date ON ledger_entries(status, entry_date DESC);

-- Financial calculations optimization
CREATE INDEX IF NOT EXISTS idx_ledger_entries_debit_credit ON ledger_entries(total_debit, total_credit);

-- ============================================================================
-- DOCUMENTS TABLE OPTIMIZATION
-- ============================================================================

-- Documents indexes for file management
CREATE INDEX IF NOT EXISTS idx_documents_entity_type ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_ocr_status ON documents(ocr_status);

-- Full-text search on OCR content
CREATE INDEX IF NOT EXISTS idx_documents_ocr_search ON documents USING gin(to_tsvector('english', ocr_text));

-- ============================================================================
-- SALES ORDERS OPTIMIZATION
-- ============================================================================

-- Sales orders indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quotation_id ON sales_orders(quotation_id);

-- Composite index for order tracking
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_date ON sales_orders(status, order_date DESC);

-- ============================================================================
-- PRODUCTS TABLE OPTIMIZATION
-- ============================================================================

-- Products indexes for inventory and search
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Price and inventory optimization
CREATE INDEX IF NOT EXISTS idx_products_price ON products(unit_price);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

-- ============================================================================
-- QUOTATION ITEMS OPTIMIZATION
-- ============================================================================

-- Quotation items for N+1 query prevention
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product_id ON quotation_items(product_id);

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

-- Users table optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Create a view for monitoring slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC;

-- Create a view for index usage monitoring
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ============================================================================
-- MAINTENANCE COMMANDS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE customers;
ANALYZE vendors;
ANALYZE quotations;
ANALYZE ledger_entries;
ANALYZE documents;
ANALYZE sales_orders;
ANALYZE products;
ANALYZE quotation_items;

-- Note: Run VACUUM ANALYZE periodically to maintain performance
-- VACUUM ANALYZE;
