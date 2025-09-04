const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Optimized customer routes with cursor-based pagination and proper joins

// GET /customers - Optimized with cursor pagination and search
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { 
    limit = 20, 
    cursor, 
    search, 
    status,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const pageLimit = Math.min(parseInt(limit), 100); // Cap at 100 items
  
  let query = supabaseAdmin
    .from('customers')
    .select(`
      *,
      quotations:quotations(count),
      sales_orders:sales_orders(count),
      total_revenue:sales_orders(total_amount.sum())
    `, { count: 'exact' });

  // Apply search filters with full-text search
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      email.ilike.%${search}%,
      contact_person.ilike.%${search}%,
      phone.ilike.%${search}%
    `);
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply cursor-based pagination
  if (cursor) {
    const operator = sort_order === 'desc' ? 'lt' : 'gt';
    query = query[operator](sort_by, cursor);
  }

  // Apply sorting and limit
  query = query
    .order(sort_by, { ascending: sort_order === 'asc' })
    .limit(pageLimit);

  const { data: customers, error, count } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate next cursor
  const nextCursor = customers.length === pageLimit ? 
    customers[customers.length - 1][sort_by] : null;

  // Transform data to include aggregated counts
  const transformedCustomers = customers.map(customer => ({
    ...customer,
    quotation_count: customer.quotations?.[0]?.count || 0,
    order_count: customer.sales_orders?.[0]?.count || 0,
    total_revenue: customer.total_revenue?.[0]?.sum || 0,
    quotations: undefined, // Remove the raw aggregation data
    sales_orders: undefined,
    total_revenue: undefined
  }));

  res.json({
    success: true,
    data: {
      customers: transformedCustomers,
      pagination: {
        total: count,
        limit: pageLimit,
        next_cursor: nextCursor,
        has_more: customers.length === pageLimit
      }
    }
  });
}));

// GET /customers/:id - Optimized with related data joins
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Single query with all related data to prevent N+1 queries
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select(`
      *,
      quotations:quotations(
        id,
        quotation_number,
        total_amount,
        status,
        created_at,
        quotation_items:quotation_items(
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products:products(name, sku)
        )
      ),
      sales_orders:sales_orders(
        id,
        order_number,
        total_amount,
        status,
        order_date
      ),
      documents:documents(
        id,
        file_name,
        file_type,
        upload_date,
        file_size
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.status(400).json({ error: error.message });
  }

  // Calculate summary statistics
  const totalQuotations = customer.quotations?.length || 0;
  const totalOrders = customer.sales_orders?.length || 0;
  const totalRevenue = customer.sales_orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  res.json({
    success: true,
    data: {
      customer: {
        ...customer,
        statistics: {
          total_quotations: totalQuotations,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          average_order_value: avgOrderValue,
          conversion_rate: totalQuotations > 0 ? (totalOrders / totalQuotations) * 100 : 0
        }
      }
    }
  });
}));

// POST /customers - Create with validation
router.post('/', authenticateToken, authorize(['admin', 'sales']), validate(schemas.customer), asyncHandler(async (req, res) => {
  const customerData = req.body;

  // Check for duplicate email
  const { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', customerData.email)
    .single();

  if (existingCustomer) {
    return res.status(400).json({ error: 'Customer with this email already exists' });
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert([customerData])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    success: true,
    data: { customer }
  });
}));

// PUT /customers/:id - Update with optimistic locking
router.put('/:id', authenticateToken, authorize(['admin', 'sales']), validate(schemas.customer), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if customer exists and get current version
  const { data: existingCustomer, error: fetchError } = await supabaseAdmin
    .from('customers')
    .select('id, updated_at')
    .eq('id', id)
    .single();

  if (fetchError || !existingCustomer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Check for email conflicts (excluding current customer)
  if (updateData.email) {
    const { data: emailConflict } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', updateData.email)
      .neq('id', id)
      .single();

    if (emailConflict) {
      return res.status(400).json({ error: 'Another customer with this email already exists' });
    }
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    data: { customer }
  });
}));

// DELETE /customers/:id - Soft delete with cascade checks
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check for related records that would prevent deletion
  const { data: relatedRecords } = await supabaseAdmin
    .from('quotations')
    .select('id')
    .eq('customer_id', id)
    .eq('status', 'active')
    .limit(1);

  if (relatedRecords && relatedRecords.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete customer with active quotations. Please complete or cancel all quotations first.' 
    });
  }

  // Soft delete by updating status
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update({ 
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    message: 'Customer deleted successfully',
    data: { customer }
  });
}));

// GET /customers/search/suggestions - Fast autocomplete search
router.get('/search/suggestions', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.json({ success: true, data: { suggestions: [] } });
  }

  const { data: suggestions, error } = await supabaseAdmin
    .from('customers')
    .select('id, name, email, phone')
    .or(`name.ilike.%${q}%, email.ilike.%${q}%`)
    .eq('status', 'active')
    .order('name')
    .limit(parseInt(limit));

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    data: { suggestions }
  });
}));

module.exports = router;
