-- Sample Chart of Accounts for QMS System
-- Insert these into the chart_of_accounts table to test ledger functionality

INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
-- Assets
('1000', 'Cash in Hand', 'asset', true),
('1001', 'Bank Account - Current', 'asset', true),
('1002', 'Bank Account - Savings', 'asset', true),
('1100', 'Accounts Receivable', 'asset', true),
('1200', 'Inventory - Raw Materials', 'asset', true),
('1201', 'Inventory - Finished Goods', 'asset', true),
('1300', 'Office Equipment', 'asset', true),
('1301', 'Computer Equipment', 'asset', true),

-- Liabilities
('2000', 'Accounts Payable', 'liability', true),
('2100', 'GST Payable', 'liability', true),
('2101', 'Income Tax Payable', 'liability', true),
('2200', 'Short Term Loans', 'liability', true),
('2300', 'Accrued Expenses', 'liability', true),

-- Equity
('3000', 'Owner Equity', 'equity', true),
('3100', 'Retained Earnings', 'equity', true),

-- Revenue
('4000', 'Sales Revenue', 'revenue', true),
('4001', 'Service Revenue', 'revenue', true),
('4100', 'Other Income', 'revenue', true),
('4101', 'Interest Income', 'revenue', true),

-- Expenses
('5000', 'Cost of Goods Sold', 'expense', true),
('5100', 'Office Supplies', 'expense', true),
('5101', 'Utilities', 'expense', true),
('5102', 'Rent Expense', 'expense', true),
('5103', 'Telephone Expense', 'expense', true),
('5200', 'Marketing Expenses', 'expense', true),
('5300', 'Travel Expenses', 'expense', true),
('5400', 'Professional Fees', 'expense', true),
('5500', 'Bank Charges', 'expense', true),
('5600', 'Depreciation Expense', 'expense', true);
