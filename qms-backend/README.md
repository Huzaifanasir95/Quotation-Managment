# QMS Backend API

Quality Management System Backend built with Node.js, Express, and Supabase.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Database**: PostgreSQL with Supabase integration
- **File Management**: Document upload and OCR processing
- **API Documentation**: RESTful API with comprehensive endpoints
- **Security**: Helmet, CORS, rate limiting, input validation
- **Logging**: Winston-based structured logging

## User Roles

- **Admin**: Full system access
- **Sales**: Quotations, customers, sales orders
- **Procurement**: Purchase orders, vendors, inventory
- **Finance**: Accounting, invoicing, FBR compliance
- **Auditor**: Read-only access to financial records

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Database Setup**
   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/profile` - Get user profile

### Sales Management
- `GET /api/v1/quotations` - List quotations
- `POST /api/v1/quotations` - Create quotation
- `GET /api/v1/quotations/:id` - Get quotation details
- `PUT /api/v1/quotations/:id` - Update quotation
- `DELETE /api/v1/quotations/:id` - Delete quotation

### Purchase Management
- `GET /api/v1/purchase-orders` - List purchase orders
- `POST /api/v1/purchase-orders` - Create purchase order
- `GET /api/v1/purchase-orders/:id` - Get PO details
- `PUT /api/v1/purchase-orders/:id` - Update PO

### Inventory Management
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get product details
- `PUT /api/v1/products/:id` - Update product
- `POST /api/v1/stock-movements` - Record stock movement

### Customer & Vendor Management
- `GET /api/v1/customers` - List customers
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/vendors` - List vendors
- `POST /api/v1/vendors` - Create vendor

### Accounting
- `GET /api/v1/ledger-entries` - List ledger entries
- `POST /api/v1/ledger-entries` - Create ledger entry
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice

## Project Structure

```
src/
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Helper functions
├── config/         # Configuration files
├── scripts/        # Database scripts
└── server.js       # Application entry point
```

## Environment Variables

See `.env.example` for required environment variables.

## Development

- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data
