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

// Create vendor bill from purchase order
router.post('/create-from-po', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { purchase_order_id, bill_number, bill_date, due_date, received_items, notes } = req.body;

  if (!purchase_order_id || !bill_number || !bill_date) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'VALIDATION_ERROR',
      required_fields: ['purchase_order_id', 'bill_number', 'bill_date']
    });
  }

  // Get the purchase order with items
  const { data: purchaseOrder, error: poError } = await supabaseAdmin
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
      error: 'Purchase order not found',
      code: 'PURCHASE_ORDER_NOT_FOUND'
    });
  }

  // Check if bill already exists for this PO
  const { data: existingBill } = await supabaseAdmin
    .from('vendor_bills')
    .select('id, bill_number')
    .eq('purchase_order_id', purchase_order_id)
    .single();

  if (existingBill) {
    return res.status(400).json({
      error: 'Vendor bill already exists for this purchase order',
      code: 'BILL_ALREADY_EXISTS',
      existing_bill: existingBill.bill_number
    });
  }

  // Calculate amounts based on received items or full PO
  let billSubtotal = 0;
  let billTaxAmount = 0;
  let billDiscountAmount = 0;

  if (received_items && received_items.length > 0) {
    // Calculate based on received items
    received_items.forEach(item => {
      const lineTotal = item.received_quantity * item.unit_price;
      const discount = lineTotal * (item.discount_percent || 0) / 100;
      const taxableAmount = lineTotal - discount;
      const tax = taxableAmount * (item.tax_percent || 0) / 100;
      
      billSubtotal += lineTotal;
      billDiscountAmount += discount;
      billTaxAmount += tax;
    });
  } else {
    // Use full PO amounts
    billSubtotal = purchaseOrder.subtotal;
    billTaxAmount = purchaseOrder.tax_amount;
    billDiscountAmount = purchaseOrder.discount_amount;
  }

  const billTotalAmount = billSubtotal - billDiscountAmount + billTaxAmount;

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
    subtotal: billSubtotal,
    tax_amount: billTaxAmount,
    total_amount: billTotalAmount,
    paid_amount: 0,
    created_by: req.user.id
  };

  const { data: vendorBill, error: billError } = await supabaseAdmin
    .from('vendor_bills')
    .insert(billData)
    .select(`
      *,
      vendors(name, email),
      purchase_orders(po_number)
    `)
    .single();

  if (billError) {
    return res.status(400).json({
      error: 'Failed to create vendor bill',
      code: 'CREATION_FAILED',
      details: billError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Vendor bill created from purchase order successfully',
    data: { 
      vendorBill,
      source_po: purchaseOrder.po_number
    }
  });
}));

// Create manual expense bill (no PO required)
router.post('/create-expense', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
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
      error: 'Missing required fields',
      code: 'VALIDATION_ERROR',
      required_fields: ['bill_number', 'vendor_id', 'bill_date', 'total_amount', 'expense_category']
    });
  }

  // Validate vendor exists
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('id, name, status')
    .eq('id', vendor_id)
    .single();

  if (vendorError || !vendor) {
    return res.status(404).json({
      error: 'Vendor not found',
      code: 'VENDOR_NOT_FOUND'
    });
  }

  if (vendor.status !== 'active') {
    return res.status(400).json({
      error: 'Cannot create bills for inactive vendors',
      code: 'VENDOR_INACTIVE'
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
    purchase_order_id: null, // No PO for expense bills
    bill_date,
    due_date: dueDateFinal,
    status: 'pending',
    subtotal: subtotal || total_amount,
    tax_amount,
    total_amount,
    paid_amount: 0,
    created_by: req.user.id
  };

  const { data: vendorBill, error: billError } = await supabaseAdmin
    .from('vendor_bills')
    .insert(billData)
    .select(`
      *,
      vendors(name, email)
    `)
    .single();

  if (billError) {
    return res.status(400).json({
      error: 'Failed to create expense bill',
      code: 'CREATION_FAILED',
      details: billError.message
    });
  }

  // Create expense record in document attachments for categorization
  const expenseDoc = {
    reference_type: 'vendor_bill',
    reference_id: vendorBill.id,
    document_type: 'expense_record',
    file_name: `${expense_category}_expense_${bill_number}`,
    file_path: `/virtual/expenses/${vendorBill.id}`,
    uploaded_by: req.user.id,
    notes: `Expense Category: ${expense_category}\nDescription: ${description || 'N/A'}\nNotes: ${notes || 'N/A'}`
  };

  await supabaseAdmin
    .from('document_attachments')
    .insert(expenseDoc);

  res.status(201).json({
    success: true,
    message: 'Expense bill created successfully',
    data: { 
      vendorBill,
      expense_category
    }
  });
}));

// Get pending purchase orders for bill creation
router.get('/pending-pos', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { vendor_id } = req.query;

  let query = supabaseAdmin
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
    return res.status(400).json({
      error: 'Failed to fetch purchase orders',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  // Filter out POs that already have bills
  const { data: existingBills } = await supabaseAdmin
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
}));

// Update vendor bill payment
router.patch('/:id/payment', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paid_amount, payment_date, payment_method, payment_reference } = req.body;

  if (!paid_amount || paid_amount <= 0) {
    return res.status(400).json({
      error: 'Invalid payment amount',
      code: 'INVALID_PAYMENT_AMOUNT'
    });
  }

  // Get current bill
  const { data: currentBill, error: fetchError } = await supabaseAdmin
    .from('vendor_bills')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentBill) {
    return res.status(404).json({
      error: 'Vendor bill not found',
      code: 'BILL_NOT_FOUND'
    });
  }

  const newPaidAmount = (currentBill.paid_amount || 0) + paid_amount;
  const newStatus = newPaidAmount >= currentBill.total_amount ? 'paid' : 'approved';

  const updateData = {
    paid_amount: newPaidAmount,
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  const { data: vendorBill, error } = await supabaseAdmin
    .from('vendor_bills')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      vendors(name, email)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update payment',
      code: 'PAYMENT_UPDATE_FAILED',
      details: error.message
    });
  }

  // Create payment record in document attachments
  const paymentDoc = {
    reference_type: 'vendor_bill',
    reference_id: id,
    document_type: 'payment_record',
    file_name: `payment_${payment_reference || Date.now()}`,
    file_path: `/virtual/payments/${id}`,
    uploaded_by: req.user.id,
    notes: `Payment Amount: ${paid_amount}\nPayment Date: ${payment_date || new Date().toISOString().split('T')[0]}\nPayment Method: ${payment_method || 'N/A'}\nReference: ${payment_reference || 'N/A'}`
  };

  await supabaseAdmin
    .from('document_attachments')
    .insert(paymentDoc);

  res.json({
    success: true,
    message: `Payment of ${paid_amount} recorded successfully`,
    data: { 
      vendorBill,
      payment_amount: paid_amount,
      remaining_amount: vendorBill.total_amount - vendorBill.paid_amount
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
