const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../src/config');
const { errorHandler, logger } = require('../src/middleware/errorHandler');

// Import routes
const authRoutes = require('../src/routes/auth');
const customerRoutes = require('../src/routes/customers');
const vendorRoutes = require('../src/routes/vendors');
const productRoutes = require('../src/routes/products');
const quotationRoutes = require('../src/routes/quotations');
const purchaseOrderRoutes = require('../src/routes/purchaseOrders');
const invoiceRoutes = require('../src/routes/invoices');
const stockMovementRoutes = require('../src/routes/stockMovements');
const documentRoutes = require('../src/routes/documents');
const businessEntityRoutes = require('../src/routes/businessEntities');
const indexRoutes = require('../src/routes/index');
const salesRoutes = require('../src/routes/sales');
const orderRoutes = require('../src/routes/orders');
const vendorBillRoutes = require('../src/routes/vendorBills');
const deliveryChallanRoutes = require('../src/routes/deliveryChallans');
const productCategoryRoutes = require('../src/routes/productCategories');
const ledgerRoutes = require('../src/routes/ledger');

const app = express();

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: config.rateLimit.max,
  duration: config.rateLimit.windowMs / 1000,
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Skip rate limiting in development for auth routes
    if (config.nodeEnv === 'development' && req.path.includes('/auth/')) {
      return next();
    }
    
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Rate limiting
app.use(rateLimiterMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv
  });
});

// API routes with /api prefix for Vercel routing
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/stock-movements', stockMovementRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/business-entities', businessEntityRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/vendor-bills', vendorBillRoutes);
app.use('/api/v1/delivery-challans', deliveryChallanRoutes);
app.use('/api/v1/product-categories', productCategoryRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1', indexRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Export for Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development
  const PORT = config.port;
  app.listen(PORT, () => {
    logger.info(`QMS Backend server running on port ${PORT}`, {
      environment: config.nodeEnv,
      apiVersion: config.apiVersion
    });
  });
}

module.exports = app;
