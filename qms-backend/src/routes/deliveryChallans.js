const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all delivery challans
router.get('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, purchase_order_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('delivery_challans')
    .select(`
      *,
      purchase_orders(po_number, vendors(name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`challan_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (purchase_order_id) {
    query = query.eq('purchase_order_id', purchase_order_id);
  }

  const { data: deliveryChallans, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch delivery challans',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      deliveryChallans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get delivery challan by ID
router.get('/:id', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: deliveryChallan, error } = await supabaseAdmin
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

  if (error) {
    return res.status(404).json({
      error: 'Delivery challan not found',
      code: 'CHALLAN_NOT_FOUND',
      details: error.message
    });
  }

  // Get document attachments for this challan
  const { data: attachments, error: attachmentError } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('reference_type', 'delivery_challan')
    .eq('reference_id', id)
    .order('created_at', { ascending: false });

  if (attachmentError) {
    console.error('Failed to fetch attachments:', attachmentError);
    // Don't fail the request, just continue without attachments
  }

  res.json({
    success: true,
    data: {
      deliveryChallan: {
        ...deliveryChallan,
        attachments: attachments || []
      }
    }
  });
}));

// Create new delivery challan
router.post('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales']), asyncHandler(async (req, res) => {
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

  // Validate required fields
  if (!challan_number || !purchase_order_id || !challan_date) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'VALIDATION_ERROR',
      required_fields: ['challan_number', 'purchase_order_id', 'challan_date']
    });
  }

  // Check if purchase order exists
  const { data: purchaseOrder, error: poError } = await supabaseAdmin
    .from('purchase_orders')
    .select('id, po_number, vendor_id, total_amount')
    .eq('id', purchase_order_id)
    .single();

  if (poError || !purchaseOrder) {
    return res.status(404).json({
      error: 'Purchase order not found',
      code: 'PO_NOT_FOUND'
    });
  }

  const challanData = {
    challan_number,
    purchase_order_id,
    challan_date,
    delivery_date: delivery_date || null,
    delivery_address: delivery_address || null,
    contact_person: contact_person || null,
    phone: phone || null,
    notes: notes || null,
    status: 'generated',
    created_by: req.user.id
  };

  const { data: deliveryChallan, error } = await supabaseAdmin
    .from('delivery_challans')
    .insert(challanData)
    .select(`
      *,
      purchase_orders(po_number, vendors(name))
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create delivery challan',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Delivery challan created successfully',
    data: { deliveryChallan }
  });
}));

// Update delivery challan status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['generated', 'dispatched', 'in_transit', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      code: 'INVALID_STATUS',
      valid_statuses: validStatuses
    });
  }

  const { data: deliveryChallan, error } = await supabaseAdmin
    .from('delivery_challans')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update delivery challan status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Delivery challan status updated successfully',
    data: { deliveryChallan }
  });
}));

module.exports = router;
