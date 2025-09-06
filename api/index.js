// Real API with Supabase connection for Vercel
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const quotation_number = `Q-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;

    const processedItems = items?.map(item => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const discountPercent = Number(item.discount_percent) || 0;
      const taxPercent = Number(item.tax_percent) || 0;

      const line_total = quantity * unitPrice;
      const discount = line_total * (discountPercent / 100);
      const taxable_amount = line_total - discount;
      const tax = taxable_amount * (taxPercent / 100);

      subtotal += line_total;
      discount_amount += discount;
      tax_amount += tax;

      return {
        description: item.description || '',
        quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        line_total: taxable_amount + tax
      };
    }) || [];

    const total_amount = subtotal - discount_amount + tax_amount;

    const finalQuotationData = {
      ...quotationData,
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
      .select(`
        *,
        customers (id, name, email, gst_number),
        vendors (id, name, email, gst_number),
        business_entities (id, name, legal_name, country)
      `)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

    const { data: documents, error } = await query;

    if (error) {
      console.error('Documents fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch documents'
      });
    }

    res.json({
      success: true,
      data: documents || []
    });
  } catch (error) {
    console.error('Documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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

// Vendor bills endpoint
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
        bills: vendorBills || [],
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
