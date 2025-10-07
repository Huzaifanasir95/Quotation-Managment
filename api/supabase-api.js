// Supabase-connected API for production
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS configuration - Updated for anoosh.vercel.app deployment
app.use(cors({
  origin: [
    'https://anoosh.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    // Legacy domains for backward compatibility
    'https://qms-azure.vercel.app', 
    'https://qms-*.vercel.app'
  ],
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
    environment: 'production',
    database: supabaseUrl ? 'connected' : 'disconnected'
  });
});

// Authentication endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        token: data.session.access_token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/auth/profile', async (req, res) => {
  try {
    // For now, return a mock profile since we need to implement proper JWT validation
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
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Products endpoints
app.get('/api/v1/products', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Products fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        products: data || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/products/stats/kpis', async (req, res) => {
  try {
    // Get total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    // Get low stock items (where current_stock <= reorder_point)
    const { count: lowStockItems } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('current_stock', 'reorder_point');
    
    // Get out of stock items
    const { count: outOfStockItems } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('current_stock', 0);
    
    // Calculate total value
    const { data: products } = await supabase
      .from('products')
      .select('current_stock, last_purchase_price');
    
    const totalValue = products?.reduce((sum, product) => {
      return sum + (product.current_stock * (product.last_purchase_price || 0));
    }, 0) || 0;
    
    res.json({
      success: true,
      data: {
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockItems || 0,
        outOfStockItems: outOfStockItems || 0,
        totalValue: totalValue
      }
    });
  } catch (error) {
    console.error('Product KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Customers endpoints
app.get('/api/v1/customers', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Customers fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        customers: data || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sales endpoints
app.get('/api/v1/sales/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(50);
    
    if (error) {
      console.error('Sales customers fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        customers: data || [],
        total: data?.length || 0,
        currentPage: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Sales customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/sales/customers/limit-50', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(50);
    
    if (error) {
      console.error('Sales customers limit fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Sales customers limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Quotations endpoints
app.get('/api/v1/quotations', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`quote_number.ilike.%${search}%,notes.ilike.%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Quotations fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        quotations: data || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Quotations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/sales/quotations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email
        )
      `)
      .limit(50);
    
    if (error) {
      console.error('Sales quotations fetch error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        quotations: data || [],
        total: data?.length || 0,
        currentPage: 1,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Sales quotations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sales dashboard endpoint
app.get('/api/v1/sales/dashboard', async (req, res) => {
  try {
    // Get quotation counts
    const { count: totalQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    const { count: convertedQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');
    
    // Get recent quotations
    const { data: recentQuotations } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Calculate total revenue (sum of accepted quotations)
    const { data: acceptedQuotes } = await supabase
      .from('quotations')
      .select('total_amount')
      .eq('status', 'accepted');
    
    const totalRevenue = acceptedQuotes?.reduce((sum, quote) => sum + (quote.total_amount || 0), 0) || 0;
    
    const averageQuoteValue = totalQuotations > 0 ? totalRevenue / totalQuotations : 0;
    const conversionRate = totalQuotations > 0 ? (convertedQuotations / totalQuotations) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalQuotations: totalQuotations || 0,
        pendingQuotations: pendingQuotations || 0,
        convertedQuotations: convertedQuotations || 0,
        totalRevenue: totalRevenue,
        averageQuoteValue: averageQuoteValue,
        conversionRate: conversionRate,
        topCustomers: [], // Would need more complex query
        recentQuotations: recentQuotations || []
      }
    });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Other required endpoints
app.get('/api/v1/vendors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*');
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        vendors: data || [],
        total: data?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/business-entities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('business_entities')
      .select('*');
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/product-categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*');
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    res.json({
      success: true,
      data: {
        categories: data || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
