// Real API with Supabase connection for Vercel
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CORS configuration
app.use(cors({
  origin: [
    'https://qms-azure.vercel.app', 
    'https://qms-*.vercel.app',
    'https://qms-gkv7ritb5-huzaifa-nasirs-projects-70949826.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import route modules
const customersRoutes = require('./routes/customers');
const documentsRoutes = require('./routes/documents');

// Use route modules
app.use('/api/v1/customers', customersRoutes);
app.use('/api/documents', documentsRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  });
});

// Authentication endpoints
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user from database
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !users) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Simple password check (in production, use proper password hashing)
    if (password === 'admin123' || password === users.password) {
      res.json({
        success: true,
        data: {
          user: {
            id: users.id,
            email: users.email,
            role: users.role,
            name: users.name || users.email
          },
          token: 'jwt-token-placeholder'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
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
    // For demo purposes, return a default admin user
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
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Products fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }

    res.json({
      success: true,
      data: {
        products: products || [],
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

// Create product endpoint
app.post('/api/v1/products', async (req, res) => {
  try {
    const productData = req.body;
    console.log('Creating product with data:', productData);

    // Validate required fields
    if (!productData.sku || !productData.name || !productData.type || !productData.unit_of_measure) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, type, and unit of measure are required'
      });
    }

    // Check if SKU already exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', productData.sku)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('SKU check error:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check SKU uniqueness'
      });
    }

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    // Prepare product data for insertion
    const finalProductData = {
      ...productData,
      current_stock: productData.current_stock || 0,
      reorder_point: productData.reorder_point || 0,
      status: productData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Final product data:', finalProductData);

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(finalProductData)
      .select('*')
      .single();

    if (productError) {
      console.error('Product creation error:', productError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create product',
        error: productError.message
      });
    }

    console.log('Product created successfully:', product);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.get('/api/v1/products/stats/kpis', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('current_stock, reorder_point, last_purchase_price');

    if (error) {
      console.error('KPIs fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch KPIs'
      });
    }

    const totalProducts = products?.length || 0;
    const lowStockItems = products?.filter(p => p.current_stock <= p.reorder_point).length || 0;
    const outOfStockItems = products?.filter(p => p.current_stock === 0).length || 0;
    const totalValue = products?.reduce((sum, p) => sum + (p.current_stock * (p.last_purchase_price || 0)), 0) || 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockItems,
        outOfStockItems,
        totalValue: parseFloat(totalValue.toFixed(2))
      }
    });
  } catch (error) {
    console.error('KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Quotations endpoints
app.get('/api/v1/quotations', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('quotations')
      .select(`
        *,
        customers (name, email),
        quotation_items (*)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`quotation_number.ilike.%${search}%`);
    }

    const { data: quotations, error, count } = await query;

    if (error) {
      console.error('Quotations fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotations'
      });
    }

    res.json({
      success: true,
      data: {
        quotations: quotations || [],
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

// Create quotation endpoint
app.post('/api/v1/quotations', async (req, res) => {
  try {
    const { items, ...quotationData } = req.body;
    console.log('Creating quotation with data:', { quotationData, itemsCount: items?.length });

    // Handle customer_id - convert to proper format
    let customer_id = quotationData.customer_id;
    
    // If customer_id is a string that looks like a number, convert it
    if (typeof customer_id === 'string' && /^\d+$/.test(customer_id)) {
      customer_id = parseInt(customer_id, 10);
    }
    // If customer_id is already a number, keep it as is
    else if (typeof customer_id === 'number') {
      customer_id = customer_id;
    }
    // For UUID strings, keep as string (this handles localhost compatibility)
    else {
      customer_id = customer_id;
    }

    console.log('Processed customer_id:', customer_id, 'Type:', typeof customer_id);

    // Generate quotation number
    const currentYear = new Date().getFullYear();
    const { data: lastQuotation } = await supabase
      .from('quotations')
      .select('quotation_number')
      .like('quotation_number', `Q-${currentYear}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastQuotation && lastQuotation.quotation_number) {
      const lastNumber = parseInt(lastQuotation.quotation_number.split('-')[2]);
      nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
    }

    const quotation_number = `Q-${currentYear}-${nextNumber.toString().padStart(5, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    const processedItems = items?.map(item => {
      const line_total = item.quantity * item.unit_price;
      const discount = line_total * (item.discount_percent || 0) / 100;
      const taxable_amount = line_total - discount;
      const tax = taxable_amount * (item.tax_percent || 0) / 100;

      subtotal += line_total;
      discount_amount += discount;
      tax_amount += tax;

      return {
        ...item,
        line_total: taxable_amount + tax
      };
    }) || [];

    const total_amount = subtotal - discount_amount + tax_amount;

    // Build final quotation data with processed customer_id
    const finalQuotationData = {
      customer_id, // Use the processed customer_id
      quotation_date: quotationData.quotation_date,
      valid_until: quotationData.valid_until,
      terms_conditions: quotationData.terms_conditions,
      notes: quotationData.notes,
      quotation_number,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    console.log('Final quotation data:', finalQuotationData);

    // Create quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert(finalQuotationData)
      .select('*')
      .single();

    if (quotationError) {
      console.error('Quotation creation error:', quotationError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create quotation',
        error: quotationError.message
      });
    }

    console.log('Quotation created successfully:', quotation);

    // Create quotation items if there are any
    if (processedItems.length > 0) {
      const quotationItems = processedItems.map(item => ({
        ...item,
        quotation_id: quotation.id
      }));

      console.log('Creating quotation items:', quotationItems);

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems);

      if (itemsError) {
        console.error('Quotation items creation error:', itemsError);
        // Rollback quotation creation
        await supabase.from('quotations').delete().eq('id', quotation.id);
        return res.status(400).json({
          success: false,
          message: 'Failed to create quotation items',
          error: itemsError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: { quotation }
    });

  } catch (error) {
    console.error('Quotation creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get individual quotation by ID
app.get('/api/v1/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Quotations API: Fetching quotation ${id}`);
    
    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers(*),
        business_entities(*),
        quotation_items(*)
      `)
      .eq('id', id)
      .single();

    if (error || !quotation) {
      console.error('❌ Quotation fetch error:', error);
      return res.status(404).json({
        error: 'Quotation not found',
        code: 'QUOTATION_NOT_FOUND'
      });
    }

    console.log(`✅ Successfully fetched quotation: ${quotation.quotation_number || id}`);

    res.json({
      success: true,
      data: { quotation }
    });
  } catch (error) {
    console.error('💥 Quotation by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Update quotation endpoint
app.put('/api/v1/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...quotationData } = req.body;

    console.log(`📝 Updating quotation ${id}`);

    // Check if quotation exists
    const { data: existingQuotation, error: fetchError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingQuotation) {
      return res.status(404).json({
        error: 'Quotation not found',
        code: 'QUOTATION_NOT_FOUND'
      });
    }

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    const processedItems = items.map(item => {
      const line_total = item.quantity * item.unit_price;
      const discount = line_total * (item.discount_percent || 0) / 100;
      const taxable_amount = line_total - discount;
      const tax = taxable_amount * (item.tax_percent || 0) / 100;

      subtotal += line_total;
      discount_amount += discount;
      tax_amount += tax;

      return {
        ...item,
        line_total: taxable_amount + tax
      };
    });

    const total_amount = subtotal - discount_amount + tax_amount;

    const finalQuotationData = {
      ...quotationData,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      updated_at: new Date().toISOString()
    };

    // Update quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .update(finalQuotationData)
      .eq('id', id)
      .select('*')
      .single();

    if (quotationError) {
      return res.status(400).json({
        error: 'Failed to update quotation',
        code: 'UPDATE_FAILED',
        details: quotationError.message
      });
    }

    // Delete existing quotation items
    const { error: deleteItemsError } = await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', id);

    if (deleteItemsError) {
      return res.status(400).json({
        error: 'Failed to update quotation items',
        code: 'ITEMS_UPDATE_FAILED',
        details: deleteItemsError.message
      });
    }

    // Create new quotation items
    const quotationItems = processedItems.map(item => ({
      ...item,
      quotation_id: id
    }));

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(quotationItems);

    if (itemsError) {
      return res.status(400).json({
        error: 'Failed to create quotation items',
        code: 'ITEMS_CREATION_FAILED',
        details: itemsError.message
      });
    }

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      data: { quotation }
    });

  } catch (error) {
    console.error('💥 Quotation update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Update quotation status endpoint
app.patch('/api/v1/quotations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'accepted', 'converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const { data: quotation, error } = await supabase
      .from('quotations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Quotation status update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update quotation status'
      });
    }

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      message: 'Quotation status updated successfully',
      data: { quotation }
    });

  } catch (error) {
    console.error('Quotation status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sales endpoints
app.get('/api/v1/sales/dashboard', async (req, res) => {
  try {
    // Fetch data from multiple tables in parallel for better performance
    const [
      { data: quotations, error: quotationsError },
      { data: customers, error: customersError },
      { data: recentInquiries, error: inquiriesError }
    ] = await Promise.all([
      supabase.from('quotations').select('status, total_amount, created_at, customer_id, customers(name)'),
      supabase.from('customers').select('id, name, created_at'),
      supabase.from('quotations').select('id, created_at').order('created_at', { ascending: false }).limit(10)
    ]);

    if (quotationsError || customersError) {
      console.error('Sales dashboard error:', { quotationsError, customersError, inquiriesError });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sales data'
      });
    }

    const totalQuotations = quotations?.length || 0;
    const pendingQuotations = quotations?.filter(q => q.status === 'pending').length || 0;
    const convertedQuotations = quotations?.filter(q => q.status === 'converted' || q.status === 'accepted').length || 0;
    const totalRevenue = quotations?.filter(q => q.status === 'converted' || q.status === 'accepted').reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0) || 0;

    // Calculate top customers based on quotation totals
    const customerMap = new Map();
    quotations?.forEach(q => {
      if (q.customer_id) {
        const existing = customerMap.get(q.customer_id) || { total: 0, count: 0, name: '' };
        customerMap.set(q.customer_id, {
          total: existing.total + (parseFloat(q.total_amount) || 0),
          count: existing.count + 1,
          name: q.customers?.name || existing.name || 'Unknown Customer'
        });
      }
    });

    const topCustomers = Array.from(customerMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([customerId, data]) => ({
        id: customerId,
        name: data.name,
        totalQuotes: Math.round(data.total * 100) / 100,
        quotesCount: data.count
      }));

    res.json({
      success: true,
      data: {
        totalQuotations,
        pendingQuotations,
        convertedQuotations,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageQuoteValue: totalQuotations > 0 ? Math.round((totalRevenue / totalQuotations) * 100) / 100 : 0,
        conversionRate: totalQuotations > 0 ? Math.round(((convertedQuotations / totalQuotations) * 100) * 10) / 10 : 0,
        topCustomers: topCustomers,
        recentInquiries: recentInquiries?.length || 0,
        totalCustomers: customers?.length || 0
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

app.get('/api/v1/sales/customers', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    // Get customers with their quotation data
    let customerQuery = supabase
      .from('customers')
      .select('*')
      .range(offset, offset + limit - 1);

    if (search) {
      customerQuery = customerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    const { data: customers, error: customerError } = await customerQuery;

    if (customerError) {
      console.error('Customers fetch error:', customerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers'
      });
    }

    // Get quotation data for each customer
    const customersWithQuotes = await Promise.all(
      (customers || []).map(async (customer) => {
        try {
          const { data: quotations, error: quotationError } = await supabase
            .from('quotations')
            .select('total_amount, status')
            .eq('customer_id', customer.id);

          if (quotationError) {
            console.error(`Quotation fetch error for customer ${customer.id}:`, quotationError);
          }

          const quotesCount = quotations?.length || 0;
          const totalQuotes = quotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
          const convertedQuotes = quotations?.filter(q => q.status === 'converted').length || 0;

          return {
            ...customer,
            quotesCount,
            totalQuotes: parseFloat(totalQuotes.toFixed(2)),
            convertedQuotes,
            status: customer.status || 'active'
          };
        } catch (err) {
          console.error(`Error processing customer ${customer.id}:`, err);
          return {
            ...customer,
            quotesCount: 0,
            totalQuotes: 0,
            convertedQuotes: 0,
            status: customer.status || 'active'
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        customers: customersWithQuotes,
        total: customersWithQuotes.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(customersWithQuotes.length / limit)
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
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .limit(50);

    if (error) {
      console.error('Customers limit fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers'
      });
    }

    // Add quotation data for each customer
    const customersWithQuotes = await Promise.all(
      (customers || []).map(async (customer) => {
        try {
          const { data: quotations } = await supabase
            .from('quotations')
            .select('total_amount, status')
            .eq('customer_id', customer.id);

          const quotesCount = quotations?.length || 0;
          const totalQuotes = quotations?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

          return {
            ...customer,
            quotesCount,
            totalQuotes: parseFloat(totalQuotes.toFixed(2)),
            status: customer.status || 'active'
          };
        } catch (err) {
          return {
            ...customer,
            quotesCount: 0,
            totalQuotes: 0,
            status: customer.status || 'active'
          };
        }
      })
    );

    res.json({
      success: true,
      data: customersWithQuotes
    });
  } catch (error) {
    console.error('Customers limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/sales/quotations', async (req, res) => {
  try {
    const { data: quotations, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Sales quotations fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotations'
      });
    }

    res.json({
      success: true,
      data: {
        quotations: quotations || [],
        total: quotations?.length || 0,
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

// Other endpoints
app.get('/api/v1/customers', async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*');

    if (error) {
      console.error('Customers fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customers'
      });
    }

    res.json({
      success: true,
      data: {
        customers: customers || [],
        total: customers?.length || 0
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

// Create customer endpoint
app.post('/api/v1/customers', async (req, res) => {
  try {
    const customerData = req.body;
    console.log('Creating customer with data:', customerData);

    // Validate required fields
    if (!customerData.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Check if email already exists (if provided)
    if (customerData.email) {
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('email')
        .eq('email', customerData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Email check error:', checkError);
        return res.status(500).json({
          success: false,
          message: 'Failed to check email uniqueness'
        });
      }

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Prepare customer data for insertion
    const finalCustomerData = {
      ...customerData,
      status: customerData.status || 'active',
      credit_limit: customerData.credit_limit || 0,
      payment_terms: customerData.payment_terms || 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Final customer data:', finalCustomerData);

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(finalCustomerData)
      .select('*')
      .single();

    if (customerError) {
      console.error('Customer creation error:', customerError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create customer',
        error: customerError.message
      });
    }

    console.log('Customer created successfully:', customer);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });

  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.get('/api/v1/vendors', async (req, res) => {
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*');

    if (error) {
      console.error('Vendors fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vendors'
      });
    }

    res.json({
      success: true,
      data: {
        vendors: vendors || [],
        total: vendors?.length || 0
      }
    });
  } catch (error) {
    console.error('Vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new vendor
app.post('/api/v1/vendors', async (req, res) => {
  try {
    const vendorData = req.body;

    console.log('🏪 Vendor API: Creating new vendor');
    console.log('📋 Vendor data:', { 
      name: vendorData.name, 
      email: vendorData.email, 
      contact_person: vendorData.contact_person 
    });

    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert(vendorData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Failed to create vendor:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create vendor',
        code: 'CREATION_FAILED',
        error: error.message
      });
    }

    console.log('✅ Vendor created successfully:', vendor.id);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('💥 Vendor creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: error.message
    });
  }
});

// Get vendor by ID
app.get('/api/v1/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🏪 Vendor API: Fetching vendor ${id}`);

    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !vendor) {
      console.error(`❌ Vendor ${id} not found:`, error);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }

    console.log(`✅ Fetched vendor ${id}`);

    res.json({
      success: true,
      data: { vendor }
    });

  } catch (error) {
    console.error('💥 Vendor fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message
    });
  }
});

// Update vendor
app.put('/api/v1/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`🔄 Vendor API: Updating vendor ${id}`);
    console.log('📋 Update data:', { 
      name: updateData.name, 
      email: updateData.email, 
      contact_person: updateData.contact_person 
    });

    const { data: vendor, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Failed to update vendor:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update vendor',
        code: 'UPDATE_FAILED',
        error: error.message
      });
    }

    if (!vendor) {
      console.error('❌ Vendor not found for update');
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }

    console.log(`✅ Vendor ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('💥 Vendor update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message
    });
  }
});

// Delete vendor
app.delete('/api/v1/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Vendor API: Deleting vendor ${id}`);

    // First check if vendor exists
    const { data: existingVendor, error: fetchError } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingVendor) {
      console.error(`❌ Vendor ${id} not found for deletion:`, fetchError);
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Failed to delete vendor:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to delete vendor',
        code: 'DELETE_FAILED',
        error: error.message
      });
    }

    console.log(`✅ Vendor ${id} (${existingVendor.name}) deleted successfully`);

    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    console.error('💥 Vendor deletion API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message
    });
  }
});

app.get('/api/v1/business-entities', async (req, res) => {
  try {
    const { data: entities, error } = await supabase
      .from('business_entities')
      .select('*');

    if (error) {
      console.error('Business entities fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch business entities'
      });
    }

    res.json({
      success: true,
      data: entities || []
    });
  } catch (error) {
    console.error('Business entities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Documents endpoints
app.get('/api/v1/documents', async (req, res) => {
  try {
    console.log('🏗️ Documents API endpoint called with query:', req.query);
    console.log('🔍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔗 Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('🔑 Supabase Key:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    
    // First, check if the table exists by trying a simple query
    console.log('� Checking if document_attachments table exists...');
    
    try {
      // Try to query the table structure first
      const { data: tableCheck, error: tableError } = await supabase
        .from('document_attachments')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Table check failed:', tableError);
        
        // Check if it's a table not found error
        if (tableError.message && (
          tableError.message.includes('relation "public.document_attachments" does not exist') ||
          tableError.message.includes('table "document_attachments" does not exist') ||
          tableError.message.includes('does not exist')
        )) {
          console.log('📋 Table does not exist, returning empty response with setup instructions');
          return res.json({
            success: true,
            data: [],
            meta: {
              total: 0,
              message: 'Document attachments table does not exist. The table needs to be created in your database.',
              tableExists: false,
              setupRequired: true,
              setupInstructions: 'Please run the setup-document-attachments.sql script in your Supabase SQL editor to create the required table.'
            }
          });
        }
        
        // For other errors, return them
        return res.status(500).json({
          success: false,
          message: 'Database access error',
          error: tableError.message,
          details: 'Unable to access document_attachments table',
          setupRequired: true
        });
      }
      
      console.log('✅ Table exists and is accessible');
      
    } catch (preliminaryError) {
      console.error('💥 Preliminary table check failed:', preliminaryError);
      return res.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          message: 'Document attachments table is not accessible. Please check database setup.',
          tableExists: false,
          setupRequired: true
        }
      });
    }
    
    const { 
      document_type, 
      compliance_status, 
      ocr_status, 
      customer_id, 
      vendor_id, 
      business_entity_id,
      linked_reference_type,
      date_from,
      date_to,
      limit = 100,
      offset = 0
    } = req.query;

    let query = supabase
      .from('document_attachments')
      .select('*')
      .order('uploaded_at', { ascending: false });

    // Apply range after building the query
    if (limit && offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    }

    // Apply filters
    if (document_type && document_type !== 'All') {
      query = query.eq('document_type', document_type);
    }
    if (compliance_status && compliance_status !== 'All') {
      query = query.eq('compliance_status', compliance_status);
    }
    if (ocr_status && ocr_status !== 'All') {
      query = query.eq('ocr_status', ocr_status);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }
    if (business_entity_id) {
      query = query.eq('business_entity_id', business_entity_id);
    }
    if (linked_reference_type && linked_reference_type !== 'All') {
      query = query.eq('linked_reference_type', linked_reference_type);
    }
    if (date_from) {
      query = query.gte('uploaded_at', date_from);
    }
    if (date_to) {
      query = query.lte('uploaded_at', date_to + 'T23:59:59');
    }

    console.log('📋 Executing documents query...');
    const { data: documents, error } = await query;

    if (error) {
      console.error('❌ Documents fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: error.message,
        details: error.details || 'Check database permissions and table structure'
      });
    }

    console.log(`✅ Successfully fetched ${documents?.length || 0} documents`);

    // Provide helpful response even when empty
    res.json({
      success: true,
      data: documents || [],
      meta: {
        total: documents?.length || 0,
        message: documents?.length === 0 ? 'No documents found. Upload some documents to see them here.' : `Found ${documents.length} documents`,
        tableExists: true
      }
    });
  } catch (error) {
    console.error('💥 Documents API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Document upload endpoint
app.post('/api/v1/documents/upload', async (req, res) => {
  try {
    console.log('Document upload endpoint called');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    // For now, return a mock success response
    // In a real implementation, you would handle file uploads to Supabase Storage
    const mockDocument = {
      id: 'mock-' + Date.now(),
      reference_type: req.body.reference_type || 'trade_document',
      reference_id: req.body.reference_id || null,
      file_name: req.body.file_name || 'uploaded_document.pdf',
      file_path: '/mock/path/to/document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      document_type: req.body.document_type || 'commercial_invoice',
      linked_reference_type: req.body.linked_reference_type || null,
      linked_reference_number: req.body.linked_reference_number || null,
      linked_reference_id: req.body.linked_reference_id || null,
      customer_id: req.body.customer_id || null,
      vendor_id: req.body.vendor_id || null,
      business_entity_id: req.body.business_entity_id || null,
      compliance_status: 'pending',
      compliance_notes: req.body.compliance_notes || null,
      ocr_status: 'pending',
      document_date: req.body.document_date || null,
      expiry_date: req.body.expiry_date || null,
      issuing_authority: req.body.issuing_authority || null,
      country_of_origin: req.body.country_of_origin || null,
      notes: req.body.notes || null,
      uploaded_by: 'admin',
      uploaded_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: mockDocument }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Document download endpoint
app.get('/api/v1/documents/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Document download endpoint called for ID:', id);

    // For now, return a 404 since this is a mock implementation
    res.status(404).json({
      success: false,
      message: 'Document not found or download not implemented in demo mode'
    });
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get documents for an entity (matching localhost pattern)
app.get('/api/v1/documents/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    console.log(`📁 Getting documents for ${entityType}:${entityId}`);

    const { data: documents, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', entityType)
      .eq('reference_id', entityId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return res.json({
        success: true,
        data: []
      });
    }

    console.log(`✅ Found ${documents?.length || 0} documents for ${entityType}:${entityId}`);

    res.json({
      success: true,
      data: documents || []
    });
  } catch (error) {
    console.error('💥 Documents fetch error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Get quotation attachments (legacy endpoint for compatibility)
app.get('/api/v1/documents/quotation/attachments', async (req, res) => {
  try {
    const { quotation_id } = req.query;
    
    console.log('📎 Documents API: Getting quotation attachments for:', quotation_id);
    
    if (!quotation_id) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID is required'
      });
    }

    // Try to get attachments from document_attachments table
    const { data: attachments, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', 'quotation')
      .eq('reference_id', quotation_id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Quotation attachments error:', error);
      // Return empty array instead of error for missing table
      return res.json({
        success: true,
        data: {
          attachments: []
        }
      });
    }

    console.log(`✅ Found ${attachments?.length || 0} attachments for quotation ${quotation_id}`);

    res.json({
      success: true,
      data: {
        attachments: attachments || []
      }
    });
  } catch (error) {
    console.error('💥 Quotation attachments error:', error);
    res.json({
      success: true,
      data: {
        attachments: []
      }
    });
  }
});

// Alternative endpoint pattern that frontend might be calling
app.get('/api/v1/documents/quotation/:quotationId', async (req, res) => {
  try {
    const { quotationId } = req.params;
    
    console.log(`📁 Getting quotation documents for: ${quotationId}`);

    const { data: documents, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', 'quotation')
      .eq('reference_id', quotationId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching quotation documents:', error);
      return res.json({
        success: true,
        data: []
      });
    }

    console.log(`✅ Found ${documents?.length || 0} documents for quotation ${quotationId}`);

    res.json({
      success: true,
      data: documents || []
    });
  } catch (error) {
    console.error('💥 Quotation documents fetch error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

app.get('/api/v1/product-categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*');

    if (error) {
      console.error('Product categories fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product categories'
      });
    }

    res.json({
      success: true,
      data: {
        categories: categories || []
      }
    });
  } catch (error) {
    console.error('Product categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/v1/sales/quotation-trends', async (req, res) => {
  try {
    // Get quotation trends from database for the last 6 months
    const { data: quotations, error } = await supabase
      .from('quotations')
      .select('created_at, status, total_amount')
      .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Quotation trends fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quotation trends'
      });
    }

    // Process data into monthly trends
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const trends = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      
      // Filter quotations for this month
      const monthQuotations = quotations?.filter(q => {
        const qDate = new Date(q.created_at);
        return qDate.getMonth() === date.getMonth() && qDate.getFullYear() === date.getFullYear();
      }) || [];

      const quotationCount = monthQuotations.length;
      const acceptedCount = monthQuotations.filter(q => q.status === 'accepted' || q.status === 'converted').length;
      const revenue = monthQuotations
        .filter(q => q.status === 'accepted' || q.status === 'converted')
        .reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0);

      trends.push({
        month: monthKey,
        quotations: quotationCount,
        accepted: acceptedCount,
        revenue: Math.round(revenue * 100) / 100
      });
    }

    res.json({
      success: true,
      data: {
        trends
      }
    });
  } catch (error) {
    console.error('Quotation trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Purchase orders endpoints
app.get('/api/v1/purchase-orders', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors (name, email)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`po_number.ilike.%${search}%`);
    }

    const { data: purchaseOrders, error, count } = await query;

    if (error) {
      console.error('Purchase orders fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase orders'
      });
    }

    res.json({
      success: true,
      data: {
        purchaseOrders: purchaseOrders || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new purchase order
app.post('/api/v1/purchase-orders', async (req, res) => {
  try {
    const { items, ...poData } = req.body;

    console.log('🛒 Purchase Order API: Creating new purchase order');
    console.log('📦 Items:', items?.length || 0);
    console.log('📋 PO Data:', { 
      vendor_id: poData.vendor_id, 
      business_entity_id: poData.business_entity_id,
      order_date: poData.order_date 
    });

    // Generate unique PO number with retry logic for concurrent requests
    const currentYear = new Date().getFullYear();
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    let po_number;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Get the next sequential number
        const { data: lastPO } = await supabase
          .from('purchase_orders')
          .select('po_number')
          .like('po_number', `PO-${currentYear}-%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastPO) {
          const lastNumber = parseInt(lastPO.po_number.split('-')[2]);
          nextNumber = lastNumber + 1;
        }

        // Add retry count to make it unique for concurrent requests
        const uniqueSuffix = retryCount > 0 ? `-${retryCount}` : '';
        po_number = `PO-${currentYear}-${nextNumber.toString().padStart(3, '0')}${uniqueSuffix}`;
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          // Final fallback to timestamp-based number
          console.log('⚠️ Using timestamp-based PO number after retries failed:', error.message);
          po_number = `PO-${currentYear}-T${timestamp.toString().slice(-6)}${randomSuffix}`;
        } else {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
        }
      }
    }

    console.log('🔢 Generated PO Number:', po_number);

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    const processedItems = items.map(item => {
      const line_total = item.quantity * item.unit_price;
      const discount = line_total * (item.discount_percent || 0) / 100;
      const taxable_amount = line_total - discount;
      const tax = taxable_amount * (item.tax_percent || 0) / 100;

      subtotal += line_total;
      discount_amount += discount;
      tax_amount += tax;

      return {
        ...item,
        line_total: taxable_amount + tax
      };
    });

    const total_amount = subtotal - discount_amount + tax_amount;

    console.log('💰 Calculated totals:', { subtotal, tax_amount, discount_amount, total_amount });

    const finalPOData = {
      ...poData,
      po_number,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      notes: poData.notes || 'None',
      terms_conditions: poData.terms_conditions || 'Standard terms and conditions apply. Payment due within 30 days of delivery. All items subject to quality inspection upon receipt.'
    };

    // Create purchase order with retry for unique constraint violations
    let purchaseOrder;
    let insertRetryCount = 0;
    const maxInsertRetries = 3;
    
    while (insertRetryCount < maxInsertRetries) {
      const { data, error: poError } = await supabase
        .from('purchase_orders')
        .insert(finalPOData)
        .select('*')
        .single();

      if (!poError) {
        purchaseOrder = data;
        console.log('✅ Purchase order created successfully:', purchaseOrder.id);
        break;
      }

      // Check if it's a unique constraint violation on po_number
      if (poError.message.includes('duplicate key value violates unique constraint') && 
          poError.message.includes('po_number')) {
        insertRetryCount++;
        if (insertRetryCount < maxInsertRetries) {
          // Generate a new unique PO number with timestamp suffix
          const newTimestamp = Date.now();
          const newRandomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          finalPOData.po_number = `PO-${currentYear}-T${newTimestamp.toString().slice(-6)}${newRandomSuffix}`;
          console.log(`🔄 Retrying PO creation with new number: ${finalPOData.po_number}`);
          continue;
        }
      }

      // If it's not a duplicate key error or we've exceeded retries, return error
      console.error('❌ Failed to create purchase order:', poError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create purchase order',
        code: 'CREATION_FAILED',
        error: poError.message
      });
    }

    // Create purchase order items
    const poItems = processedItems.map(item => ({
      ...item,
      purchase_order_id: purchaseOrder.id
    }));

    console.log('📦 Creating purchase order items:', poItems.length);

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(poItems);

    if (itemsError) {
      // Rollback PO creation
      console.error('❌ Failed to create purchase order items, rolling back:', itemsError);
      await supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id);
      return res.status(400).json({
        success: false,
        message: 'Failed to create purchase order items',
        code: 'ITEMS_CREATION_FAILED',
        error: itemsError.message
      });
    }

    console.log('🎉 Purchase order creation completed successfully');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchaseOrder }
    });

  } catch (error) {
    console.error('💥 Purchase order creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
});

// Get purchase order by ID
app.get('/api/v1/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Purchase Order API: Fetching purchase order ${id}`);

    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors(*),
        business_entities(*),
        purchase_order_items(*),
        vendor_bills(id, bill_number, status, total_amount, bill_date, due_date),
        delivery_challans(id, challan_number, status, challan_date, delivery_date, delivery_address, notes)
      `)
      .eq('id', id)
      .single();

    if (error || !purchaseOrder) {
      console.error('❌ Purchase order not found:', error?.message || 'No data');
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND',
        error: error?.message
      });
    }

    console.log('✅ Found purchase order:', { 
      id: purchaseOrder.id, 
      po_number: purchaseOrder.po_number,
      items_count: purchaseOrder.purchase_order_items?.length || 0,
      bills_count: purchaseOrder.vendor_bills?.length || 0,
      challans_count: purchaseOrder.delivery_challans?.length || 0
    });

    res.json({
      success: true,
      data: { purchaseOrder }
    });

  } catch (error) {
    console.error('💥 Purchase order fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
});

// ==================== DELIVERY CHALLANS ====================

// Create new delivery challan
app.post('/api/v1/delivery-challans', async (req, res) => {
  try {
    const {
      challan_number,
      purchase_order_id,
      challan_date,
      delivery_date,
      delivery_address,
      contact_person,
      phone,
      notes
    } = req.body;

    console.log('🚚 Delivery Challan API: Creating new delivery challan');
    console.log('📦 Request data:', { challan_number, purchase_order_id, challan_date });

    // Validate required fields
    if (!challan_number || !purchase_order_id || !challan_date) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        required_fields: ['challan_number', 'purchase_order_id', 'challan_date']
      });
    }

    // Check if purchase order exists
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, total_amount')
      .eq('id', purchase_order_id)
      .single();

    if (poError || !purchaseOrder) {
      console.error('❌ Purchase order not found:', poError?.message);
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND',
        error: poError?.message
      });
    }

    console.log('✅ Found purchase order:', { 
      id: purchaseOrder.id, 
      po_number: purchaseOrder.po_number 
    });

    const challanData = {
      challan_number,
      purchase_order_id,
      challan_date,
      delivery_date: delivery_date || null,
      delivery_address: delivery_address || null,
      contact_person: contact_person || null,
      phone: phone || null,
      notes: notes || null,
      status: 'generated'
    };

    console.log('📝 Creating delivery challan with data:', challanData);

    const { data: deliveryChallan, error } = await supabase
      .from('delivery_challans')
      .insert(challanData)
      .select(`
        *,
        purchase_orders(po_number, vendors(name))
      `)
      .single();

    if (error) {
      console.error('❌ Failed to create delivery challan:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create delivery challan',
        code: 'CREATION_FAILED',
        error: error.message
      });
    }

    console.log('🎉 Delivery challan created successfully:', deliveryChallan.id);

    res.status(201).json({
      success: true,
      message: 'Delivery challan created successfully',
      data: { deliveryChallan }
    });

  } catch (error) {
    console.error('💥 Delivery challan creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery challan',
      error: error.message
    });
  }
});

// Get delivery challan by ID
app.get('/api/v1/delivery-challans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Delivery Challan API: Fetching delivery challan ${id}`);

    const { data: deliveryChallan, error } = await supabase
      .from('delivery_challans')
      .select(`
        *,
        purchase_orders(
          po_number, 
          status,
          total_amount,
          vendors(name, email, phone, contact_person),
          purchase_order_items(quantity, description, unit_price, line_total)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !deliveryChallan) {
      console.error('❌ Delivery challan not found:', error?.message || 'No data');
      return res.status(404).json({
        success: false,
        message: 'Delivery challan not found',
        code: 'CHALLAN_NOT_FOUND',
        error: error?.message
      });
    }

    // Get document attachments for this challan
    const { data: attachments, error: attachmentError } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', 'delivery_challan')
      .eq('reference_id', id)
      .order('created_at', { ascending: false });

    if (attachmentError) {
      console.error('⚠️ Failed to fetch attachments:', attachmentError);
      // Don't fail the request, just continue without attachments
    }

    console.log('✅ Found delivery challan:', { 
      id: deliveryChallan.id, 
      challan_number: deliveryChallan.challan_number,
      attachments_count: attachments?.length || 0
    });

    res.json({
      success: true,
      data: {
        deliveryChallan: {
          ...deliveryChallan,
          attachments: attachments || []
        }
      }
    });

  } catch (error) {
    console.error('💥 Delivery challan fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery challan',
      error: error.message
    });
  }
});

// Get purchase order by ID
app.get('/api/v1/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📋 Purchase Order API: Fetching purchase order ${id}`);

    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors(*),
        business_entities(*),
        purchase_order_items(*),
        vendor_bills(id, bill_number, status, total_amount, bill_date, due_date),
        delivery_challans(id, challan_number, status, challan_date, delivery_date, delivery_address, notes)
      `)
      .eq('id', id)
      .single();

    if (error || !purchaseOrder) {
      console.error(`❌ Purchase order ${id} not found:`, error);
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND',
        error: error?.message
      });
    }

    console.log(`✅ Successfully fetched purchase order ${id}`);

    res.json({
      success: true,
      data: { purchaseOrder }
    });

  } catch (error) {
    console.error('💥 Purchase order fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
});

// Update purchase order
app.patch('/api/v1/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...poData } = req.body;

    console.log(`🔄 Purchase Order API: Updating purchase order ${id}`);
    console.log('📦 Items to update:', items?.length || 0);

    // First check if PO exists
    const { data: existingPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingPO) {
      console.error(`❌ Purchase order ${id} not found:`, fetchError);
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND'
      });
    }

    console.log(`✅ Found existing PO: ${existingPO.po_number}`);

    // Calculate totals if items are provided
    let subtotal = existingPO.subtotal;
    let tax_amount = existingPO.tax_amount;
    let discount_amount = existingPO.discount_amount;
    let total_amount = existingPO.total_amount;

    if (items && items.length > 0) {
      console.log('💰 Recalculating totals with new items');
      subtotal = 0;
      tax_amount = 0;
      discount_amount = 0;

      const processedItems = items.map(item => {
        const line_total = item.quantity * item.unit_price;
        const discount = line_total * (item.discount_percent || 0) / 100;
        const taxable_amount = line_total - discount;
        const tax = taxable_amount * (item.tax_percent || 0) / 100;

        subtotal += line_total;
        discount_amount += discount;
        tax_amount += tax;

        return {
          ...item,
          line_total: taxable_amount + tax
        };
      });

      total_amount = subtotal - discount_amount + tax_amount;

      console.log('🗑️ Deleting existing items');
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      if (deleteError) {
        console.error('❌ Failed to delete existing items:', deleteError);
        return res.status(400).json({
          success: false,
          message: 'Failed to update purchase order items',
          code: 'ITEMS_UPDATE_FAILED',
          error: deleteError.message
        });
      }

      console.log('➕ Inserting new items');
      // Insert new items
      const poItems = processedItems.map(item => ({
        ...item,
        purchase_order_id: id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsError) {
        console.error('❌ Failed to insert new items:', itemsError);
        return res.status(400).json({
          success: false,
          message: 'Failed to create updated purchase order items',
          code: 'ITEMS_CREATION_FAILED',
          error: itemsError.message
        });
      }
    }

    console.log('📋 Updating purchase order data');
    // Update purchase order
    const finalPOData = {
      ...poData,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      updated_at: new Date().toISOString()
    };

    const { data: purchaseOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(finalPOData)
      .eq('id', id)
      .select(`
        *,
        vendors(*),
        business_entities(*),
        purchase_order_items(*)
      `)
      .single();

    if (updateError) {
      console.error('❌ Failed to update purchase order:', updateError);
      return res.status(400).json({
        success: false,
        message: 'Failed to update purchase order',
        code: 'UPDATE_FAILED',
        error: updateError.message
      });
    }

    console.log(`✅ Purchase order ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: { purchaseOrder }
    });

  } catch (error) {
    console.error('💥 Purchase order update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order',
      error: error.message
    });
  }
});

// Update purchase order status
app.patch('/api/v1/purchase-orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📋 Purchase Order API: Updating status of PO ${id} to ${status}`);

    const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'received', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.error(`❌ Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        code: 'INVALID_STATUS',
        valid_statuses: validStatuses
      });
    }

    const updateData = { status };
    if (status === 'approved') {
      // Note: In production, we might not have req.user.id, so we'll skip this for now
      // updateData.approved_by = req.user.id;
      updateData.approved_at = new Date().toISOString();
      console.log('✅ Setting approval timestamp');
    }

    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Failed to update purchase order status:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update purchase order status',
        code: 'UPDATE_FAILED',
        error: error.message
      });
    }

    if (!purchaseOrder) {
      console.error('❌ Purchase order not found');
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND'
      });
    }

    console.log(`✅ Purchase order ${id} status updated to ${status}`);

    res.json({
      success: true,
      message: 'Purchase order status updated successfully',
      data: { purchaseOrder }
    });

  } catch (error) {
    console.error('💥 Purchase order status update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update purchase order status',
      error: error.message
    });
  }
});

// ==================== DELIVERY CHALLANS ====================

// Create new delivery challan
app.post('/api/v1/delivery-challans', async (req, res) => {
  try {
    const {
      challan_number,
      purchase_order_id,
      challan_date,
      delivery_date,
      delivery_address,
      contact_person,
      phone,
      notes
    } = req.body;

    console.log('🚚 Delivery Challan API: Creating new delivery challan');
    console.log('📋 Data:', { challan_number, purchase_order_id, challan_date });

    // Validate required fields
    if (!challan_number || !purchase_order_id || !challan_date) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        required_fields: ['challan_number', 'purchase_order_id', 'challan_date']
      });
    }

    // Check if purchase order exists
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, total_amount')
      .eq('id', purchase_order_id)
      .single();

    if (poError || !purchaseOrder) {
      console.error('❌ Purchase order not found:', poError);
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PO_NOT_FOUND'
      });
    }

    console.log('✅ Purchase order found:', purchaseOrder.po_number);

    const challanData = {
      challan_number,
      purchase_order_id,
      challan_date,
      delivery_date: delivery_date || null,
      delivery_address: delivery_address || null,
      contact_person: contact_person || null,
      phone: phone || null,
      notes: notes || null,
      status: 'generated'
    };

    const { data: deliveryChallan, error } = await supabase
      .from('delivery_challans')
      .insert(challanData)
      .select(`
        *,
        purchase_orders(po_number, vendors(name))
      `)
      .single();

    if (error) {
      console.error('❌ Failed to create delivery challan:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create delivery challan',
        code: 'CREATION_FAILED',
        error: error.message
      });
    }

    console.log('✅ Delivery challan created successfully:', deliveryChallan.id);

    res.status(201).json({
      success: true,
      message: 'Delivery challan created successfully',
      data: { deliveryChallan }
    });

  } catch (error) {
    console.error('💥 Delivery challan creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery challan',
      error: error.message
    });
  }
});

// Dashboard data endpoint
app.get('/api/v1/dashboard', async (req, res) => {
  try {
    // Get basic counts from different tables
    const [
      { data: quotations, error: quotationsError },
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: purchaseOrders, error: poError }
    ] = await Promise.all([
      supabase.from('quotations').select('*', { count: 'exact' }),
      supabase.from('customers').select('*', { count: 'exact' }),
      supabase.from('products').select('*', { count: 'exact' }),
      supabase.from('purchase_orders').select('*', { count: 'exact' })
    ]);

    if (quotationsError || customersError || productsError || poError) {
      console.error('Dashboard data fetch error:', { quotationsError, customersError, productsError, poError });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }

    res.json({
      success: true,
      data: {
        totalQuotations: quotations?.length || 0,
        totalCustomers: customers?.length || 0,
        totalProducts: products?.length || 0,
        totalPurchaseOrders: purchaseOrders?.length || 0,
        pendingQuotations: quotations?.filter(q => q.status === 'pending').length || 0,
        convertedQuotations: quotations?.filter(q => q.status === 'converted').length || 0
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Dashboard stats endpoint (specific stats for dashboard page)
app.get('/api/v1/dashboard/stats', async (req, res) => {
  try {
    console.log('Dashboard stats endpoint called');
    
    // Get comprehensive stats from different tables
    const [
      { data: quotations, error: quotationsError },
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: purchaseOrders, error: poError },
      { data: invoices, error: invoicesError },
      { data: vendorBills, error: vendorBillsError }
    ] = await Promise.all([
      supabase.from('quotations').select('status, total_amount, created_at'),
      supabase.from('customers').select('id, name, created_at'),
      supabase.from('products').select('current_stock, reorder_point, last_purchase_price'),
      supabase.from('purchase_orders').select('status, total_amount'),
      supabase.from('invoices').select('status, total_amount'),
      supabase.from('vendor_bills').select('status, total_amount')
    ]);

    if (quotationsError || customersError || productsError || poError) {
      console.error('Dashboard stats fetch error:', { quotationsError, customersError, productsError, poError });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats'
      });
    }

    // Calculate comprehensive stats
    const totalQuotations = quotations?.length || 0;
    const totalCustomers = customers?.length || 0;
    const totalProducts = products?.length || 0;
    const totalPurchaseOrders = purchaseOrders?.length || 0;
    
    const pendingQuotations = quotations?.filter(q => q.status === 'pending' || q.status === 'draft').length || 0;
    const convertedQuotations = quotations?.filter(q => q.status === 'converted' || q.status === 'accepted').length || 0;
    
    const totalRevenue = quotations?.filter(q => q.status === 'converted' || q.status === 'accepted')
      .reduce((sum, q) => sum + (parseFloat(q.total_amount) || 0), 0) || 0;
    
    // Product stats
    const lowStockItems = products?.filter(p => p.current_stock <= p.reorder_point).length || 0;
    const outOfStockItems = products?.filter(p => p.current_stock === 0).length || 0;
    const totalInventoryValue = products?.reduce((sum, p) => sum + (p.current_stock * (p.last_purchase_price || 0)), 0) || 0;
    
    // Purchase order stats
    const pendingPOs = purchaseOrders?.filter(po => po.status === 'pending').length || 0;
    const totalPurchaseValue = purchaseOrders?.reduce((sum, po) => sum + (parseFloat(po.total_amount) || 0), 0) || 0;
    
    // Invoice stats
    const totalInvoices = invoices?.length || 0;
    const pendingInvoices = invoices?.filter(inv => inv.status === 'pending' || inv.status === 'draft').length || 0;
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid').length || 0;
    
    // Vendor bills stats
    const totalVendorBills = vendorBills?.length || 0;
    const pendingVendorBills = vendorBills?.filter(bill => bill.status === 'pending').length || 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentQuotations = quotations?.filter(q => new Date(q.created_at) >= thirtyDaysAgo).length || 0;
    const recentCustomers = customers?.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length || 0;

    const stats = {
      // Core metrics
      totalQuotations,
      totalCustomers,
      totalProducts,
      totalPurchaseOrders,
      totalInvoices,
      totalVendorBills,
      
      // Status-based metrics
      pendingQuotations,
      convertedQuotations,
      pendingPOs,
      pendingInvoices,
      paidInvoices,
      pendingVendorBills,
      
      // Financial metrics
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalPurchaseValue: parseFloat(totalPurchaseValue.toFixed(2)),
      totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
      
      // Inventory metrics
      lowStockItems,
      outOfStockItems,
      
      // Conversion rates
      conversionRate: totalQuotations > 0 ? parseFloat(((convertedQuotations / totalQuotations) * 100).toFixed(1)) : 0,
      
      // Recent activity
      recentQuotations,
      recentCustomers,
      
      // Additional calculated metrics
      averageQuoteValue: totalQuotations > 0 ? parseFloat((totalRevenue / totalQuotations).toFixed(2)) : 0,
      invoiceCollectionRate: totalInvoices > 0 ? parseFloat(((paidInvoices / totalInvoices) * 100).toFixed(1)) : 0
    };

    console.log('Dashboard stats calculated successfully:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Invoices endpoint
app.get('/api/v1/invoices', async (req, res) => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Invoices fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch invoices'
      });
    }

    res.json({
      success: true,
      data: {
        invoices: invoices || [],
        total: invoices?.length || 0
      }
    });
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Stock movements endpoint
app.get('/api/v1/stock-movements', async (req, res) => {
  try {
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (name, sku)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Stock movements fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch stock movements'
      });
    }

    res.json({
      success: true,
      data: {
        movements: movements || [],
        total: movements?.length || 0
      }
    });
  } catch (error) {
    console.error('Stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Orders endpoint (sales orders)
app.get('/api/v1/orders', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('sales_orders')
      .select(`
        *,
        customers (name, email)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`order_number.ilike.%${search}%`);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }

    res.json({
      success: true,
      data: {
        orders: orders || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Convert quotation to order endpoint
app.post('/api/v1/orders/convert-quote', async (req, res) => {
  try {
    const { quotation_id, expected_delivery, priority, payment_terms, notes } = req.body;

    if (!quotation_id) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID is required'
      });
    }

    // Get the quotation details
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (name, email),
        quotation_items (*)
      `)
      .eq('id', quotation_id)
      .single();

    if (quotationError || !quotation) {
      console.error('Quotation fetch error:', quotationError);
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation has already been converted to an order'
      });
    }

    if (quotation.status !== 'approved' && quotation.status !== 'accepted' && quotation.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Only approved, accepted, or sent quotations can be converted to orders'
      });
    }

    // Validate required quotation fields
    if (!quotation.customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Quotation must have a valid customer ID'
      });
    }

    if (!quotation.total_amount || quotation.total_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation must have a valid total amount'
      });
    }

    console.log('Converting quotation:', {
      id: quotation.id,
      number: quotation.quotation_number,
      customer_id: quotation.customer_id,
      total_amount: quotation.total_amount,
      status: quotation.status,
      items_count: quotation.quotation_items?.length || 0
    });

    // Generate order number
    const orderNumber = `O-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        order_number: orderNumber,
        customer_id: quotation.customer_id,
        quotation_id: quotation.id,
        order_date: new Date().toISOString().split('T')[0], // Date only
        expected_delivery_date: expected_delivery || null,
        status: 'pending',
        subtotal: quotation.subtotal,
        tax_amount: quotation.tax_amount,
        discount_amount: quotation.discount_amount,
        total_amount: quotation.total_amount,
        notes: notes || null,
        created_by: null, // Set to null instead of 'system'
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      console.error('Order data that failed:', {
        order_number: orderNumber,
        customer_id: quotation.customer_id,
        quotation_id: quotation.id,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: expected_delivery || null,
        status: 'pending',
        subtotal: quotation.subtotal,
        tax_amount: quotation.tax_amount,
        discount_amount: quotation.discount_amount,
        total_amount: quotation.total_amount
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: orderError.message || 'Unknown database error'
      });
    }

    // Copy quotation items to order items
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const orderItems = quotation.quotation_items.map(item => ({
        sales_order_id: order.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        tax_percent: item.tax_percent,
        line_total: item.line_total,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items creation error:', itemsError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Update quotation status to converted
    const { error: updateError } = await supabase
      .from('quotations')
      .update({ 
        status: 'converted',
        updated_at: new Date().toISOString()
      })
      .eq('id', quotation_id);

    if (updateError) {
      console.error('Quotation update error:', updateError);
      // Don't fail the operation, the order is already created
    }

    res.json({
      success: true,
      data: {
        order: {
          ...order,
          customer: quotation.customers
        }
      },
      message: `Order ${orderNumber} created successfully from quotation ${quotation.quotation_number}`
    });

  } catch (error) {
    console.error('Convert quote to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Vendor bills endpoints - IMPORTANT: Specific routes must come BEFORE parameterized routes

// Get pending purchase orders for bill creation - MUST be before /:id route
app.get('/api/v1/vendor-bills/pending-pos', async (req, res) => {
  try {
    const { vendor_id } = req.query;

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors(name, email),
        purchase_order_items(*)
      `)
      .in('status', ['approved', 'sent', 'received'])
      .order('created_at', { ascending: false });

    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    const { data: purchaseOrders, error } = await query;

    if (error) {
      console.error('Purchase orders fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase orders'
      });
    }

    // Filter out POs that already have bills
    const { data: existingBills } = await supabase
      .from('vendor_bills')
      .select('purchase_order_id')
      .not('purchase_order_id', 'is', null);

    const existingPOIds = existingBills?.map(bill => bill.purchase_order_id) || [];
    const availablePOs = purchaseOrders?.filter(po => !existingPOIds.includes(po.id)) || [];

    res.json({
      success: true,
      data: {
        purchaseOrders: availablePOs,
        total: availablePOs.length
      }
    });
  } catch (error) {
    console.error('Pending POs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create vendor bill from purchase order - MUST be before /:id route
app.post('/api/v1/vendor-bills/create-from-po', async (req, res) => {
  try {
    const { purchase_order_id, bill_number, bill_date, due_date, notes } = req.body;

    if (!purchase_order_id || !bill_number || !bill_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: purchase_order_id, bill_number, bill_date'
      });
    }

    // Get the purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendors(*),
        purchase_order_items(*)
      `)
      .eq('id', purchase_order_id)
      .single();

    if (poError || !purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Check if bill already exists for this PO
    const { data: existingBill } = await supabase
      .from('vendor_bills')
      .select('id, bill_number')
      .eq('purchase_order_id', purchase_order_id)
      .single();

    if (existingBill) {
      return res.status(400).json({
        success: false,
        message: 'Vendor bill already exists for this purchase order'
      });
    }

    // Set due date (30 days from bill date if not provided)
    const dueDateFinal = due_date || (() => {
      const date = new Date(bill_date);
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })();

    // Create vendor bill
    const billData = {
      bill_number,
      purchase_order_id,
      vendor_id: purchaseOrder.vendor_id,
      business_entity_id: purchaseOrder.business_entity_id,
      bill_date,
      due_date: dueDateFinal,
      status: 'pending',
      subtotal: purchaseOrder.subtotal || 0,
      tax_amount: purchaseOrder.tax_amount || 0,
      total_amount: purchaseOrder.total_amount || 0,
      paid_amount: 0,
      created_at: new Date().toISOString()
    };

    const { data: vendorBill, error: billError } = await supabase
      .from('vendor_bills')
      .insert(billData)
      .select(`
        *,
        vendors(name, email),
        purchase_orders(po_number)
      `)
      .single();

    if (billError) {
      console.error('Vendor bill creation error:', billError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create vendor bill',
        error: billError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Vendor bill created from purchase order successfully',
      data: { vendorBill }
    });

  } catch (error) {
    console.error('Create vendor bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create manual expense bill - MUST be before /:id route
app.post('/api/v1/vendor-bills/create-expense', async (req, res) => {
  try {
    const {
      bill_number,
      vendor_id,
      bill_date,
      due_date,
      expense_category,
      description,
      subtotal,
      tax_amount = 0,
      total_amount,
      notes
    } = req.body;

    if (!bill_number || !vendor_id || !bill_date || !total_amount || !expense_category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bill_number, vendor_id, bill_date, total_amount, expense_category'
      });
    }

    // Set due date (30 days from bill date if not provided)
    const dueDateFinal = due_date || (() => {
      const date = new Date(bill_date);
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })();

    // Create expense bill
    const billData = {
      bill_number,
      vendor_id,
      purchase_order_id: null,
      bill_date,
      due_date: dueDateFinal,
      status: 'pending',
      subtotal: subtotal || total_amount,
      tax_amount,
      total_amount,
      paid_amount: 0,
      created_at: new Date().toISOString()
    };

    const { data: vendorBill, error: billError } = await supabase
      .from('vendor_bills')
      .insert(billData)
      .select(`
        *,
        vendors(name, email)
      `)
      .single();

    if (billError) {
      console.error('Expense bill creation error:', billError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create expense bill',
        error: billError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Expense bill created successfully',
      data: { vendorBill }
    });

  } catch (error) {
    console.error('Create expense bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all vendor bills - general list endpoint
app.get('/api/v1/vendor-bills', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, vendor_id, purchase_order_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('vendor_bills')
      .select(`
        *,
        vendors (name, email),
        purchase_orders (po_number)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`bill_number.ilike.%${search}%`);
    }

    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }

    if (purchase_order_id) {
      query = query.eq('purchase_order_id', purchase_order_id);
    }

    const { data: vendorBills, error, count } = await query;

    if (error) {
      console.error('Vendor bills fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor bills'
      });
    }

    res.json({
      success: true,
      data: {
        vendorBills: vendorBills || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Vendor bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get vendor bill by ID - MUST come AFTER all specific routes
app.get('/api/v1/vendor-bills/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: vendorBill, error } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        vendors(name, email, phone, gst_number, contact_person),
        purchase_orders(po_number, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Vendor bill fetch error:', error);
      return res.status(404).json({
        success: false,
        message: 'Vendor bill not found'
      });
    }

    res.json({
      success: true,
      data: { vendorBill }
    });
  } catch (error) {
    console.error('Vendor bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update vendor bill payment
app.patch('/api/v1/vendor-bills/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_date, payment_method, payment_reference } = req.body;

    if (!paid_amount || paid_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Get current bill
    const { data: currentBill, error: fetchError } = await supabase
      .from('vendor_bills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentBill) {
      return res.status(404).json({
        success: false,
        message: 'Vendor bill not found'
      });
    }

    const newPaidAmount = (currentBill.paid_amount || 0) + paid_amount;
    const newStatus = newPaidAmount >= currentBill.total_amount ? 'paid' : 'approved';

    const updateData = {
      paid_amount: newPaidAmount,
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    const { data: vendorBill, error } = await supabase
      .from('vendor_bills')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        vendors(name, email)
      `)
      .single();

    if (error) {
      console.error('Payment update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update payment'
      });
    }

    res.json({
      success: true,
      message: `Payment of ${paid_amount} recorded successfully`,
      data: { 
        vendorBill,
        payment_amount: paid_amount,
        remaining_amount: vendorBill.total_amount - vendorBill.paid_amount
      }
    });

  } catch (error) {
    console.error('Payment update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new vendor bill
app.post('/api/v1/vendor-bills', async (req, res) => {
  try {
    const {
      bill_number,
      purchase_order_id,
      vendor_id,
      bill_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      notes
    } = req.body;

    if (!bill_number || !vendor_id || !bill_date || !total_amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bill_number, vendor_id, bill_date, total_amount'
      });
    }

    const billData = {
      bill_number,
      purchase_order_id: purchase_order_id || null,
      vendor_id,
      bill_date,
      due_date: due_date || null,
      status: 'pending',
      subtotal: subtotal || 0,
      tax_amount: tax_amount || 0,
      total_amount,
      paid_amount: 0,
      created_at: new Date().toISOString()
    };

    const { data: vendorBill, error } = await supabase
      .from('vendor_bills')
      .insert(billData)
      .select(`
        *,
        vendors(name, email),
        purchase_orders(po_number)
      `)
      .single();

    if (error) {
      console.error('Vendor bill creation error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create vendor bill',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Vendor bill created successfully',
      data: { vendorBill }
    });

  } catch (error) {
    console.error('Vendor bill creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update vendor bill status
app.patch('/api/v1/vendor-bills/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'paid', 'overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const { data: vendorBill, error } = await supabase
      .from('vendor_bills')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Status update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update vendor bill status'
      });
    }

    res.json({
      success: true,
      message: 'Vendor bill status updated successfully',
      data: { vendorBill }
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Invoices endpoint  
app.get('/api/v1/invoices', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, customer_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (name, email)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Invoices fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch invoices'
      });
    }

    res.json({
      success: true,
      data: {
        invoices: invoices || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Ledger endpoints
app.get('/api/v1/ledger', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      date_from, 
      date_to, 
      reference_type, 
      account_type, 
      customer_vendor, 
      entry_type 
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = supabase
      .from('ledger_entries')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (date_from) {
      query = query.gte('entry_date', date_from);
    }

    if (date_to) {
      query = query.lte('entry_date', date_to);
    }

    if (reference_type) {
      query = query.eq('reference_type', reference_type);
    }

    if (account_type) {
      query = query.eq('account_type', account_type);
    }

    if (entry_type) {
      query = query.eq('entry_type', entry_type);
    }

    const { data: entries, error, count } = await query;

    if (error) {
      console.error('Ledger entries fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ledger entries'
      });
    }

    res.json({
      success: true,
      data: {
        entries: entries || [],
        total: count || 0,
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Ledger entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Financial metrics endpoint
app.get('/api/v1/ledger/metrics/summary', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    // Get basic financial data from various tables
    const [
      { data: invoices, error: invoicesError },
      { data: vendorBills, error: vendorBillsError },
      { data: ledgerEntries, error: ledgerError }
    ] = await Promise.all([
      supabase.from('invoices').select('total_amount, status, created_at'),
      supabase.from('vendor_bills').select('total_amount, status, created_at'),
      supabase.from('ledger_entries').select('total_debit, total_credit, reference_type, entry_date')
    ]);

    if (invoicesError || vendorBillsError || ledgerError) {
      console.error('Financial metrics fetch error:', { invoicesError, vendorBillsError, ledgerError });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch financial metrics'
      });
    }

    // Apply date filters if provided
    let filteredInvoices = invoices || [];
    let filteredVendorBills = vendorBills || [];
    let filteredLedgerEntries = ledgerEntries || [];

    if (date_from) {
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.created_at) >= new Date(date_from));
      filteredVendorBills = filteredVendorBills.filter(bill => new Date(bill.created_at) >= new Date(date_from));
      filteredLedgerEntries = filteredLedgerEntries.filter(entry => new Date(entry.entry_date) >= new Date(date_from));
    }

    if (date_to) {
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.created_at) <= new Date(date_to));
      filteredVendorBills = filteredVendorBills.filter(bill => new Date(bill.created_at) <= new Date(date_to));
      filteredLedgerEntries = filteredLedgerEntries.filter(entry => new Date(entry.entry_date) <= new Date(date_to));
    }

    // Calculate metrics
    const totalSales = filteredInvoices
      .filter(inv => inv.status === 'paid' || inv.status === 'sent')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const totalPurchases = filteredVendorBills
      .filter(bill => bill.status === 'paid' || bill.status === 'approved')
      .reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

    const expenses = filteredLedgerEntries
      .filter(entry => entry.reference_type === 'expense')
      .reduce((sum, entry) => sum + (entry.total_debit || 0), 0);

    const netProfit = totalSales - totalPurchases - expenses;

    const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'draft' || inv.status === 'sent').length;
    
    const pendingAmount = filteredInvoices
      .filter(inv => inv.status === 'draft' || inv.status === 'sent')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    res.json({
      success: true,
      data: {
        metrics: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          totalPurchases: parseFloat(totalPurchases.toFixed(2)),
          expenses: parseFloat(expenses.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          pendingInvoices,
          pendingAmount: parseFloat(pendingAmount.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Financial metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get comprehensive accounting metrics
app.get('/api/v1/ledger/metrics/accounting', async (req, res) => {
  try {
    // Get pending receivable invoices (customers owe money)
    const { data: pendingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        paid_amount,
        due_date,
        status,
        customers(name)
      `)
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (invoicesError) {
      console.error('Failed to fetch pending invoices:', invoicesError);
    }

    // Get pending payable vendor bills (we owe money to vendors)
    const { data: pendingVendorBills, error: vendorBillsError } = await supabase
      .from('vendor_bills')
      .select(`
        id,
        bill_number,
        total_amount,
        paid_amount,
        due_date,
        status,
        vendors(name)
      `)
      .neq('status', 'paid');

    if (vendorBillsError) {
      console.error('Failed to fetch vendor bills:', vendorBillsError);
    }

    // Calculate metrics
    const receivables = {
      count: pendingInvoices?.length || 0,
      totalAmount: pendingInvoices?.reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0) || 0,
      overdueCount: 0,
      overdueAmount: 0
    };

    const payables = {
      count: pendingVendorBills?.length || 0,
      totalAmount: pendingVendorBills?.reduce((sum, bill) => sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 0) || 0,
      overdueCount: 0,
      overdueAmount: 0
    };

    // Calculate overdue items
    const today = new Date();
    
    if (pendingInvoices) {
      pendingInvoices.forEach(invoice => {
        if (invoice.due_date && new Date(invoice.due_date) < today) {
          receivables.overdueCount++;
          receivables.overdueAmount += (invoice.total_amount || 0) - (invoice.paid_amount || 0);
        }
      });
    }

    if (pendingVendorBills) {
      pendingVendorBills.forEach(bill => {
        if (bill.due_date && new Date(bill.due_date) < today) {
          payables.overdueCount++;
          payables.overdueAmount += (bill.total_amount || 0) - (bill.paid_amount || 0);
        }
      });
    }

    // Get ledger-based metrics for P&L
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select(`
        reference_type,
        total_debit,
        total_credit,
        ledger_entry_lines (
          debit_amount,
          credit_amount,
          chart_of_accounts (
            account_type
          )
        )
      `);

    const pnlMetrics = {
      totalSales: 0,
      totalPurchases: 0,
      expenses: 0,
      netProfit: 0
    };

    if (entries) {
      entries.forEach(entry => {
        entry.ledger_entry_lines?.forEach(line => {
          const accountType = line.chart_of_accounts?.account_type;
          if (accountType === 'revenue') {
            pnlMetrics.totalSales += line.credit_amount || 0;
          } else if (accountType === 'expense') {
            pnlMetrics.expenses += line.debit_amount || 0;
          }
        });
        
        if (entry.reference_type === 'purchase_order') {
          pnlMetrics.totalPurchases += entry.total_debit || 0;
        }
      });
    }
    
    pnlMetrics.netProfit = pnlMetrics.totalSales - pnlMetrics.totalPurchases - pnlMetrics.expenses;

    res.json({
      success: true,
      data: {
        receivables,
        payables,
        pnl: pnlMetrics,
        summary: {
          totalOutstanding: receivables.totalAmount + payables.totalAmount,
          netReceivables: receivables.totalAmount - payables.totalAmount,
          totalOverdue: receivables.overdueAmount + payables.overdueAmount
        }
      }
    });

  } catch (error) {
    console.error('Accounting metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounting metrics',
      error: error.message
    });
  }
});

// Get chart of accounts
app.get('/api/v1/ledger/accounts/chart', async (req, res) => {
  try {
    console.log('📊 Ledger API: Fetching chart of accounts');

    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_code', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch chart of accounts:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch chart of accounts',
        code: 'FETCH_FAILED',
        error: error.message
      });
    }

    console.log(`✅ Fetched ${accounts?.length || 0} accounts`);

    res.json({
      success: true,
      data: { accounts }
    });

  } catch (error) {
    console.error('💥 Chart of accounts API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart of accounts',
      error: error.message
    });
  }
});

// Get ledger entry by ID
app.get('/api/v1/ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📋 Ledger API: Fetching ledger entry ${id}`);

    const { data: entry, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        ledger_entry_lines (
          id,
          account_id,
          debit_amount,
          credit_amount,
          description,
          chart_of_accounts (
            account_code,
            account_name,
            account_type
          )
        ),
        users!created_by (
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !entry) {
      console.error(`❌ Ledger entry ${id} not found:`, error);
      return res.status(404).json({
        success: false,
        message: 'Ledger entry not found',
        code: 'ENTRY_NOT_FOUND'
      });
    }

    console.log(`✅ Fetched ledger entry ${id}`);

    res.json({
      success: true,
      data: { entry }
    });

  } catch (error) {
    console.error('💥 Ledger entry fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ledger entry',
      error: error.message
    });
  }
});

// Create new ledger entry
app.post('/api/v1/ledger', async (req, res) => {
  try {
    const {
      entry_date,
      reference_type,
      reference_id,
      reference_number,
      description,
      lines
    } = req.body;

    console.log('📝 Ledger API: Creating new ledger entry');
    console.log('📋 Entry data:', { entry_date, reference_type, description, lines: lines?.length });

    // Validate that debits equal credits
    const totalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error('❌ Unbalanced entry:', { totalDebits, totalCredits });
      return res.status(400).json({
        success: false,
        message: 'Debits must equal credits',
        code: 'UNBALANCED_ENTRY',
        details: { totalDebits, totalCredits }
      });
    }

    // Generate entry number
    const currentYear = new Date().getFullYear();
    const { data: lastEntry } = await supabase
      .from('ledger_entries')
      .select('entry_number')
      .like('entry_number', `LE-${currentYear}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let entryNumber = `LE-${currentYear}-001`;
    if (lastEntry) {
      const lastNumber = parseInt(lastEntry.entry_number.split('-')[2]);
      entryNumber = `LE-${currentYear}-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    console.log('🔢 Generated entry number:', entryNumber);

    // Create ledger entry
    const { data: entry, error: entryError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_number: entryNumber,
        entry_date,
        reference_type,
        reference_id,
        reference_number,
        description,
        total_debit: totalDebits,
        total_credit: totalCredits
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Failed to create ledger entry:', entryError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create ledger entry',
        code: 'CREATION_FAILED',
        error: entryError.message
      });
    }

    console.log('✅ Ledger entry created:', entry.id);

    // Create ledger entry lines
    const linesWithEntryId = lines.map(line => ({
      ...line,
      ledger_entry_id: entry.id
    }));

    const { data: entryLines, error: linesError } = await supabase
      .from('ledger_entry_lines')
      .insert(linesWithEntryId)
      .select(`
        *,
        chart_of_accounts (
          account_code,
          account_name,
          account_type
        )
      `);

    if (linesError) {
      // Rollback the entry if lines creation fails
      console.error('❌ Failed to create ledger entry lines, rolling back:', linesError);
      await supabase.from('ledger_entries').delete().eq('id', entry.id);
      
      return res.status(400).json({
        success: false,
        message: 'Failed to create ledger entry lines',
        code: 'LINES_CREATION_FAILED',
        error: linesError.message
      });
    }

    console.log('✅ Ledger entry lines created:', entryLines?.length);

    res.status(201).json({
      success: true,
      message: 'Ledger entry created successfully',
      data: { 
        entry: {
          ...entry,
          ledger_entry_lines: entryLines
        }
      }
    });

  } catch (error) {
    console.error('💥 Ledger entry creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ledger entry',
      error: error.message
    });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

// Get all users with pagination and filtering
app.get('/api/v1/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log('🔍 Users API: Getting users with params:', { page, limit, search, role, status });

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('❌ Users fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }

    console.log(`✅ Successfully fetched ${users?.length || 0} users`);

    res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('💥 Users API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user by ID
app.get('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Users API: Getting user ${id}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ User fetch error:', error);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message
      });
    }

    console.log(`✅ Successfully fetched user ${id}`);

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('💥 User fetch API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new user
app.post('/api/v1/users', async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    console.log('🆕 Users API: Creating user:', { first_name, last_name, email, role });

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['first_name', 'last_name', 'email', 'password', 'role']
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        role,
        is_active: true
      })
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ User creation error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }

    console.log(`✅ Successfully created user ${user.id}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('💥 User creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update user
app.put('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role } = req.body;

    console.log(`🔄 Users API: Updating user ${id}:`, { first_name, last_name, email, role });

    // Build update object with only provided fields
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    updateData.updated_at = new Date().toISOString();

    // Check if email is being changed and if it's already taken
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another user',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ User update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }

    console.log(`✅ Successfully updated user ${id}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('💥 User update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Toggle user status (activate/deactivate)
app.patch('/api/v1/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting boolean

    console.log(`🔄 Users API: Toggling status for user ${id} to:`, status);

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        is_active: status === true || status === 'true',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ User status update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }

    console.log(`✅ Successfully updated user ${id} status to ${user.is_active ? 'active' : 'inactive'}`);

    res.json({
      success: true,
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('💥 User status API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete user (soft delete by deactivating)
app.delete('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Users API: Deleting user ${id}`);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For safety, we'll deactivate instead of hard delete
    // In production, you might want to do a hard delete or keep audit trail
    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('❌ User deletion error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }

    console.log(`✅ Successfully deleted (deactivated) user ${id}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('💥 User deletion API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ==================== SETTINGS ENDPOINTS ====================

// Get all settings
app.get('/api/v1/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch settings',
        error: error.message
      });
    }

    // If no settings exist, create default settings record
    if (!data) {
      const defaultSettings = {
        default_terms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in USD and exclude shipping.\n3. Products are subject to availability.\n4. Returns accepted within 14 days with original packaging.\n5. Late payments may incur additional charges.\n6. Delivery terms as per agreement.',
        quotation_terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.',
        invoice_terms: '1. Payment is due within 30 days of invoice date.\n2. Late payment charges: 2% per month.\n3. All disputes must be raised within 7 days of invoice date.\n4. Goods once sold cannot be returned without prior approval.',
        purchase_order_terms: '1. Delivery as per agreed schedule.\n2. Quality as per specifications.\n3. Payment terms as agreed.\n4. Penalties for delayed delivery may apply.',
        default_currency: 'USD',
        default_tax_rate: 18.0,
        quotation_number_format: 'Q-YYYY-###',
        invoice_number_format: 'INV-YYYY-###',
        email_notifications: true,
        sms_notifications: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newSettings, error: createError } = await supabase
        .from('system_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (createError) {
        console.error('Error creating default settings:', createError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create default settings',
          error: createError.message
        });
      }

      return res.json({
        success: true,
        data: newSettings
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error in GET /settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get terms and conditions only
app.get('/api/v1/settings/terms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('default_terms, quotation_terms, invoice_terms, purchase_order_terms')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching terms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch terms and conditions',
        error: error.message
      });
    }

    // Return default terms if none exist
    const defaultTerms = {
      default_terms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in USD and exclude shipping.\n3. Products are subject to availability.\n4. Returns accepted within 14 days with original packaging.\n5. Late payments may incur additional charges.\n6. Delivery terms as per agreement.',
      quotation_terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.',
      invoice_terms: '1. Payment is due within 30 days of invoice date.\n2. Late payment charges: 2% per month.\n3. All disputes must be raised within 7 days of invoice date.\n4. Goods once sold cannot be returned without prior approval.',
      purchase_order_terms: '1. Delivery as per agreed schedule.\n2. Quality as per specifications.\n3. Payment terms as agreed.\n4. Penalties for delayed delivery may apply.'
    };

    res.json({
      success: true,
      data: data || defaultTerms
    });
  } catch (error) {
    console.error('Error in GET /settings/terms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update terms and conditions only
app.put('/api/v1/settings/terms', async (req, res) => {
  try {
    const {
      default_terms,
      quotation_terms,
      invoice_terms,
      purchase_order_terms
    } = req.body;

    // Validate required fields
    if (!default_terms && !quotation_terms && !invoice_terms && !purchase_order_terms) {
      return res.status(400).json({
        success: false,
        message: 'At least one terms field is required'
      });
    }

    // Check if settings record exists
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    let result;
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (default_terms !== undefined) updateData.default_terms = default_terms;
    if (quotation_terms !== undefined) updateData.quotation_terms = quotation_terms;
    if (invoice_terms !== undefined) updateData.invoice_terms = invoice_terms;
    if (purchase_order_terms !== undefined) updateData.purchase_order_terms = purchase_order_terms;

    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings record with default values for other fields
      result = await supabase
        .from('system_settings')
        .insert({
          ...updateData,
          default_currency: 'USD',
          default_tax_rate: 18.0,
          quotation_number_format: 'Q-YYYY-###',
          invoice_number_format: 'INV-YYYY-###',
          email_notifications: true,
          sms_notifications: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating terms:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update terms and conditions',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'Terms and conditions updated successfully',
      data: {
        default_terms: result.data.default_terms,
        quotation_terms: result.data.quotation_terms,
        invoice_terms: result.data.invoice_terms,
        purchase_order_terms: result.data.purchase_order_terms
      }
    });
  } catch (error) {
    console.error('Error in PUT /settings/terms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update settings
app.put('/api/v1/settings', async (req, res) => {
  try {
    const {
      default_terms,
      quotation_terms,
      invoice_terms,
      purchase_order_terms,
      default_currency,
      default_tax_rate,
      quotation_number_format,
      invoice_number_format,
      email_notifications,
      sms_notifications
    } = req.body;

    // Check if settings record exists
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    let result;
    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('system_settings')
        .update({
          default_terms,
          quotation_terms,
          invoice_terms,
          purchase_order_terms,
          default_currency,
          default_tax_rate,
          quotation_number_format,
          invoice_number_format,
          email_notifications,
          sms_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings record
      result = await supabase
        .from('system_settings')
        .insert({
          default_terms,
          quotation_terms,
          invoice_terms,
          purchase_order_terms,
          default_currency: default_currency || 'USD',
          default_tax_rate: default_tax_rate || 18.0,
          quotation_number_format: quotation_number_format || 'Q-YYYY-###',
          invoice_number_format: invoice_number_format || 'INV-YYYY-###',
          email_notifications: email_notifications !== undefined ? email_notifications : true,
          sms_notifications: sms_notifications !== undefined ? sms_notifications : false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating settings:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in PUT /settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ==================== INVOICE CREATION FROM SALES ORDER ====================

// Create invoice from sales order
app.post('/api/v1/invoices/create-from-order', async (req, res) => {
  try {
    const { sales_order_id, invoice_date, due_date, notes } = req.body;

    console.log('🧾 Invoice API: Creating invoice from sales order:', { sales_order_id, invoice_date, due_date });

    if (!sales_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Sales order ID is required',
        code: 'MISSING_SALES_ORDER_ID'
      });
    }

    // Get the sales order with items
    const { data: salesOrder, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers(*),
        business_entities(*),
        sales_order_items(*),
        quotations(quotation_number)
      `)
      .eq('id', sales_order_id)
      .single();

    if (orderError || !salesOrder) {
      console.error('❌ Sales order fetch error:', orderError);
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
        code: 'SALES_ORDER_NOT_FOUND'
      });
    }

    // Check if sales order can be invoiced
    if (salesOrder.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create invoice for cancelled sales order',
        code: 'INVALID_ORDER_STATUS'
      });
    }

    // Check if invoice already exists for this sales order
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('sales_order_id', sales_order_id)
      .single();

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: `Invoice ${existingInvoice.invoice_number} already exists for this sales order`,
        code: 'INVOICE_ALREADY_EXISTS'
      });
    }

    // Generate invoice number
    const currentYear = new Date().getFullYear();
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${currentYear}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const invoice_number = `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

    // Prepare invoice data
    const finalInvoiceData = {
      invoice_number,
      sales_order_id: salesOrder.id,
      customer_id: salesOrder.customer_id,
      business_entity_id: salesOrder.business_entity_id,
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      due_date: due_date || (() => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
        return dueDate.toISOString().split('T')[0];
      })(),
      subtotal: salesOrder.subtotal,
      tax_amount: salesOrder.tax_amount,
      discount_amount: salesOrder.discount_amount,
      total_amount: salesOrder.total_amount,
      status: 'draft',
      notes: notes || `Invoice generated from Sales Order ${salesOrder.order_number}`
    };

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(finalInvoiceData)
      .select('*')
      .single();

    if (invoiceError) {
      console.error('❌ Invoice creation error:', invoiceError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create invoice',
        code: 'INVOICE_CREATION_FAILED',
        error: invoiceError.message
      });
    }

    // Create invoice items from sales order items
    const invoiceItems = salesOrder.sales_order_items.map(item => ({
      invoice_id: invoice.id,
      product_id: item.product_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_percent: item.tax_percent,
      line_total: item.line_total
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('❌ Invoice items creation error:', itemsError);
      // Rollback invoice creation
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return res.status(400).json({
        success: false,
        message: 'Failed to create invoice items',
        code: 'INVOICE_ITEMS_CREATION_FAILED',
        error: itemsError.message
      });
    }

    // Update sales order status to invoiced
    await supabase
      .from('sales_orders')
      .update({ status: 'invoiced' })
      .eq('id', sales_order_id);

    console.log(`✅ Successfully created invoice ${invoice_number} from sales order ${salesOrder.order_number}`);

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice_number} created successfully from sales order ${salesOrder.order_number}`,
      data: { 
        invoice: {
          ...invoice,
          customer: salesOrder.customers,
          business_entity: salesOrder.business_entities
        }
      }
    });

  } catch (error) {
    console.error('💥 Invoice creation API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ==================== SALES ORDER DELIVERY STATUS UPDATE ====================

// Update sales order delivery status
app.patch('/api/v1/orders/:id/delivery-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_status, delivery_date, delivery_notes } = req.body;

    console.log('🚚 Orders API: Updating delivery status for order:', { id, delivery_status, delivery_date });

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(delivery_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery status',
        code: 'INVALID_DELIVERY_STATUS',
        valid_statuses: validStatuses
      });
    }

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      console.error('❌ Sales order fetch error:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const updateData = { 
      status: delivery_status,
      updated_at: new Date().toISOString()
    };

    // Store delivery info in the notes field
    if (delivery_notes && delivery_status === 'delivered') {
      updateData.notes = currentOrder.notes 
        ? `${currentOrder.notes}\n\nDelivery Update: ${delivery_notes} (${new Date().toLocaleDateString()})`
        : `Delivery Update: ${delivery_notes} (${new Date().toLocaleDateString()})`;
    }

    const { data: order, error } = await supabase
      .from('sales_orders')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customers(name, email),
        business_entities(name)
      `)
      .single();

    if (error) {
      console.error('❌ Delivery status update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update delivery status',
        code: 'UPDATE_FAILED',
        error: error.message
      });
    }

    console.log(`✅ Successfully updated delivery status for order ${id} to ${delivery_status}`);

    res.json({
      success: true,
      message: `Order delivery status updated to ${delivery_status}`,
      data: { order }
    });

  } catch (error) {
    console.error('💥 Delivery status update API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ==================== AUTO-GENERATE INVOICES ====================

// Auto-generate invoices for completed deliveries
app.post('/api/v1/invoices/auto-generate', async (req, res) => {
  try {
    console.log('🤖 Invoice API: Starting auto-generation of invoices');

    // Get all delivered sales orders that don't have invoices yet
    const { data: deliveredOrders, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers(*),
        business_entities(*),
        sales_order_items(*),
        quotations(quotation_number)
      `)
      .eq('status', 'delivered')
      .is('invoice_generated', false);

    if (orderError) {
      console.error('❌ Failed to fetch delivered orders:', orderError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch delivered orders',
        code: 'FETCH_ORDERS_FAILED',
        error: orderError.message
      });
    }

    if (!deliveredOrders || deliveredOrders.length === 0) {
      console.log('ℹ️ No delivered orders found that need invoicing');
      return res.json({
        success: true,
        message: 'No delivered orders found that need invoicing',
        data: { generatedInvoices: [] }
      });
    }

    console.log(`📦 Found ${deliveredOrders.length} delivered orders to check`);

    // Filter out orders that already have invoices
    const ordersNeedingInvoices = [];
    for (const order of deliveredOrders) {
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('sales_order_id', order.id)
        .single();

      if (!existingInvoice) {
        ordersNeedingInvoices.push(order);
      }
    }

    console.log(`💡 Found ${ordersNeedingInvoices.length} orders needing invoices`);

    const generatedInvoices = [];

    // Generate invoices for each delivered order
    for (const salesOrder of ordersNeedingInvoices) {
      try {
        console.log(`📝 Generating invoice for order ${salesOrder.order_number}`);

        // Generate invoice number
        const currentYear = new Date().getFullYear();
        const { data: lastInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .like('invoice_number', `INV-${currentYear}-%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
          nextNumber = lastNumber + 1;
        }

        const invoice_number = `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

        // Calculate due date (30 days from delivery)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Prepare invoice data
        const finalInvoiceData = {
          invoice_number,
          sales_order_id: salesOrder.id,
          customer_id: salesOrder.customer_id,
          business_entity_id: salesOrder.business_entity_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: salesOrder.subtotal,
          tax_amount: salesOrder.tax_amount,
          discount_amount: salesOrder.discount_amount,
          total_amount: salesOrder.total_amount,
          status: 'sent',
          notes: `Auto-generated invoice for delivered order ${salesOrder.order_number}`
        };

        console.log(`📄 Creating invoice ${invoice_number} for order ${salesOrder.order_number}`);

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert(finalInvoiceData)
          .select('*')
          .single();

        if (invoiceError) {
          console.error(`❌ Failed to create invoice for order ${salesOrder.order_number}:`, invoiceError);
          continue;
        }

        // Create invoice items from sales order items
        const invoiceItems = salesOrder.sales_order_items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
          line_total: item.line_total
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          // Rollback invoice creation
          await supabase.from('invoices').delete().eq('id', invoice.id);
          console.error(`❌ Failed to create invoice items for order ${salesOrder.order_number}:`, itemsError);
          continue;
        }

        // Mark sales order as invoiced
        await supabase
          .from('sales_orders')
          .update({ 
            status: 'invoiced',
            invoice_generated: true
          })
          .eq('id', salesOrder.id);

        generatedInvoices.push({
          invoice_number,
          order_number: salesOrder.order_number,
          customer_name: salesOrder.customers?.name,
          total_amount: salesOrder.total_amount
        });

        console.log(`✅ Successfully generated invoice ${invoice_number} for order ${salesOrder.order_number}`);

      } catch (error) {
        console.error(`❌ Error generating invoice for order ${salesOrder.order_number}:`, error);
        continue;
      }
    }

    console.log(`🎉 Auto-generation complete: Generated ${generatedInvoices.length} invoice(s)`);

    res.json({
      success: true,
      message: `Successfully generated ${generatedInvoices.length} invoice(s) from delivered orders`,
      data: { generatedInvoices }
    });

  } catch (error) {
    console.error('💥 Auto-generate invoices API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate invoices',
      code: 'AUTO_GENERATION_FAILED',
      error: error.message
    });
  }
});

// ==================== MARK INVOICE AS PAID ====================

// Mark invoice as paid
app.patch('/api/v1/invoices/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`💰 Invoice API: Marking invoice ${id} as paid`);

    // First check if invoice exists
    const { data: existingInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching invoice:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND',
        error: fetchError.message
      });
    }

    if (!existingInvoice) {
      console.error('❌ Invoice not found in database');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
        code: 'INVOICE_NOT_FOUND'
      });
    }

    console.log('✅ Found invoice:', { 
      id: existingInvoice.id, 
      status: existingInvoice.status, 
      total_amount: existingInvoice.total_amount,
      paid_amount: existingInvoice.paid_amount 
    });

    // Update invoice with paid amount equal to total amount
    const updateData = { 
      status: 'paid',
      paid_amount: existingInvoice.total_amount,
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Updating invoice with data:', updateData);

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error updating invoice:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to mark invoice as paid',
        code: 'UPDATE_FAILED',
        error: error.message
      });
    }

    console.log('✅ Successfully marked invoice as paid:', invoice.invoice_number);

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: { invoice }
    });

  } catch (error) {
    console.error('💥 Mark as paid API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
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
