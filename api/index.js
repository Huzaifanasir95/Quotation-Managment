// Simple API entry point for Vercel
const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['https://qms-azure.vercel.app', 'https://qms-*.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  });
});

// Simple auth endpoint for testing
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple test authentication (replace with real logic)
  if (email === 'admin@qms.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          email: 'admin@qms.com',
          role: 'admin',
          name: 'Admin User'
        },
        token: 'mock-jwt-token-for-testing'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// User profile endpoint
app.get('/api/v1/auth/profile', (req, res) => {
  // Mock user profile response
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        email: 'admin@qms.com',
        role: 'admin',
        name: 'Admin User',
        permissions: ['read', 'write', 'admin'],
        business_entity_id: 1
      }
    }
  });
});

// Mock API endpoints that the dashboard might need
app.get('/api/v1/products', (req, res) => {
  res.json({
    success: true,
    data: {
      products: [],
      total: 0,
      currentPage: 1,
      totalPages: 0
    }
  });
});

app.get('/api/v1/products/stats/kpis', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProducts: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0
    }
  });
});

app.get('/api/v1/quotations', (req, res) => {
  res.json({
    success: true,
    data: {
      quotations: [],
      total: 0
    }
  });
});

app.get('/api/v1/customers', (req, res) => {
  res.json({
    success: true,
    data: {
      customers: [],
      total: 0
    }
  });
});

app.get('/api/v1/vendors', (req, res) => {
  res.json({
    success: true,
    data: {
      vendors: [],
      total: 0
    }
  });
});

app.get('/api/v1/business-entities', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'QMS Company',
        type: 'company',
        status: 'active'
      }
    ]
  });
});

// Mock product categories
app.get('/api/v1/product-categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: [
        {
          id: 1,
          name: 'Electronics',
          description: 'Electronic items'
        },
        {
          id: 2,
          name: 'Office Supplies',
          description: 'Office and stationery items'
        }
      ]
    }
  });
});

// Sales API endpoints
app.get('/api/v1/sales/quotation-trends', (req, res) => {
  res.json({
    success: true,
    data: {
      trends: [
        { month: 'Jan', quotes: 25, converted: 12 },
        { month: 'Feb', quotes: 30, converted: 18 },
        { month: 'Mar', quotes: 35, converted: 22 },
        { month: 'Apr', quotes: 28, converted: 15 },
        { month: 'May', quotes: 40, converted: 28 },
        { month: 'Jun', quotes: 38, converted: 25 }
      ]
    }
  });
});

app.get('/api/v1/sales/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalQuotations: 150,
      pendingQuotations: 25,
      convertedQuotations: 85,
      totalRevenue: 125000,
      averageQuoteValue: 5200,
      conversionRate: 65.5,
      topCustomers: [
        { id: 1, name: 'ABC Corporation', totalQuotes: 15, totalValue: 45000 },
        { id: 2, name: 'XYZ Ltd', totalQuotes: 12, totalValue: 38000 },
        { id: 3, name: 'Tech Solutions', totalQuotes: 10, totalValue: 32000 }
      ],
      recentQuotations: [
        { id: 1, customer: 'ABC Corp', amount: 15000, status: 'pending', date: '2025-09-01' },
        { id: 2, customer: 'XYZ Ltd', amount: 12000, status: 'converted', date: '2025-09-02' },
        { id: 3, customer: 'Tech Solutions', amount: 8500, status: 'pending', date: '2025-09-03' }
      ]
    }
  });
});

app.get('/api/v1/sales/customers/limit-50', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'ABC Corporation',
        email: 'contact@abc-corp.com',
        phone: '+1-555-0123',
        address: '123 Business St, City, State 12345',
        totalQuotes: 15,
        totalValue: 45000,
        status: 'active'
      },
      {
        id: 2,
        name: 'XYZ Limited',
        email: 'info@xyz-ltd.com',
        phone: '+1-555-0456',
        address: '456 Commerce Ave, City, State 67890',
        totalQuotes: 12,
        totalValue: 38000,
        status: 'active'
      },
      {
        id: 3,
        name: 'Tech Solutions Inc',
        email: 'hello@techsolutions.com',
        phone: '+1-555-0789',
        address: '789 Innovation Dr, City, State 54321',
        totalQuotes: 10,
        totalValue: 32000,
        status: 'active'
      }
    ]
  });
});

// Catch all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;
