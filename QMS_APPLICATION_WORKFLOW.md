# QMS - Quotation Management System
## Complete Application Workflow Documentation

**Version:** 1.0  
**Last Updated:** October 3, 2025  
**Organization:** Anoosh International

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Database Schema](#database-schema)
4. [Core Workflows](#core-workflows)
5. [Module Breakdown](#module-breakdown)
6. [API Endpoints](#api-endpoints)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Business Process Flows](#business-process-flows)

---

## System Overview

QMS (Quotation Management System) is a comprehensive enterprise resource planning (ERP) solution designed specifically for managing the complete sales-to-cash cycle, procurement, inventory, and financial accounting operations.

### Key Capabilities

- **Sales Management**: Customer management, quotation creation, order processing
- **Procurement**: Vendor management, purchase orders, vendor bill tracking
- **Inventory Management**: Product tracking, stock levels, reorder points
- **Financial Accounting**: Ledger entries, chart of accounts, P&L reports
- **Invoice Management**: Both receivable (customer) and payable (vendor) invoices
- **Document Management**: Attachment handling for all business documents
- **Reporting & Analytics**: Comprehensive reports and dashboards
- **Multi-customer Quotations**: Create quotations for multiple customers simultaneously

---

## Architecture & Technology Stack

### Frontend
- **Framework**: Next.js 15.5.2 (React with App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.1.12
- **State Management**: React Hooks, React Query
- **Forms**: React Hook Form
- **Charts**: Recharts for data visualization
- **PDF Generation**: jsPDF and jspdf-autotable for document generation

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with JWT tokens
- **API Architecture**: RESTful API
- **File Storage**: Supabase Storage for document attachments

### Deployment
- **Platform**: Vercel (Frontend + Serverless Functions)
- **CI/CD**: GitHub Actions for automated deployment
- **Environment**: Production and Development environments

### Project Structure

```
QMS/
├── api/                          # Production API (Vercel serverless)
│   ├── index.js                  # Main API file with all endpoints
│   ├── routes/                   # Modular route files
│   │   ├── customers.js          # Customer CRUD operations
│   │   └── documents.js          # Document attachment operations
│   └── package.json
│
├── qms-backend/                  # Localhost backend (structured)
│   ├── src/
│   │   ├── server.js
│   │   ├── config/               # Configuration files
│   │   ├── middleware/           # Auth, validation, error handling
│   │   └── routes/               # Modular route handlers
│   └── package.json
│
├── qms-frontend/                 # Next.js frontend application
│   ├── app/
│   │   ├── accounting/           # Accounting module pages
│   │   ├── components/           # Reusable React components
│   │   ├── dashboard/            # Dashboard pages
│   │   ├── import-export/        # Import/Export functionality
│   │   ├── inventory/            # Inventory management
│   │   ├── invoices/             # Receivable invoices (customer)
│   │   ├── payable-invoices/     # Payable invoices (vendor bills)
│   │   ├── purchases/            # Purchase orders
│   │   ├── reports/              # Reporting module
│   │   ├── sales/                # Sales & quotations
│   │   ├── settings/             # System settings
│   │   └── lib/                  # Utility functions & API client
│   └── middleware.ts             # Authentication middleware
│
└── database-schema.sql           # Complete database schema
```

---

## Database Schema

The system uses PostgreSQL with a comprehensive relational database design:

### Core Tables

#### 1. **business_entities**
Represents different legal entities/companies within the organization.
```sql
- id (uuid, PK)
- name, legal_name
- gst_number, tax_id
- contact details (address, phone, email)
- logo_url
```

#### 2. **customers**
Customer master data for sales operations.
```sql
- id (uuid, PK)
- name, contact_person
- email, phone, fax
- address fields (city, state, country, postal_code)
- credit_limit, payment_terms (default 30 days)
- status (active/inactive/suspended)
```

#### 3. **vendors**
Supplier/vendor information for procurement.
```sql
- id (uuid, PK)
- name, contact_person
- email, phone
- address fields
- payment_terms
- status (active/inactive)
```

#### 4. **products**
Product catalog and inventory tracking.
```sql
- id (uuid, PK)
- sku (unique), name, description
- category_id (FK to product_categories)
- type (raw_material/finished_good/service/spare_parts)
- unit_of_measure
- current_stock, reorder_point, max_stock_level
- pricing (last_purchase_price, average_cost, selling_price)
- status (active/inactive/discontinued)
```

#### 5. **quotations**
Customer quotations/quotes.
```sql
- id (uuid, PK)
- quotation_number (unique, format: Q-YYYY-NNNNN)
- customer_id (FK to customers)
- business_entity_id (FK to business_entities)
- quotation_date, valid_until
- status (draft/sent/approved/rejected/expired/converted)
- financial fields (subtotal, tax_amount, discount_amount, total_amount)
- terms_conditions, notes
- workflow fields (created_by, approved_by, approved_at)
```

#### 6. **quotation_items**
Line items for each quotation.
```sql
- id (uuid, PK)
- quotation_id (FK to quotations)
- product_id (FK to products, nullable)
- description (text)
- quantity, unit_price
- discount_percent, tax_percent
- line_total (calculated)
```

#### 7. **sales_orders**
Sales orders converted from quotations.
```sql
- id (uuid, PK)
- order_number (unique, format: SO-YYYY-NNN)
- quotation_id (FK to quotations, nullable)
- customer_id (FK to customers)
- order_date, expected_delivery_date, delivery_date
- status (pending/confirmed/processing/shipped/delivered/invoiced/cancelled)
- financial fields (subtotal, tax_amount, discount_amount, total_amount)
- invoice_generated (boolean flag)
- delivery_notes
```

#### 8. **sales_order_items**
Line items for sales orders.
```sql
- id (uuid, PK)
- sales_order_id (FK to sales_orders)
- product_id (FK to products, nullable)
- description, quantity, unit_price
- discount_percent, tax_percent, line_total
```

#### 9. **invoices** (Receivable/Customer Invoices)
Invoices issued to customers for payment collection.
```sql
- id (uuid, PK)
- invoice_number (unique, format: INV-YYYY-NNN)
- sales_order_id (FK to sales_orders, nullable)
- customer_id (FK to customers)
- invoice_date, due_date
- status (draft/sent/paid/overdue/cancelled)
- financial fields (subtotal, tax_amount, discount_amount, total_amount, paid_amount)
- fbr_sync_status (pending/synced/failed) - for tax compliance
```

#### 10. **vendor_bills** (Payable/Vendor Invoices)
Bills received from vendors to be paid.
```sql
- id (uuid, PK)
- bill_number (unique)
- vendor_id (FK to vendors)
- purchase_order_id (FK to purchase_orders, nullable)
- bill_date, due_date
- status (draft/received/approved/paid/overdue/cancelled)
- financial fields (subtotal, tax_amount, total_amount, paid_amount)
```

#### 11. **purchase_orders**
Purchase orders issued to vendors.
```sql
- id (uuid, PK)
- po_number (unique, format: PO-YYYY-NNN)
- vendor_id (FK to vendors)
- quotation_id (FK to quotations, nullable) - links to customer quotation
- sales_order_id (FK to sales_orders, nullable)
- po_date, expected_delivery_date
- status (draft/pending_approval/approved/sent/received/closed/cancelled)
- financial fields
- terms_conditions, notes
```

#### 12. **document_attachments**
Universal document attachment system for all entities.
```sql
- id (uuid, PK)
- reference_type (quotation/invoice/purchase_order/etc.)
- reference_id (uuid) - ID of the parent record
- file_name, file_path, file_size, mime_type
- document_type (commercial_invoice/packing_list/certificate/etc.)
- compliance_status, ocr_status
- document_date, expiry_date
- customer_id, vendor_id (optional linking)
```

#### 13. **chart_of_accounts**
Accounting chart of accounts.
```sql
- id (uuid, PK)
- account_code (unique)
- account_name
- account_type (asset/liability/equity/revenue/expense)
- parent_id (FK self-reference for hierarchy)
```

#### 14. **ledger_entries**
Journal entries for double-entry bookkeeping.
```sql
- id (uuid, PK)
- entry_number (unique)
- entry_date
- reference_type, reference_id (links to source transaction)
- description
- total_debit, total_credit (must balance)
- status (draft/posted/reversed)
```

#### 15. **ledger_entry_lines**
Individual debit/credit lines for each ledger entry.
```sql
- id (uuid, PK)
- ledger_entry_id (FK to ledger_entries)
- account_id (FK to chart_of_accounts)
- debit_amount, credit_amount
- description
```

#### 16. **users**
System users with role-based access.
```sql
- id (uuid, PK)
- email, password_hash
- role (admin/sales/procurement/finance/auditor)
- first_name, last_name
- is_active
```

---

## Core Workflows

### 1. Complete Sales-to-Cash Cycle

```mermaid
Customer → Quotation → Sales Order → Delivery → Invoice → Payment → Ledger Entry
```

#### Step-by-Step Process:

**Phase 1: Customer Onboarding**
1. Navigate to **Sales** module
2. Click "Add New Customer" button
3. Fill multi-step form:
   - **Step 1**: Basic Information (name, contact person, email, phone)
   - **Step 2**: Address Details (street, city, state, country, postal code)
   - **Step 3**: Business Settings (credit limit, payment terms, GST number)
4. System validates email uniqueness
5. Customer record created with status = "active"

**Phase 2: Quotation Creation**
1. In **Sales** module, click "Create New Quotation"
2. Multi-step quotation wizard:
   
   **Step 1 - Customer Selection**:
   - Select one or multiple customers (supports bulk quotation creation)
   - Search customers by name, email, or contact person
   - Selected customers are highlighted
   
   **Step 2 - Items**:
   - Search and add products from inventory
   - Or manually enter custom line items
   - For each item:
     - Enter quantity (validates against available stock)
     - Set unit price
     - Apply discount percentage (optional)
     - Apply tax percentage (default 18%)
   - System automatically calculates:
     - Line total = (quantity × unit_price) - discount + tax
     - Subtotal = sum of all line amounts
     - Total discount amount
     - Total tax amount
     - Grand total
   
   **Step 3 - Terms & Conditions**:
   - Set quotation date (default: today)
   - Set validity period (default: 30 days)
   - Enter terms and conditions
   - Add notes
   
   **Step 4 - Attachments** (Optional):
   - Upload supporting documents (PDFs, images)
   - Link documents to quotation
   - Add document metadata
   
   **Step 5 - Review & Create**:
   - Preview all details
   - View calculated totals
   - Download PDF preview
   - Submit quotation

3. Backend Processing:
   - Generate unique quotation number (format: `Q-2025-00001`)
   - If multiple customers selected:
     - Create separate quotation for each customer
     - Each gets unique quotation number
     - Same items and terms for all
   - Insert quotation record with status = "draft"
   - Insert all quotation_items
   - Return success with created quotation IDs

**Phase 3: Quotation Management**
1. View all quotations in **Sales → Quotations** list
2. Available actions:
   - **View**: See complete quotation details with items
   - **Edit**: Modify quotation (if status = draft/sent)
   - **Send**: Mark as sent to customer (status → "sent")
   - **Approve**: Approve quotation (status → "approved")
   - **Download PDF**: Generate professional quotation PDF
   - **Convert to Order**: Create sales order from approved quotation
   - **Attach Documents**: Add supporting files

**Phase 4: Sales Order Conversion**
1. Select approved quotation
2. Click "Convert to Sales Order"
3. System performs validation:
   - Quotation must be in approved/accepted/sent status
   - Quotation cannot already be converted
   - Customer must be valid
   - Total amount must be > 0
4. Backend creates sales order:
   - Generate order number (format: `SO-2025-001`)
   - Copy customer_id, business_entity_id
   - Copy all financial amounts (subtotal, tax, discount, total)
   - Copy quotation items to sales_order_items
   - Set order_date = today
   - Set expected_delivery_date (if provided)
   - Set status = "pending"
   - Update original quotation status = "converted"
5. Sales order created and ready for fulfillment

**Phase 5: Order Fulfillment & Delivery**
1. View sales orders in **Orders** section
2. Update order status progression:
   - **Pending** → **Confirmed** → **Processing** → **Shipped** → **Delivered**
3. For delivery:
   - Set delivery date
   - Add delivery notes
   - Update status to "delivered"
4. System marks order as ready for invoicing

**Phase 6: Invoice Generation**
Three methods to create customer invoices:

**Method A: Manual Invoice Creation from Order**
1. Navigate to **Invoices** module
2. Click "Create Invoice from Order"
3. Select a delivered sales order
4. Set invoice date (default: today)
5. Set due date (default: +30 days)
6. Add notes (optional)
7. System generates invoice:
   - Invoice number (format: `INV-2025-001`)
   - Copies customer_id from order
   - Copies all order items to invoice_items
   - Copies financial amounts
   - Sets status = "draft"
   - Links to sales_order_id
8. Mark sales order as "invoiced"

**Method B: Auto-Generate Invoices**
1. Click "Auto-Generate Invoices" button
2. System finds all delivered orders without invoices
3. Automatically creates invoices for each:
   - Generates sequential invoice numbers
   - Sets due date = delivery_date + 30 days
   - Sets status = "sent"
   - Creates invoice items from order items
4. Returns count of generated invoices

**Method C: Manual Invoice (without order)**
1. Create new invoice directly
2. Select customer
3. Add invoice items manually
4. Set amounts and dates
5. Save invoice

**Phase 7: Payment & Collection**
1. View all customer invoices in **Invoices** module
2. Track invoice status:
   - **Draft**: Being prepared
   - **Sent**: Sent to customer
   - **Paid**: Payment received
   - **Overdue**: Past due date
3. Actions available:
   - **Send Reminder**: Email reminder to customer
   - **Send WhatsApp**: WhatsApp message with invoice details
   - **Mark as Paid**: Record payment receipt
   - **View Details**: Full invoice with items
4. When marking as paid:
   - Update status = "paid"
   - Set paid_amount = total_amount
   - Update payment date

**Phase 8: Accounting Entry**
1. System can automatically create ledger entries:
   - **On Invoice Creation**:
     - Debit: Accounts Receivable (customer owes money)
     - Credit: Sales Revenue
   - **On Payment Receipt**:
     - Debit: Cash/Bank Account
     - Credit: Accounts Receivable
2. View entries in **Accounting** module
3. All entries follow double-entry bookkeeping (debits = credits)

---

### 2. Procurement Workflow (Purchase-to-Pay)

```mermaid
Vendor → Purchase Order → Goods Receipt → Vendor Bill → Payment → Ledger
```

#### Step-by-Step Process:

**Phase 1: Vendor Management**
1. Navigate to **Purchases** module
2. Add vendor: name, contact, email, phone, address
3. Set payment terms
4. Mark as active

**Phase 2: Purchase Order Creation**
1. Click "Create Purchase Order"
2. Select vendor
3. Add items:
   - Select products or enter custom items
   - Specify quantity, unit price
   - Apply discounts/taxes
4. Set PO date and expected delivery date
5. Add terms and conditions
6. System generates PO number (format: `PO-2025-001`)
7. Status = "draft"

**Phase 3: PO Approval & Sending**
1. Review purchase order
2. Approve (status → "approved")
3. Send to vendor (status → "sent")
4. Track PO in system

**Phase 4: Goods Receipt**
1. When goods arrive, update PO status = "received"
2. Update received_quantity for each PO item
3. Optionally create delivery challan
4. Update inventory stock levels

**Phase 5: Vendor Bill Entry**
1. Navigate to **Payable Invoices** module
2. Two creation methods:

   **Method A: From Purchase Order**
   - Click "Create from Purchase Order"
   - Select received PO
   - Enter vendor's bill number
   - Set bill date and due date
   - System auto-populates items and amounts from PO
   - Save vendor bill
   
   **Method B: Direct Expense Bill**
   - Click "Create Expense Bill"
   - Select vendor
   - Enter bill number, dates
   - Select expense category
   - Enter amount
   - Add description
   - Save bill

3. Vendor bill created with status = "received"

**Phase 6: Bill Approval & Payment**
1. Review vendor bill details
2. Approve bill (status → "approved")
3. When paying:
   - Click "Record Payment"
   - Enter payment date
   - Enter payment method (cash/bank/check)
   - Enter paid amount
   - Add reference number
   - Save payment
4. System updates:
   - paid_amount += payment amount
   - If paid_amount >= total_amount: status = "paid"

**Phase 7: Accounting Entry**
- **On Bill Receipt**:
  - Debit: Expense Account (or Inventory for stock)
  - Credit: Accounts Payable (we owe vendor)
- **On Payment**:
  - Debit: Accounts Payable
  - Credit: Cash/Bank Account

---

### 3. Inventory Management Workflow

**Stock Tracking**:
1. Products added to system with:
   - Initial stock level
   - Reorder point (minimum stock alert)
   - Max stock level
2. Stock updates:
   - **Decrease**: When sales order is confirmed/delivered
   - **Increase**: When purchase order goods are received
3. Low stock alerts:
   - System tracks current_stock vs reorder_point
   - Dashboard shows low stock items
   - Reports highlight critical inventory

**Stock Movements**:
- View in **Inventory** module
- Track stock history
- See current stock levels
- Identify slow-moving items
- Calculate inventory value

---

### 4. Document Attachment Workflow

**Universal Attachment System**:
1. Documents can be attached to:
   - Quotations
   - Sales Orders
   - Invoices
   - Purchase Orders
   - Vendor Bills
   - Customers
   - Vendors

2. **Attachment Process**:
   - Click "Attach Document" on any record
   - Upload file (PDF, image, Excel, etc.)
   - Select document type:
     - Commercial Invoice
     - Packing List
     - Certificate of Origin
     - Bill of Lading
     - Quality Certificate
     - Other
   - Add metadata:
     - Document date
     - Expiry date (for certificates)
     - Issuing authority
     - Country of origin
     - Notes
   - Set compliance status (pending/approved/rejected)
   - Save attachment

3. **Storage**:
   - Files stored in Supabase Storage
   - Metadata in document_attachments table
   - Reference_type and reference_id link to parent record

4. **Retrieval**:
   - View all documents for an entity
   - Filter by document type
   - Download individual files
   - Track compliance status
   - OCR processing status (for future text extraction)

---

### 5. Financial Accounting Workflow

**Chart of Accounts**:
1. Predefined account structure:
   - **Assets** (1000-1999): Cash, Bank, Receivables, Inventory, Equipment
   - **Liabilities** (2000-2999): Payables, Loans, Tax Payables
   - **Equity** (3000-3999): Capital, Retained Earnings
   - **Revenue** (4000-4999): Sales, Service Income
   - **Expenses** (5000-5999): COGS, Salaries, Rent, Utilities

**Ledger Entry Creation**:
1. Navigate to **Accounting** module
2. Click "Add Ledger Entry"
3. Set entry date
4. Add description
5. Add multiple lines (must balance):
   - Select account from chart
   - Enter debit or credit amount
   - Add line description
6. Validate: Total Debits = Total Credits
7. Post entry (status = "posted")

**Financial Reports**:
1. **Profit & Loss (P&L)**:
   - Revenue (Credit side)
   - Less: Cost of Goods Sold
   - = Gross Profit
   - Less: Operating Expenses
   - = Net Profit/Loss
   - Generate for date range
   - Export to PDF/Excel

2. **Balance Sheet**:
   - Assets = Liabilities + Equity
   - Shows financial position at a point in time

3. **Receivables Aging**:
   - List of unpaid customer invoices
   - Grouped by age (0-30, 31-60, 61-90, 90+ days)
   - Total outstanding amount

4. **Payables Aging**:
   - List of unpaid vendor bills
   - Grouped by age
   - Total amount owed

5. **Cash Flow Statement**:
   - Operating activities
   - Investing activities
   - Financing activities

---

## Module Breakdown

### 1. Dashboard Module (`/dashboard`)

**Purpose**: Role-based overview of key metrics and quick actions

**Features**:
- **KPI Cards**:
  - Total quotations (by status)
  - Total sales orders
  - Revenue (current period)
  - Pending invoices count and amount
  - Low stock alerts
  - Overdue bills
  
- **Quick Actions**:
  - Create New Quotation
  - Create Invoice
  - View Pending Orders
  - Quick Reorder
  
- **Charts & Visualizations**:
  - Monthly revenue trend
  - Sales by customer
  - Order status breakdown
  - Inventory status pie chart
  
- **Recent Activities**:
  - Latest quotations
  - Recent invoices
  - Pending approvals
  
- **Role-Specific Views**:
  - **Admin**: Full system overview
  - **Sales**: Sales metrics and quotations
  - **Procurement**: Purchase orders and vendor bills
  - **Finance**: Financial metrics and aging reports
  - **Auditor**: Read-only access to all data

---

### 2. Sales Module (`/sales`)

**Purpose**: Complete sales operations management

**Main Components**:

**Customer Management**:
- List all customers with search/filter
- View customer details with quotation history
- Add/Edit/Delete customers
- Track customer credit limits
- View customer-specific metrics (total quotes, total orders, total revenue)

**Quotation Management**:
- Create new quotations (single or multiple customers)
- View all quotations with filtering:
  - By status (draft/sent/approved/rejected/expired/converted)
  - By date range
  - By customer
  - By amount range
- Edit existing quotations
- Generate quotation PDFs
- Send quotations via email/WhatsApp
- Approve/Reject quotations
- Convert to sales orders
- Track quotation validity periods
- View quotation items and attachments

**Sales Dashboard**:
- Sales metrics cards
- Top customers by revenue
- Quotation trends (monthly)
- Conversion rate (quotes to orders)
- Recent customer activities

**Modals/Dialogs**:
- `CreateQuotationModal`: 5-step wizard
- `AddCustomerModal`: Multi-step customer creation
- `EditCustomerModal`: Update customer details
- `ViewCustomerQuotesModal`: Customer-specific quotations
- `SearchQuotationsModal`: Advanced quotation search
- `ConvertQuoteModal`: Quote-to-order conversion
- `EditQuotationModal`: Modify existing quotations
- `QuotationTrendsModal`: Analytics and trends
- `TopCustomersModal`: Customer ranking

---

### 3. Purchases Module (`/purchases`)

**Purpose**: Procurement and vendor management

**Features**:

**Vendor Management**:
- List all vendors
- Add/Edit vendors
- View vendor purchase history
- Track vendor payment terms

**Purchase Orders**:
- Create new PO
- Link to sales order (for drop-shipping scenarios)
- Link to quotation (to fulfill customer order)
- Add PO items
- Set expected delivery dates
- Track PO status (draft → pending approval → approved → sent → received)
- Generate PO documents

**Goods Receipt**:
- Mark PO items as received
- Update received quantities
- Update inventory stock
- Create delivery challans

**PO-to-Quotation Linking**:
- When customer quotation requires procurement
- Create PO linked to customer quotation
- Track fulfillment chain

---

### 4. Invoices Module (`/invoices`)

**Purpose**: Accounts Receivable - Customer invoice management

**Features**:

**Invoice List**:
- View all customer invoices
- Filter by status (draft/sent/paid/overdue)
- Filter by customer
- Filter by date range
- Search by invoice number

**Invoice Creation**:
- **From Sales Order**:
  - Select delivered order
  - Auto-populate items and amounts
  - Set invoice and due dates
  - Generate invoice
  
- **Manual Invoice**:
  - Select customer
  - Add items manually
  - Calculate totals
  - Save invoice

- **Auto-Generate**:
  - Batch create invoices for all delivered orders
  - Sequential invoice numbering
  - Auto-set due dates

**Invoice Actions**:
- View invoice details with items
- Download invoice PDF
- Send invoice via email
- Send invoice via WhatsApp
- Send payment reminder
- Mark as paid (record payment)
- Track payment status

**FBR Integration** (Future):
- Sync with Federal Board of Revenue (Pakistan)
- Track sync status
- Handle sync failures

---

### 5. Payable Invoices Module (`/payable-invoices`)

**Purpose**: Accounts Payable - Vendor bill management

**Features**:

**Vendor Bills List**:
- View all vendor bills
- Filter by status (draft/received/approved/paid/overdue)
- Filter by vendor
- Filter by date range
- Search by bill number

**Bill Creation**:

**From Purchase Order**:
- Select received PO
- Enter vendor's bill number
- Auto-fill items from PO
- Verify amounts
- Save bill

**Direct Expense Bill**:
- For non-PO expenses
- Select vendor
- Select expense category
- Enter amount and details
- Save bill

**Manual Bill Entry**:
- Full manual entry
- Add multiple items
- Calculate taxes
- Save bill

**Bill Management**:
- View bill details
- Approve bills
- Record payments:
  - Payment date
  - Payment method
  - Payment amount
  - Reference number
- Track payment status
- Handle partial payments

**Aging Reports**:
- Bills due within 7 days
- Bills due within 30 days
- Overdue bills
- Aging summary

---

### 6. Inventory Module (`/inventory`)

**Purpose**: Stock and product management

**Features**:

**Product Management**:
- List all products with stock levels
- Add new products:
  - SKU (unique identifier)
  - Name, description
  - Category
  - Type (raw material/finished good/service/spare parts)
  - Unit of measure
- Edit product details
- Set reorder points
- Set max stock levels
- Update pricing

**Stock Tracking**:
- Current stock levels
- Stock movements history
- Low stock alerts
- Out of stock items
- Stock valuation (quantity × average cost)

**Stock Adjustments**:
- Manual stock adjustments
- Reasons: damaged, lost, found, correction
- Update current stock
- Create adjustment ledger entry

**Product Categories**:
- Hierarchical category structure
- Add/Edit categories
- Assign products to categories

**Inventory Reports**:
- Stock summary
- Low stock report
- Stock movement report
- Valuation report
- Reorder suggestions

---

### 7. Accounting Module (`/accounting`)

**Purpose**: Financial accounting and bookkeeping

**Features**:

**Ledger Entries**:
- View all ledger entries
- Filter by:
  - Entry date range
  - Reference type (sale/purchase/payment/adjustment)
  - Account type
- Tabs for quick filtering:
  - All Entries
  - Sales Ledger
  - Purchase Ledger
  - Expense Ledger
  - Payments

**Create Ledger Entry**:
- Manual journal entry creation
- Add multiple lines
- Validate double-entry (debits = credits)
- Link to source transaction
- Post entry

**Chart of Accounts**:
- View account hierarchy
- Add new accounts
- Edit account details
- Deactivate accounts
- Account code management

**Financial Metrics**:
- Total Sales
- Total Purchases
- Total Expenses
- Net Profit/Loss
- Accounts Receivable balance
- Accounts Payable balance
- Cash balance

**Reports**:

**Profit & Loss (P&L) Report**:
- Generate for date range
- Shows:
  - Revenue breakdown
  - Cost of Goods Sold
  - Gross Profit
  - Operating Expenses (salaries, rent, utilities, marketing, etc.)
  - Operating Income
  - Other Income/Expenses
  - Net Profit
- Export to PDF, Excel, or CSV
- Multi-currency support
- Comparison with previous period

**Balance Sheet**:
- Assets (Current + Fixed)
- Liabilities (Current + Long-term)
- Equity
- Balance equation verification

**Trial Balance**:
- All accounts with debit/credit balances
- Verify books balance
- Date range selection

**General Ledger Report**:
- Account-wise detailed transactions
- Opening balance + movements = closing balance

---

### 8. Reports Module (`/reports`)

**Purpose**: Comprehensive reporting and analytics

**Report Categories**:

**1. Sales Reports**:
- Monthly sales trend
- Sales by customer
- Sales by product
- Top customers by revenue
- Quotation conversion rate
- Sales order status breakdown

**2. Procurement Reports**:
- Monthly purchase trend
- Purchases by vendor
- Top vendors by spending
- PO status breakdown
- Vendor performance

**3. Financial Reports**:
- Revenue summary
- Expense breakdown
- Profit margins
- Cash flow overview
- Pending invoices (receivable)
- Pending bills (payable)

**4. Inventory Reports**:
- Stock summary
- Low stock items
- Out of stock items
- Stock valuation
- Stock movement history
- Critical items requiring immediate attention

**Report Features**:
- **Date Range Selection**: Day, Week, Month, Quarter, Year, Custom
- **Interactive Charts**: Bar charts, line charts, pie charts, area charts
- **Data Tables**: Sortable, filterable tables
- **Export Options**: PDF, Excel, CSV
- **Print Support**: Formatted for printing
- **Real-time Data**: Live updates from database

**Visualizations**:
- Uses Recharts library
- Responsive charts
- Customizable colors
- Tooltips and legends
- Drill-down capabilities

---

### 9. Settings Module (`/settings`)

**Purpose**: System configuration and user management

**Features**:

**Company Settings**:
- Business entity details
- Logo upload
- Tax IDs and registration numbers
- Default terms and conditions
- Default payment terms

**User Management**:
- List all users
- Add new users
- Edit user details
- Assign roles
- Activate/deactivate users
- Reset passwords

**System Settings**:
- Invoice number format
- Quotation number format
- PO number format
- Default tax rates
- Default discount rates
- Currency settings

**Email Settings** (Future):
- SMTP configuration
- Email templates
- Notification settings

**Integration Settings** (Future):
- FBR API credentials
- WhatsApp Business API
- Payment gateway settings

---

### 10. Import/Export Module (`/import-export`)

**Purpose**: Bulk data operations

**Features**:

**Import**:
- Import customers from CSV/Excel
- Import products from CSV/Excel
- Import vendors from CSV/Excel
- Template download for proper format
- Data validation on import
- Error reporting

**Export**:
- Export customers to CSV/Excel
- Export products with stock levels
- Export invoices
- Export ledger entries
- Export any report data
- Selectable columns
- Date range filtering

---

## API Endpoints

### Authentication Endpoints

**POST** `/api/v1/auth/login`
- Login with email and password
- Returns JWT token and user details
- Sets auth_token cookie

**GET** `/api/v1/auth/profile`
- Get current user profile
- Requires: Authorization Bearer token
- Returns user data and permissions

---

### Customer Endpoints

**GET** `/api/v1/customers`
- List all customers
- Query params: page, limit, search
- Returns paginated customer list

**GET** `/api/v1/customers/:id`
- Get single customer by ID
- Returns customer details

**POST** `/api/v1/customers`
- Create new customer
- Body: name, contact_person, email, phone, address fields, credit_limit, payment_terms
- Validates email uniqueness
- Returns created customer

**PUT** `/api/v1/customers/:id`
- Update existing customer
- Body: updated fields
- Returns updated customer

**DELETE** `/api/v1/customers/:id`
- Delete customer
- Checks for linked quotations
- Returns error if customer has quotations
- Deletes if no dependencies

---

### Quotation Endpoints

**GET** `/api/v1/quotations`
- List all quotations
- Query params: page, limit, search, status, customer_id, date_from, date_to
- Returns quotations with customer and items

**GET** `/api/v1/quotations/:id`
- Get single quotation
- Includes: customer details, items, business entity, documents
- Returns full quotation object

**POST** `/api/v1/quotations`
- Create new quotation(s)
- Body:
  ```json
  {
    "customers": [{"id": "customer-id"}], // or customer_id for single
    "quotation_date": "2025-01-15",
    "valid_until": "2025-02-15",
    "terms_conditions": "text",
    "notes": "text",
    "items": [
      {
        "product_id": "product-id",
        "description": "Item description",
        "quantity": 10,
        "unit_price": 100,
        "discount_percent": 5,
        "tax_percent": 18
      }
    ]
  }
  ```
- Generates quotation number
- Calculates totals
- Creates quotation_items
- Returns created quotation(s)

**PUT** `/api/v1/quotations/:id`
- Update existing quotation
- Body: updated quotation fields and items
- Deletes old items, creates new items
- Recalculates totals
- Returns updated quotation

**PATCH** `/api/v1/quotations/:id/status`
- Update quotation status
- Body: { "status": "sent/approved/rejected/expired" }
- Validates status transitions
- Returns updated quotation

**POST** `/api/v1/quotations/:id/convert-to-order`
- Convert quotation to sales order
- Body: { "expected_delivery": "2025-02-01", "notes": "text" }
- Validates quotation is approved
- Creates sales_order and sales_order_items
- Updates quotation status to "converted"
- Returns created sales order

---

### Sales Order Endpoints

**GET** `/api/v1/orders`
- List all sales orders
- Query params: page, limit, status, customer_id, date_from, date_to
- Returns orders with customer and items

**GET** `/api/v1/orders/:id`
- Get single sales order
- Includes: customer, items, quotation reference
- Returns full order object

**POST** `/api/v1/orders`
- Create new sales order (manual, not from quotation)
- Body: customer_id, order_date, items, etc.
- Generates order number
- Returns created order

**PUT** `/api/v1/orders/:id`
- Update sales order
- Body: updated fields
- Returns updated order

**PATCH** `/api/v1/orders/:id/status`
- Update order status
- Body: { "status": "confirmed/processing/shipped/delivered" }
- Returns updated order

**PATCH** `/api/v1/orders/:id/delivery-status`
- Update delivery information
- Body: { "delivery_status": "delivered", "delivery_date": "2025-01-20", "delivery_notes": "text" }
- Returns updated order

---

### Invoice Endpoints (Receivable)

**GET** `/api/v1/invoices`
- List all customer invoices
- Query params: page, limit, search, status, customer_id, fbr_sync_status, date_from, date_to
- Returns invoices with customer and items

**GET** `/api/v1/invoices/:id`
- Get single invoice
- Includes: customer, items, business entity, sales order reference
- Returns full invoice object

**POST** `/api/v1/invoices`
- Create new invoice manually
- Body: customer_id, invoice_date, due_date, items
- Generates invoice number
- Returns created invoice

**POST** `/api/v1/invoices/create-from-order`
- Create invoice from sales order
- Body: { "sales_order_id": "order-id", "invoice_date": "2025-01-20", "due_date": "2025-02-20", "notes": "text" }
- Copies items from order
- Marks order as invoiced
- Returns created invoice

**POST** `/api/v1/invoices/auto-generate`
- Auto-generate invoices for all delivered orders without invoices
- No body required
- Batch creates invoices
- Returns array of created invoices

**PATCH** `/api/v1/invoices/:id/mark-paid`
- Mark invoice as paid
- Body: { "paid_amount": 5000, "payment_date": "2025-01-25", "payment_method": "bank", "reference": "TXN123" }
- Updates invoice status
- Creates payment record
- Returns updated invoice

**POST** `/api/v1/invoices/:id/send-reminder`
- Send payment reminder to customer
- Sends email/SMS/WhatsApp
- Logs reminder activity
- Returns success status

---

### Vendor Bill Endpoints (Payable)

**GET** `/api/v1/vendor-bills`
- List all vendor bills
- Query params: page, limit, status, vendor_id, date_from, date_to
- Returns bills with vendor details

**GET** `/api/v1/vendor-bills/:id`
- Get single vendor bill
- Includes: vendor, items, PO reference
- Returns full bill object

**POST** `/api/v1/vendor-bills/create-from-po`
- Create vendor bill from purchase order
- Body: { "purchase_order_id": "po-id", "bill_number": "VEND-001", "bill_date": "2025-01-20", "due_date": "2025-02-20" }
- Copies items from PO
- Returns created bill

**POST** `/api/v1/vendor-bills/create-expense`
- Create expense bill (non-PO)
- Body: { "vendor_id": "vendor-id", "bill_number": "EXP-001", "bill_date": "2025-01-20", "expense_category": "rent", "total_amount": 5000 }
- Returns created expense bill

**POST** `/api/v1/vendor-bills`
- Create manual vendor bill
- Body: vendor_id, bill_number, bill_date, due_date, items
- Returns created bill

**PATCH** `/api/v1/vendor-bills/:id/record-payment`
- Record payment to vendor
- Body: { "paid_amount": 5000, "payment_date": "2025-01-25", "payment_method": "check", "reference": "CHK-123" }
- Updates bill status
- Creates payment record
- Returns updated bill

**GET** `/api/v1/vendor-bills/pending-pos`
- Get purchase orders ready for billing
- Returns POs with status = "received" and no linked bill

---

### Purchase Order Endpoints

**GET** `/api/v1/purchase-orders`
- List all purchase orders
- Query params: page, limit, status, vendor_id, date_from, date_to
- Returns POs with vendor and items

**GET** `/api/v1/purchase-orders/:id`
- Get single purchase order
- Includes: vendor, items, linked quotation/order
- Returns full PO object

**POST** `/api/v1/purchase-orders`
- Create new purchase order
- Body: vendor_id, po_date, expected_delivery_date, items, quotation_id (optional), sales_order_id (optional)
- Generates PO number
- Returns created PO

**PUT** `/api/v1/purchase-orders/:id`
- Update purchase order
- Body: updated fields
- Returns updated PO

**PATCH** `/api/v1/purchase-orders/:id/status`
- Update PO status
- Body: { "status": "approved/sent/received" }
- Returns updated PO

---

### Product Endpoints

**GET** `/api/v1/products`
- List all products
- Query params: page, limit, search, category_id, status
- Returns products with stock levels

**GET** `/api/v1/products/:id`
- Get single product
- Returns product details

**POST** `/api/v1/products`
- Create new product
- Body: sku, name, description, category_id, type, unit_of_measure, current_stock, reorder_point, selling_price
- Validates SKU uniqueness
- Returns created product

**PUT** `/api/v1/products/:id`
- Update product
- Body: updated fields
- Returns updated product

**PATCH** `/api/v1/products/:id/stock`
- Adjust product stock
- Body: { "adjustment": +50, "reason": "purchase received" } (or negative for sales)
- Updates current_stock
- Creates stock movement record
- Returns updated product

---

### Document Attachment Endpoints

**GET** `/api/documents/:entityType/:entityId`
- Get all documents for an entity
- entityType: quotation, invoice, purchase_order, sales_order, etc.
- Returns array of document attachments

**GET** `/api/documents/quotation/attachments?quotation_id=:id`
- Legacy endpoint for quotation documents
- Returns quotation attachments

**POST** `/api/documents/upload`
- Upload document attachment
- Body: FormData with file + metadata
- Uploads to Supabase Storage
- Creates document_attachments record
- Returns created document

**GET** `/api/documents/download/:id`
- Download document file
- Returns file stream

---

### Ledger & Accounting Endpoints

**GET** `/api/v1/ledger/entries`
- List all ledger entries
- Query params: page, limit, date_from, date_to, reference_type, status
- Returns entries with lines and account details

**GET** `/api/v1/ledger/entries/:id`
- Get single ledger entry
- Includes: all lines with account details
- Returns full entry object

**POST** `/api/v1/ledger/entries`
- Create manual ledger entry
- Body:
  ```json
  {
    "entry_date": "2025-01-20",
    "description": "Sales for January",
    "lines": [
      { "account_id": "account-1", "debit_amount": 10000, "description": "Cash" },
      { "account_id": "account-2", "credit_amount": 10000, "description": "Sales Revenue" }
    ]
  }
  ```
- Validates debits = credits
- Generates entry number
- Returns created entry

**GET** `/api/v1/ledger/accounts/chart`
- Get chart of accounts
- Returns hierarchical account structure

**GET** `/api/v1/ledger/metrics/financial`
- Get financial metrics summary
- Query params: date_from, date_to
- Returns: totalSales, totalPurchases, expenses, netProfit, pendingInvoices, pendingAmount

**GET** `/api/v1/ledger/metrics/accounting`
- Get comprehensive accounting metrics
- Returns:
  ```json
  {
    "receivables": { "count": 10, "totalAmount": 50000, "overdueCount": 2, "overdueAmount": 5000 },
    "payables": { "count": 8, "totalAmount": 30000, "overdueCount": 1, "overdueAmount": 3000 },
    "pnl": { "totalSales": 100000, "totalPurchases": 60000, "expenses": 20000, "netProfit": 20000 }
  }
  ```

---

### Dashboard Endpoints

**GET** `/api/v1/dashboard/sales`
- Get sales dashboard metrics
- Returns: quotations count, orders count, revenue, top customers

**GET** `/api/v1/dashboard/trends`
- Get quotation trends
- Query params: period (month/quarter/year)
- Returns monthly/quarterly trend data

**GET** `/api/v1/dashboard/kpis`
- Get key performance indicators
- Returns: pending quotations, active orders, total revenue, low stock items, overdue invoices

---

### Vendor Endpoints

**GET** `/api/v1/vendors`
- List all vendors
- Query params: page, limit, search
- Returns vendors list

**GET** `/api/v1/vendors/:id`
- Get single vendor
- Returns vendor details

**POST** `/api/v1/vendors`
- Create new vendor
- Body: name, contact_person, email, phone, address, payment_terms
- Returns created vendor

**PUT** `/api/v1/vendors/:id`
- Update vendor
- Body: updated fields
- Returns updated vendor

**DELETE** `/api/v1/vendors/:id`
- Delete vendor
- Checks for linked purchase orders
- Returns error if vendor has POs
- Deletes if no dependencies

---

### Settings Endpoints

**GET** `/api/v1/settings`
- Get all system settings
- Returns settings object

**PUT** `/api/v1/settings`
- Update system settings
- Body: settings object
- Returns updated settings

---

## User Roles & Permissions

### Role Hierarchy

1. **Admin** (Full Access)
2. **Sales Manager** (Sales Operations)
3. **Procurement Manager** (Purchasing Operations)
4. **Finance Manager** (Financial Operations)
5. **Auditor** (Read-Only Access)

---

### Permission Matrix

| Module | Admin | Sales | Procurement | Finance | Auditor |
|--------|-------|-------|-------------|---------|---------|
| Dashboard | Full | Limited | Limited | Limited | View Only |
| Sales/Quotations | Full | Full | View | View | View |
| Orders | Full | Full | View | View | View |
| Customers | Full | Full | View | View | View |
| Purchases | Full | View | Full | View | View |
| Vendors | Full | View | Full | View | View |
| Invoices (Receivable) | Full | Create/Edit | View | Full | View |
| Vendor Bills (Payable) | Full | View | Create/Edit | Full | View |
| Inventory | Full | View | Full | View | View |
| Accounting/Ledger | Full | View | View | Full | View |
| Reports | Full | View | View | View | View |
| Settings | Full | None | None | None | None |
| Import/Export | Full | Limited | Limited | Limited | None |

---

### Route Protection

**Middleware**: `middleware.ts` in qms-frontend

**Protected Routes**:
- `/dashboard`
- `/sales`
- `/purchases`
- `/inventory`
- `/invoices`
- `/payable-invoices`
- `/accounting`
- `/reports`
- `/settings`
- `/import-export`

**Public Routes**:
- `/` (Login page)

**Authentication Flow**:
1. User accesses protected route
2. Middleware checks for `auth_token` cookie
3. If no token → Redirect to login (`/`)
4. If token present → Validate with backend (`/api/v1/auth/profile`)
5. If valid → Allow access
6. If invalid → Clear token and redirect to login

**Token Storage**:
- Stored in HTTP-only cookie: `auth_token`
- JWT format with user ID and role
- Expires after 7 days
- Validated on each protected route access

---

## Business Process Flows

### Flow 1: Standard Sales Process

```
1. Customer Inquiry
   ↓
2. Create Customer Record (if new)
   ↓
3. Create Quotation
   - Select customer(s)
   - Add products/items
   - Set pricing, discounts, taxes
   - Set terms and validity
   - Generate quotation number
   ↓
4. Send Quotation to Customer
   - Download PDF
   - Email/WhatsApp
   - Status → "sent"
   ↓
5. Customer Approval
   - If approved → Status = "approved"
   - If rejected → Status = "rejected"
   ↓
6. Convert to Sales Order
   - System creates SO from quotation
   - Quotation status → "converted"
   - SO status → "pending"
   ↓
7. Order Fulfillment
   - Status → "confirmed"
   - Status → "processing"
   - Pick items from inventory
   - Pack order
   - Status → "shipped"
   ↓
8. Delivery
   - Deliver to customer
   - Status → "delivered"
   - Record delivery date and notes
   ↓
9. Generate Invoice
   - Auto-generate or manual
   - Invoice created from SO
   - SO marked as "invoiced"
   - Invoice status → "sent"
   ↓
10. Payment Collection
    - Customer pays invoice
    - Record payment
    - Invoice status → "paid"
    ↓
11. Accounting Entry
    - Debit: Bank/Cash
    - Credit: Accounts Receivable
    ↓
12. Process Complete
```

---

### Flow 2: Procurement Process

```
1. Identify Need
   - Low stock alert
   - Customer order requirement
   - Regular restocking
   ↓
2. Select Vendor
   - Search vendor list
   - Choose based on pricing/quality
   ↓
3. Create Purchase Order
   - Add items and quantities
   - Set prices
   - Set delivery date
   - Generate PO number
   - Status → "draft"
   ↓
4. Internal Approval
   - Review PO
   - Approve → Status = "approved"
   ↓
5. Send to Vendor
   - Email/print PO
   - Status → "sent"
   ↓
6. Vendor Ships Goods
   - Track shipment
   - Update expected delivery
   ↓
7. Receive Goods
   - Verify items against PO
   - Check quality
   - Update received quantities
   - Status → "received"
   - Update inventory stock
   ↓
8. Receive Vendor Bill
   - Create bill from PO
   - Or enter manual bill
   - Verify bill against PO
   - Status → "received"
   ↓
9. Approve Bill for Payment
   - Finance reviews
   - Status → "approved"
   ↓
10. Process Payment
    - Create payment transaction
    - Record payment date and method
    - Status → "paid"
    ↓
11. Accounting Entry
    - Debit: Accounts Payable
    - Credit: Bank/Cash
    ↓
12. Process Complete
```

---

### Flow 3: Multi-Customer Quotation

```
1. Receive Similar Inquiries from Multiple Customers
   ↓
2. Create Single Quotation Session
   - Open "Create New Quotation"
   - Navigate to Customer Selection step
   ↓
3. Select Multiple Customers
   - Check boxes for 2+ customers
   - Example: Customer A, Customer B, Customer C
   ↓
4. Add Items
   - Same items for all customers
   - Same pricing and terms
   ↓
5. Set Terms & Validity
   - Common terms for all
   - Same validity period
   ↓
6. Submit Quotation
   ↓
7. System Processing
   - Generate Q-2025-00001 for Customer A
   - Generate Q-2025-00002 for Customer B
   - Generate Q-2025-00003 for Customer C
   - All with identical items and amounts
   ↓
8. Individual Tracking
   - Each customer can:
     - Accept independently
     - Reject independently
     - Convert to separate orders
   ↓
9. Separate Order Processing
   - Customer A accepts → Creates SO-2025-001
   - Customer B rejects → Quotation expired
   - Customer C accepts → Creates SO-2025-002
   ↓
10. Each order flows independently through delivery and invoicing
```

---

### Flow 4: Inventory Stock Management

```
1. Product Added to System
   - Set initial stock level
   - Set reorder point
   ↓
2. Sales Order Confirmed
   - System checks available stock
   - If sufficient: Allow order
   - If insufficient: Alert user
   ↓
3. Order Delivered
   - Reduce stock by ordered quantity
   - current_stock -= quantity
   ↓
4. Stock Falls Below Reorder Point
   - System generates alert
   - Shows in "Low Stock Items" dashboard
   ↓
5. Create Purchase Order
   - Order from vendor
   - Calculate reorder quantity
   ↓
6. Goods Received
   - Verify quantity
   - current_stock += received_quantity
   ↓
7. Stock Updated
   - Inventory level restored
   - Alert cleared if stock > reorder point
   ↓
8. Continuous Monitoring
   - Track stock movements
   - Generate reports
   - Predict future stock needs
```

---

### Flow 5: Financial Closing Process

```
1. Month End Approaching
   ↓
2. Reconcile Sales
   - Verify all delivered orders are invoiced
   - Run "Auto-Generate Invoices" if needed
   - Check invoice status
   ↓
3. Reconcile Purchases
   - Verify all received POs have vendor bills
   - Create bills from pending POs
   - Check bill payment status
   ↓
4. Review Accounts Receivable
   - List unpaid customer invoices
   - Send payment reminders
   - Follow up on overdue accounts
   ↓
5. Review Accounts Payable
   - List unpaid vendor bills
   - Plan payments based on cash flow
   - Process due payments
   ↓
6. Record All Payments
   - Mark invoices as paid
   - Mark bills as paid
   - Verify payment records
   ↓
7. Generate Financial Reports
   - Profit & Loss for the month
   - Balance Sheet as of month-end
   - Cash Flow Statement
   - Receivables Aging
   - Payables Aging
   ↓
8. Review Ledger Entries
   - Verify all transactions recorded
   - Check debits = credits
   - Review trial balance
   ↓
9. Adjusting Entries (if needed)
   - Record depreciation
   - Accrue expenses
   - Defer revenue
   ↓
10. Close Books
    - Finalize all entries
    - Lock period (if supported)
    - Archive reports
    ↓
11. Start Next Month
```

---

## Key Features in Detail

### 1. PDF Generation

**Quotation PDF**:
- Professional template with company logo
- Customer details in bill-to section
- Itemized list with quantity, price, discount, tax
- Subtotal, tax amount, grand total
- Terms and conditions
- Valid until date
- Generated using jsPDF library
- Download with filename: `Quotation-{quotation_number}.pdf`

**Invoice PDF**:
- Similar to quotation but labeled as "Invoice"
- Invoice number prominent
- Due date highlighted
- Payment instructions
- Bank details (if configured)

---

### 2. WhatsApp Integration

**Purpose**: Quick communication with customers/vendors

**Quotation Sharing**:
- Click "Share on WhatsApp" button
- System generates message:
  ```
  📋 *Quotation from [Company Name]*
  
  Dear [Customer Name],
  
  Please find your quotation details:
  • Quotation No: Q-2025-00001
  • Amount: Rs. 50,000
  • Valid Until: 15-Feb-2025
  
  Items: 5 products
  
  Thank you for your business!
  ```
- Opens WhatsApp Web/App with pre-filled message
- Customer phone number auto-filled

**Invoice Reminder**:
- Similar message format for invoices
- Includes due date and payment amount
- Can send payment reminders for overdue invoices

---

### 3. Real-time Stock Validation

**During Quotation Creation**:
- As items are added, system checks available stock
- Displays warning if quantity > available stock
- Example: "Only 50 units available, you're trying to quote 75"
- User can still proceed with quotation
- Alert ensures awareness of stock constraints

**During Order Processing**:
- Before confirming order, validates stock
- If insufficient, suggests:
  - Reducing order quantity
  - Creating purchase order for restocking
  - Backordering items

---

### 4. Document Compliance Tracking

**For Export/Import Documents**:
- Upload commercial invoice
- Upload packing list
- Upload certificate of origin
- Upload bill of lading
- Set compliance status for each
- Track expiry dates for certificates
- Alert before document expiry
- OCR processing (future) to extract data from documents

---

### 5. Audit Trail

**Every Transaction Records**:
- Created by: User who created the record
- Created at: Timestamp of creation
- Updated at: Last modification timestamp
- Approved by: User who approved
- Approved at: Approval timestamp

**Audit Table**:
- Tracks all changes to critical records
- Old value vs new value
- Changed by user
- Change timestamp
- IP address and user agent

---

### 6. FBR Integration (Pakistan Tax Authority)

**Purpose**: Compliance with tax regulations

**Invoice Synchronization**:
- Submit invoice data to FBR system
- Track sync status (pending/synced/failed)
- Store FBR reference number
- Handle sync errors and retry
- Generate tax reports for FBR

---

### 7. Multi-Currency Support (Future)

**Current**: All amounts in PKR (Pakistani Rupees)

**Planned**:
- Support for USD, EUR, GBP, etc.
- Exchange rate management
- Currency conversion
- Multi-currency reports
- Base currency for accounting

---

### 8. Approval Workflows

**Quotation Approval**:
- Sales creates quotation (draft)
- Manager reviews and approves
- Status changes to "approved"
- Can then be converted to order

**Purchase Order Approval**:
- Procurement creates PO (draft)
- Manager reviews and approves
- PO can then be sent to vendor

**Configurable Workflows** (Future):
- Define approval hierarchy
- Set approval limits
- Multi-level approvals
- Email notifications at each step

---

## Technical Implementation Details

### Frontend State Management

**React Hooks Used**:
- `useState`: Local component state
- `useEffect`: Side effects, data fetching
- Custom hooks: `useAuth`, `useFinancialMetrics`, `useLedgerEntries`

**Data Fetching**:
- API client singleton pattern
- Centralized in `lib/api.ts`
- Request/response interceptors
- Error handling
- Loading states

**Form Handling**:
- React Hook Form for complex forms
- Field validation
- Error messages
- Dirty state tracking

---

### Backend Architecture

**Current Setup**:
- **Production**: Single `api/index.js` file (Vercel serverless)
- **Localhost**: Modular structure in `qms-backend/src/routes/`

**API Response Format**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

---

### Database Optimization

**Indexes**:
- Primary keys on all tables
- Foreign key indexes
- Unique indexes on: quotation_number, invoice_number, po_number, sku
- Composite indexes for common queries

**Query Optimization**:
- Use of `.select()` to fetch only needed columns
- Pagination for large datasets (limit/offset)
- Eager loading with joins (`.select('*, customers(*)')`)
- Date range queries optimized

---

### Security Measures

**Authentication**:
- JWT tokens for API access
- HTTP-only cookies for token storage
- Token expiration (7 days)
- Refresh token mechanism (future)

**Authorization**:
- Role-based access control (RBAC)
- Middleware checks user role
- Endpoint-level permissions
- Row-level security in Supabase

**Data Validation**:
- Input sanitization
- SQL injection prevention (Supabase parameterized queries)
- XSS protection
- CSRF protection (future)

**Secure Storage**:
- Passwords hashed (Supabase Auth)
- Files stored in Supabase Storage with access control
- API keys in environment variables
- No sensitive data in client-side code

---

## Deployment & DevOps

### GitHub Actions Workflow

**Trigger**: Push to `main` branch

**Steps**:
1. Checkout code
2. Install Vercel CLI
3. Build project
   - Build frontend (Next.js)
   - Bundle API functions
4. Deploy to Vercel
   - Deploy to production
   - Set environment variables
5. Health check
   - Verify deployment
   - Test endpoints

**Environment Variables**:
- `SUPABASE_URL`: Database connection URL
- `SUPABASE_ANON_KEY`: Public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Admin API key (backend only)
- `NEXT_PUBLIC_API_URL`: API base URL
- `NEXT_PUBLIC_API_BASE_URL`: Alternative API URL
- `VERCEL_TOKEN`: Deployment token
- `VERCEL_ORG_ID`: Organization ID
- `VERCEL_PROJECT_ID`: Project ID

---

### Localhost vs Production

**Localhost**:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- Uses `qms-backend` structured code
- Hot reload for development
- Detailed error messages

**Production**:
- Backend: `https://qms-azure.vercel.app/api/v1`
- Frontend: `https://qms-azure.vercel.app`
- Uses `api/index.js` serverless function
- Vercel edge network
- Production error handling

---

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Quotation sent emails
   - Invoice reminders
   - Order confirmations
   - Low stock alerts

2. **Advanced Reporting**
   - Custom report builder
   - Scheduled reports (daily/weekly/monthly)
   - Report subscriptions
   - Email report delivery

3. **Mobile App**
   - React Native mobile app
   - Push notifications
   - Offline support
   - Mobile quotation creation

4. **AI/ML Features**
   - Sales forecasting
   - Demand prediction
   - Optimal reorder quantities
   - Price optimization
   - Customer churn prediction

5. **Integration Marketplace**
   - QuickBooks integration
   - Xero integration
   - Shopify integration
   - Payment gateway (Stripe, PayPal)
   - Shipping carriers (FedEx, DHL)

6. **Advanced Inventory**
   - Barcode scanning
   - Serial number tracking
   - Batch/lot tracking
   - Multi-location inventory
   - Warehouse management

7. **CRM Features**
   - Lead management
   - Opportunity tracking
   - Customer communication history
   - Sales pipeline visualization

8. **Manufacturing Module**
   - Bill of Materials (BOM)
   - Work orders
   - Production planning
   - Quality control

---

## Troubleshooting Guide

### Common Issues

**Issue 1: Authentication Redirect Not Working in Production**
- **Cause**: Middleware not validating tokens properly
- **Solution**: Updated middleware to use production API URL dynamically
- **File**: `qms-frontend/middleware.ts`

**Issue 2: Quotation Creation Fails with Multiple Customers**
- **Cause**: Backend expecting single customer_id, frontend sending customers array
- **Solution**: Updated POST `/api/v1/quotations` to handle both single and multiple customers
- **File**: `api/index.js`

**Issue 3: Customer Delete Fails**
- **Cause**: Foreign key constraint - customer has linked quotations
- **Solution**: Added validation to check for linked records before deletion
- **File**: `api/routes/customers.js`

**Issue 4: Documents Not Loading**
- **Cause**: Incorrect API endpoint URL in production
- **Solution**: Fixed API URL resolution in frontend
- **File**: `qms-frontend/lib/api.ts`

---

## Glossary

**Quotation**: A formal offer to supply goods/services at specified prices and terms

**Sales Order**: A confirmed order from a customer, usually converted from an approved quotation

**Invoice (Receivable)**: A bill sent to a customer requesting payment for goods/services provided

**Vendor Bill (Payable)**: A bill received from a supplier for goods/services purchased

**Purchase Order (PO)**: An order issued to a vendor to purchase goods/services

**Ledger Entry**: A record of a financial transaction in the accounting system

**Chart of Accounts**: A structured list of all accounts used in the accounting system

**SKU**: Stock Keeping Unit - a unique identifier for each product

**Double-Entry Bookkeeping**: Accounting method where every transaction affects at least two accounts (debit and credit must balance)

**Reorder Point**: The inventory level at which a new order should be placed

**Lead Time**: Time between placing an order and receiving the goods

**Credit Limit**: Maximum amount of credit extended to a customer

**Payment Terms**: Number of days allowed for payment (e.g., Net 30 = payment due in 30 days)

**FBR**: Federal Board of Revenue (Pakistan's tax authority)

**GST**: Goods and Services Tax

---

## Support & Contact

**Development Team**: Anoosh International IT Department

**System Administrator**: admin@qms.com

**For Issues**: Create GitHub issue in the repository

**Documentation**: This file serves as the primary reference

---

**End of Documentation**

---

*Last Updated: October 3, 2025*  
*Version: 1.0*  
*Document Owner: Development Team*

