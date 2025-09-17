const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('./config');
const { errorHandler, logger } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const vendorRoutes = require('./routes/vendors');
const productRoutes = require('./routes/products');
const quotationRoutes = require('./routes/quotations');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const invoiceRoutes = require('./routes/invoices');
const stockMovementRoutes = require('./routes/stockMovements');
const documentRoutes = require('./routes/documents');
const businessEntityRoutes = require('./routes/businessEntities');
const indexRoutes = require('./routes/index');
const salesRoutes = require('./routes/sales');
const orderRoutes = require('./routes/orders');
const vendorBillRoutes = require('./routes/vendorBills');
const deliveryChallanRoutes = require('./routes/deliveryChallans');
const productCategoryRoutes = require('./routes/productCategories');
const ledgerRoutes = require('./routes/ledger');
const settingsRoutes = require('./routes/settings');

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

// API routes
const apiRouter = express.Router();

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
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
app.use('/api/v1/settings', settingsRoutes);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`QMS Backend server running on port ${PORT}`, {
    environment: config.nodeEnv,
    apiVersion: config.apiVersion
  });
});

module.exports = app;
