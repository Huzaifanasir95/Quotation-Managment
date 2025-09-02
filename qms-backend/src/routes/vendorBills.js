const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all vendor bills
router.get('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, vendor_id, purchase_order_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('vendor_bills')
    .select(`
      *,
      vendors(name, email),
      purchase_orders(po_number)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`bill_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (vendor_id) {
    query = query.eq('vendor_id', vendor_id);
  }

  if (purchase_order_id) {
    query = query.eq('purchase_order_id', purchase_order_id);
  }

  const { data: vendorBills, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch vendor bills',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      vendorBills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Create new vendor bill
router.post('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales']), validate(schemas.vendorBill), asyncHandler(async (req, res) => {
  const {
    bill_number,
    purchase_order_id,
    vendor_id,
    bill_date,
    due_date,
    subtotal,
    tax_amount,
    total_amount,
    notes,
    files
  } = req.body;

  // Validate required fields
  if (!bill_number || !vendor_id || !bill_date || !total_amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'VALIDATION_ERROR',
      required_fields: ['bill_number', 'vendor_id', 'bill_date', 'total_amount']
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
    created_by: req.user.id
  };

  const { data: vendorBill, error } = await supabaseAdmin
    .from('vendor_bills')
    .insert(billData)
    .select(`
      *,
      vendors(name, email),
      purchase_orders(po_number)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create vendor bill',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  // If files are provided, create document attachments
  if (files && files.length > 0) {
    const attachments = files.map(file => ({
      reference_type: 'vendor_bill',
      reference_id: vendorBill.id,
      file_name: file.name || 'vendor_bill_attachment',
      file_path: file.path || `/uploads/vendor_bills/${vendorBill.id}/${file.name}`,
      file_size: file.size || null,
      mime_type: file.type || null,
      uploaded_by: req.user.id
    }));

    const { error: attachmentError } = await supabaseAdmin
      .from('document_attachments')
      .insert(attachments);

    if (attachmentError) {
      console.error('Failed to create document attachments:', attachmentError);
      // Don't fail the bill creation, just log the error
    }
  }

  res.status(201).json({
    success: true,
    message: 'Vendor bill created successfully',
    data: { vendorBill }
  });
}));

// Get vendor bill by ID
router.get('/:id', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: vendorBill, error } = await supabaseAdmin
    .from('vendor_bills')
    .select(`
      *,
      vendors(name, email, phone, gst_number, contact_person),
      purchase_orders(po_number, status)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({
      error: 'Vendor bill not found',
      code: 'BILL_NOT_FOUND',
      details: error.message
    });
  }

  // Get document attachments for this bill
  const { data: attachments, error: attachmentError } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('reference_type', 'vendor_bill')
    .eq('reference_id', id)
    .order('created_at', { ascending: false });

  if (attachmentError) {
    console.error('Failed to fetch attachments:', attachmentError);
    // Don't fail the request, just continue without attachments
  }

  res.json({
    success: true,
    data: {
      vendorBill: {
        ...vendorBill,
        attachments: attachments || []
      }
    }
  });
}));

// Update vendor bill status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'approved', 'paid', 'overdue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      code: 'INVALID_STATUS',
      valid_statuses: validStatuses
    });
  }

  const { data: vendorBill, error } = await supabaseAdmin
    .from('vendor_bills')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update vendor bill status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Vendor bill status updated successfully',
    data: { vendorBill }
  });
}));

module.exports = router;
