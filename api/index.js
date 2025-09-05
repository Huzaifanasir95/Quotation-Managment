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
