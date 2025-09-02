const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all purchase orders
router.get('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, vendor_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('purchase_orders')
    .select(`
      *,
      vendors(name, email),
      business_entities(name),
      purchase_order_items(*),
      vendor_bills(id, bill_number, status, total_amount),
      delivery_challans(id, challan_number, status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`po_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (vendor_id) {
    query = query.eq('vendor_id', vendor_id);
  }

  const { data: purchaseOrders, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch purchase orders',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      purchaseOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get purchase order by ID
router.get('/:id', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: purchaseOrder, error } = await supabaseAdmin
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
    return res.status(404).json({
      error: 'Purchase order not found',
      code: 'PO_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { purchaseOrder }
  });
}));

// Create new purchase order
router.post('/', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.purchaseOrder), asyncHandler(async (req, res) => {
  const { items, ...poData } = req.body;

  // Generate PO number
  const currentYear = new Date().getFullYear();
  const { data: lastPO } = await supabaseAdmin
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

  const po_number = `PO-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

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

  const finalPOData = {
    ...poData,
    po_number,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    created_by: req.user.id
  };

  // Create purchase order
  const { data: purchaseOrder, error: poError } = await supabaseAdmin
    .from('purchase_orders')
    .insert(finalPOData)
    .select('*')
    .single();

  if (poError) {
    return res.status(400).json({
      error: 'Failed to create purchase order',
      code: 'CREATION_FAILED',
      details: poError.message
    });
  }

  // Create purchase order items
  const poItems = processedItems.map(item => ({
    ...item,
    purchase_order_id: purchaseOrder.id
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_order_items')
    .insert(poItems);

  if (itemsError) {
    // Rollback PO creation
    await supabaseAdmin.from('purchase_orders').delete().eq('id', purchaseOrder.id);
    return res.status(400).json({
      error: 'Failed to create purchase order items',
      code: 'ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: { purchaseOrder }
  });
}));

// Update purchase order status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'received', 'closed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      code: 'INVALID_STATUS',
      valid_statuses: validStatuses
    });
  }

  const updateData = { status };
  if (status === 'approved') {
    updateData.approved_by = req.user.id;
    updateData.approved_at = new Date().toISOString();
  }

  const { data: purchaseOrder, error } = await supabaseAdmin
    .from('purchase_orders')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update purchase order status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Purchase order status updated successfully',
    data: { purchaseOrder }
  });
}));

// Update purchase order
router.patch('/:id', authenticateToken, authorize(['admin', 'procurement']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, ...poData } = req.body;

  // First check if PO exists
  const { data: existingPO, error: fetchError } = await supabaseAdmin
    .from('purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingPO) {
    return res.status(404).json({
      error: 'Purchase order not found',
      code: 'PO_NOT_FOUND'
    });
  }

  // Calculate totals if items are provided
  let subtotal = existingPO.subtotal;
  let tax_amount = existingPO.tax_amount;
  let discount_amount = existingPO.discount_amount;
  let total_amount = existingPO.total_amount;

  if (items && items.length > 0) {
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

    // Delete existing items
    const { error: deleteError } = await supabaseAdmin
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id);

    if (deleteError) {
      return res.status(400).json({
        error: 'Failed to update purchase order items',
        code: 'ITEMS_UPDATE_FAILED',
        details: deleteError.message
      });
    }

    // Insert new items
    const poItems = processedItems.map(item => ({
      ...item,
      purchase_order_id: id
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('purchase_order_items')
      .insert(poItems);

    if (itemsError) {
      return res.status(400).json({
        error: 'Failed to create updated purchase order items',
        code: 'ITEMS_CREATION_FAILED',
        details: itemsError.message
      });
    }
  }

  // Update purchase order
  const finalPOData = {
    ...poData,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    updated_at: new Date().toISOString()
  };

  const { data: purchaseOrder, error: updateError } = await supabaseAdmin
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
    return res.status(400).json({
      error: 'Failed to update purchase order',
      code: 'UPDATE_FAILED',
      details: updateError.message
    });
  }

  res.json({
    success: true,
    message: 'Purchase order updated successfully',
    data: { purchaseOrder }
  });
}));

module.exports = router;
