const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Convert quotation to sales order
router.post('/convert-quote', authenticateToken, authorize(['admin', 'sales']), asyncHandler(async (req, res) => {
  const { quotation_id, expected_delivery, notes, status = 'pending' } = req.body;

  if (!quotation_id) {
    return res.status(400).json({
      error: 'Quotation ID is required',
      code: 'MISSING_QUOTATION_ID'
    });
  }

  // Get the quotation with items
  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers(*),
      quotation_items(*)
    `)
    .eq('id', quotation_id)
    .single();

  if (quotationError || !quotation) {
    return res.status(404).json({
      error: 'Quotation not found',
      code: 'QUOTATION_NOT_FOUND'
    });
  }

  // Check if quotation can be converted
  if (quotation.status === 'converted') {
    return res.status(400).json({
      error: 'Quotation has already been converted',
      code: 'ALREADY_CONVERTED'
    });
  }

  if (!['draft', 'sent', 'approved'].includes(quotation.status)) {
    return res.status(400).json({
      error: 'Only draft, sent, or approved quotations can be converted',
      code: 'INVALID_STATUS',
      current_status: quotation.status
    });
  }

  // Generate order number
  const currentYear = new Date().getFullYear();
  const { data: lastOrder } = await supabaseAdmin
    .from('sales_orders')
    .select('order_number')
    .like('order_number', `SO-${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const order_number = `SO-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

  // Create sales order
  const orderData = {
    order_number,
    quotation_id: quotation.id,
    customer_id: quotation.customer_id,
    business_entity_id: quotation.business_entity_id,
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: expected_delivery,
    notes,
    subtotal: quotation.subtotal,
    tax_amount: quotation.tax_amount,
    discount_amount: quotation.discount_amount,
    total_amount: quotation.total_amount,
    status,
    created_by: req.user.id
  };

  const { data: order, error: orderError } = await supabaseAdmin
    .from('sales_orders')
    .insert(orderData)
    .select('*')
    .single();

  if (orderError) {
    return res.status(400).json({
      error: 'Failed to create sales order',
      code: 'ORDER_CREATION_FAILED',
      details: orderError.message
    });
  }

  // Create order items from quotation items
  const orderItems = quotation.quotation_items.map(item => ({
    sales_order_id: order.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    tax_percent: item.tax_percent,
    line_total: item.line_total
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('sales_order_items')
    .insert(orderItems);

  if (itemsError) {
    // Rollback order creation
    await supabaseAdmin.from('sales_orders').delete().eq('id', order.id);
    return res.status(400).json({
      error: 'Failed to create order items',
      code: 'ORDER_ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  // Update quotation status to converted
  const { error: updateError } = await supabaseAdmin
    .from('quotations')
    .update({ 
      status: 'converted'
    })
    .eq('id', quotation_id);

  if (updateError) {
    // Don't fail the request, just log the warning
  }

  res.status(201).json({
    success: true,
    message: 'Quote successfully converted to sales order',
    data: { 
      order,
      order_number: order.order_number
    }
  });
}));

// Get all sales orders
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, customer_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('sales_orders')
    .select(`
      *,
      customers(name, email),
      business_entities(name),
      sales_order_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`order_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch sales orders',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get order by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: order, error } = await supabaseAdmin
    .from('sales_orders')
    .select(`
      *,
      customers(*),
      business_entities(*),
      sales_order_items(*),
      quotations(quotation_number)
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    return res.status(404).json({
      error: 'Sales order not found',
      code: 'ORDER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { order }
  });
}));

module.exports = router;
