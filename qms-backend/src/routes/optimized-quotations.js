const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Optimized quotations routes with joins to prevent N+1 queries

// GET /quotations - Optimized with cursor pagination and joins
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { 
    limit = 20, 
    cursor, 
    search, 
    status,
    customer_id,
    date_from,
    date_to,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const pageLimit = Math.min(parseInt(limit), 100);
  
  let query = supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers:customers(
        id,
        name,
        email,
        contact_person
      ),
      quotation_items:quotation_items(
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        products:products(
          id,
          name,
          sku,
          category
        )
      )
    `, { count: 'exact' });

  // Apply search filters
  if (search) {
    query = query.or(`
      quotation_number.ilike.%${search}%,
      description.ilike.%${search}%,
      customers.name.ilike.%${search}%
    `);
  }

  // Apply filters
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  if (date_from) {
    query = query.gte('created_at', date_from);
  }

  if (date_to) {
    query = query.lte('created_at', date_to);
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

  const { data: quotations, error, count } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate next cursor
  const nextCursor = quotations.length === pageLimit ? 
    quotations[quotations.length - 1][sort_by] : null;

  // Transform data to include item counts and totals
  const transformedQuotations = quotations.map(quotation => ({
    ...quotation,
    item_count: quotation.quotation_items?.length || 0,
    customer_name: quotation.customers?.name || 'Unknown',
    customer_email: quotation.customers?.email || ''
  }));

  res.json({
    success: true,
    data: {
      quotations: transformedQuotations,
      pagination: {
        total: count,
        limit: pageLimit,
        next_cursor: nextCursor,
        has_more: quotations.length === pageLimit
      }
    }
  });
}));

// GET /quotations/:id - Single quotation with all related data
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: quotation, error } = await supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers:customers(
        id,
        name,
        email,
        phone,
        contact_person,
        billing_address,
        shipping_address
      ),
      quotation_items:quotation_items(
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        description,
        products:products(
          id,
          name,
          sku,
          category,
          unit_price as product_unit_price,
          stock_quantity
        )
      ),
      sales_orders:sales_orders(
        id,
        order_number,
        status,
        order_date,
        total_amount
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    data: { quotation }
  });
}));

// POST /quotations - Create with items in single transaction
router.post('/', authenticateToken, authorize(['admin', 'sales']), validate(schemas.quotation), asyncHandler(async (req, res) => {
  const { items, ...quotationData } = req.body;

  // Generate quotation number
  const currentYear = new Date().getFullYear();
  const { data: lastQuotation } = await supabaseAdmin
    .from('quotations')
    .select('quotation_number')
    .like('quotation_number', `Q-${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastQuotation) {
    const lastNumber = parseInt(lastQuotation.quotation_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const quotation_number = `Q-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = subtotal * (quotationData.tax_rate || 0) / 100;
  const total_amount = subtotal + tax_amount - (quotationData.discount_amount || 0);

  // Start transaction
  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('quotations')
    .insert([{
      ...quotationData,
      quotation_number,
      subtotal,
      tax_amount,
      total_amount,
      status: 'draft'
    }])
    .select()
    .single();

  if (quotationError) {
    return res.status(400).json({ error: quotationError.message });
  }

  // Insert quotation items
  const quotationItems = items.map(item => ({
    ...item,
    quotation_id: quotation.id,
    total_price: item.quantity * item.unit_price
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('quotation_items')
    .insert(quotationItems)
    .select(`
      *,
      products:products(name, sku)
    `);

  if (itemsError) {
    // Rollback quotation if items insertion fails
    await supabaseAdmin
      .from('quotations')
      .delete()
      .eq('id', quotation.id);
    
    return res.status(400).json({ error: itemsError.message });
  }

  res.status(201).json({
    success: true,
    data: {
      quotation: {
        ...quotation,
        quotation_items: insertedItems
      }
    }
  });
}));

// PUT /quotations/:id - Update quotation and items
router.put('/:id', authenticateToken, authorize(['admin', 'sales']), validate(schemas.quotation), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, ...quotationData } = req.body;

  // Check if quotation exists and is editable
  const { data: existingQuotation, error: fetchError } = await supabaseAdmin
    .from('quotations')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchError || !existingQuotation) {
    return res.status(404).json({ error: 'Quotation not found' });
  }

  if (existingQuotation.status === 'accepted' || existingQuotation.status === 'converted') {
    return res.status(400).json({ error: 'Cannot modify accepted or converted quotations' });
  }

  // Calculate new totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = subtotal * (quotationData.tax_rate || 0) / 100;
  const total_amount = subtotal + tax_amount - (quotationData.discount_amount || 0);

  // Update quotation
  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('quotations')
    .update({
      ...quotationData,
      subtotal,
      tax_amount,
      total_amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (quotationError) {
    return res.status(400).json({ error: quotationError.message });
  }

  // Delete existing items and insert new ones
  await supabaseAdmin
    .from('quotation_items')
    .delete()
    .eq('quotation_id', id);

  const quotationItems = items.map(item => ({
    ...item,
    quotation_id: id,
    total_price: item.quantity * item.unit_price
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('quotation_items')
    .insert(quotationItems)
    .select(`
      *,
      products:products(name, sku)
    `);

  if (itemsError) {
    return res.status(400).json({ error: itemsError.message });
  }

  res.json({
    success: true,
    data: {
      quotation: {
        ...quotation,
        quotation_items: insertedItems
      }
    }
  });
}));

// PATCH /quotations/:id/status - Update quotation status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'sales']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  if (notes) {
    updateData.notes = notes;
  }

  if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
  }

  const { data: quotation, error } = await supabaseAdmin
    .from('quotations')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      customers:customers(name, email)
    `)
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    data: { quotation }
  });
}));

// GET /quotations/analytics/summary - Performance analytics
router.get('/analytics/summary', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;

  let dateFilter = '';
  if (date_from && date_to) {
    dateFilter = `AND created_at BETWEEN '${date_from}' AND '${date_to}'`;
  }

  // Use raw SQL for complex analytics to avoid multiple queries
  const { data: analytics, error } = await supabaseAdmin.rpc('get_quotation_analytics', {
    p_date_from: date_from || null,
    p_date_to: date_to || null
  });

  if (error) {
    // Fallback to basic queries if stored procedure doesn't exist
    const { data: basicStats } = await supabaseAdmin
      .from('quotations')
      .select('status, total_amount')
      .gte('created_at', date_from || '1900-01-01')
      .lte('created_at', date_to || '2100-01-01');

    const summary = {
      total_quotations: basicStats?.length || 0,
      total_value: basicStats?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0,
      accepted_count: basicStats?.filter(q => q.status === 'accepted').length || 0,
      pending_count: basicStats?.filter(q => ['draft', 'sent'].includes(q.status)).length || 0,
      conversion_rate: 0
    };

    if (summary.total_quotations > 0) {
      summary.conversion_rate = (summary.accepted_count / summary.total_quotations) * 100;
    }

    return res.json({
      success: true,
      data: { analytics: summary }
    });
  }

  res.json({
    success: true,
    data: { analytics }
  });
}));

module.exports = router;
