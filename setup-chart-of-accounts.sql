-- Basic Chart of Accounts Setup for QMS
-- Run this in Supabase SQL Editor

-- Clear existing accounts (optional - remove if you want to keep existing data)
-- DELETE FROM chart_of_accounts;

-- Assets
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
('1000', 'ASSETS', 'asset', true),
('1100', 'Current Assets', 'asset', true),
('1110', 'Cash and Cash Equivalents', 'asset', true),
('1111', 'Petty Cash', 'asset', true),
('1112', 'Bank Account - Current', 'asset', true),
('1113', 'Bank Account - Savings', 'asset', true),
('1120', 'Accounts Receivable', 'asset', true),
('1121', 'Trade Receivables', 'asset', true),
('1122', 'Other Receivables', 'asset', true),
('1130', 'Inventory', 'asset', true),
('1131', 'Raw Materials', 'asset', true),
('1132', 'Work in Progress', 'asset', true),
('1133', 'Finished Goods', 'asset', true),
('1134', 'Spare Parts', 'asset', true),
('1140', 'Prepaid Expenses', 'asset', true),
('1141', 'Prepaid Insurance', 'asset', true),
('1142', 'Prepaid Rent', 'asset', true),

-- Fixed Assets
('1200', 'Non-Current Assets', 'asset', true),
('1210', 'Property, Plant & Equipment', 'asset', true),
('1211', 'Land', 'asset', true),
('1212', 'Building', 'asset', true),
('1213', 'Machinery & Equipment', 'asset', true),
('1214', 'Furniture & Fixtures', 'asset', true),
('1215', 'Vehicles', 'asset', true),
('1216', 'Computer Equipment', 'asset', true),
('1220', 'Accumulated Depreciation', 'asset', true),
('1221', 'Accumulated Depreciation - Building', 'asset', true),
('1222', 'Accumulated Depreciation - Machinery', 'asset', true),
('1223', 'Accumulated Depreciation - Furniture', 'asset', true),
('1224', 'Accumulated Depreciation - Vehicles', 'asset', true),
('1225', 'Accumulated Depreciation - Computer Equipment', 'asset', true);

-- Liabilities
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
('2000', 'LIABILITIES', 'liability', true),
('2100', 'Current Liabilities', 'liability', true),
('2110', 'Accounts Payable', 'liability', true),
('2111', 'Trade Payables', 'liability', true),
('2112', 'Other Payables', 'liability', true),
('2120', 'Accrued Expenses', 'liability', true),
('2121', 'Accrued Salaries', 'liability', true),
('2122', 'Accrued Interest', 'liability', true),
('2123', 'Accrued Utilities', 'liability', true),
('2130', 'Tax Liabilities', 'liability', true),
('2131', 'GST/VAT Payable', 'liability', true),
('2132', 'Income Tax Payable', 'liability', true),
('2133', 'Payroll Tax Payable', 'liability', true),
('2140', 'Short-term Loans', 'liability', true),
('2141', 'Bank Overdraft', 'liability', true),
('2142', 'Credit Card Payable', 'liability', true),

-- Long-term Liabilities
('2200', 'Non-Current Liabilities', 'liability', true),
('2210', 'Long-term Loans', 'liability', true),
('2211', 'Bank Loan', 'liability', true),
('2212', 'Equipment Loan', 'liability', true),
('2220', 'Other Long-term Liabilities', 'liability', true);

-- Equity
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
('3000', 'EQUITY', 'equity', true),
('3100', 'Owner\'s Equity', 'equity', true),
('3110', 'Share Capital', 'equity', true),
('3120', 'Retained Earnings', 'equity', true),
('3130', 'Current Year Earnings', 'equity', true),
('3140', 'Owner\'s Drawings', 'equity', true);

-- Revenue
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
('4000', 'REVENUE', 'revenue', true),
('4100', 'Sales Revenue', 'revenue', true),
('4110', 'Product Sales', 'revenue', true),
('4111', 'Raw Material Sales', 'revenue', true),
('4112', 'Finished Goods Sales', 'revenue', true),
('4113', 'Spare Parts Sales', 'revenue', true),
('4120', 'Service Revenue', 'revenue', true),
('4121', 'Consulting Services', 'revenue', true),
('4122', 'Maintenance Services', 'revenue', true),
('4130', 'Other Revenue', 'revenue', true),
('4131', 'Interest Income', 'revenue', true),
('4132', 'Rental Income', 'revenue', true),
('4133', 'Foreign Exchange Gain', 'revenue', true),
('4134', 'Discount Received', 'revenue', true);

-- Expenses
INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active) VALUES
('5000', 'COST OF GOODS SOLD', 'expense', true),
('5100', 'Direct Materials', 'expense', true),
('5110', 'Raw Material Purchases', 'expense', true),
('5111', 'Raw Material A', 'expense', true),
('5112', 'Raw Material B', 'expense', true),
('5120', 'Direct Labor', 'expense', true),
('5121', 'Production Labor', 'expense', true),
('5122', 'Contract Labor', 'expense', true),
('5130', 'Manufacturing Overhead', 'expense', true),
('5131', 'Factory Utilities', 'expense', true),
('5132', 'Factory Rent', 'expense', true),
('5133', 'Equipment Depreciation', 'expense', true),

('6000', 'OPERATING EXPENSES', 'expense', true),
('6100', 'Selling Expenses', 'expense', true),
('6110', 'Sales Salaries', 'expense', true),
('6111', 'Sales Commission', 'expense', true),
('6112', 'Marketing Expenses', 'expense', true),
('6113', 'Advertising', 'expense', true),
('6114', 'Travel & Entertainment', 'expense', true),
('6120', 'Delivery Expenses', 'expense', true),
('6121', 'Freight Out', 'expense', true),
('6122', 'Packaging', 'expense', true),

('6200', 'Administrative Expenses', 'expense', true),
('6210', 'Office Expenses', 'expense', true),
('6211', 'Office Rent', 'expense', true),
('6212', 'Office Utilities', 'expense', true),
('6213', 'Office Supplies', 'expense', true),
('6214', 'Telephone & Internet', 'expense', true),
('6215', 'Insurance', 'expense', true),
('6220', 'Professional Services', 'expense', true),
('6221', 'Legal Fees', 'expense', true),
('6222', 'Accounting Fees', 'expense', true),
('6223', 'Consulting Fees', 'expense', true),
('6230', 'Employee Expenses', 'expense', true),
('6231', 'Salaries & Wages', 'expense', true),
('6232', 'Employee Benefits', 'expense', true),
('6233', 'Training & Development', 'expense', true),

('6300', 'Other Expenses', 'expense', true),
('6310', 'Financial Expenses', 'expense', true),
('6311', 'Interest Expense', 'expense', true),
('6312', 'Bank Charges', 'expense', true),
('6313', 'Foreign Exchange Loss', 'expense', true),
('6320', 'Miscellaneous Expenses', 'expense', true),
('6321', 'Bad Debt Expense', 'expense', true),
('6322', 'Depreciation Expense', 'expense', true),
('6323', 'Repairs & Maintenance', 'expense', true),
('6324', 'License & Permits', 'expense', true);

-- Update parent relationships (optional - for hierarchical structure)
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1000') WHERE account_code = '1100';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1000') WHERE account_code = '1200';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2000') WHERE account_code = '2100';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2000') WHERE account_code = '2200';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '3000') WHERE account_code = '3100';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5000') WHERE account_code = '5100';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5000') WHERE account_code = '5120';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5000') WHERE account_code = '5130';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '6000') WHERE account_code = '6100';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '6000') WHERE account_code = '6200';
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE account_code = '6000') WHERE account_code = '6300';

-- Verify the setup
SELECT account_code, account_name, account_type, is_active 
FROM chart_of_accounts 
ORDER BY account_code;
