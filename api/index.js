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
