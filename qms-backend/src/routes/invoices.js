const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, customer_id, fbr_sync_status } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(name, email),
      business_entities(name),
      invoice_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  if (fbr_sync_status) {
    query = query.eq('fbr_sync_status', fbr_sync_status);
  }

  const { data: invoices, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch invoices',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get invoice by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(*),
      business_entities(*),
      invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { invoice }
  });
}));

// Create new invoice
router.post('/', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { items, ...invoiceData } = req.body;

  // Generate invoice number
  const currentYear = new Date().getFullYear();
  const { data: lastInvoice } = await supabaseAdmin
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

  const finalInvoiceData = {
    ...invoiceData,
    invoice_number,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    created_by: req.user.id
  };

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert(finalInvoiceData)
    .select('*')
    .single();

  if (invoiceError) {
    return res.status(400).json({
      error: 'Failed to create invoice',
      code: 'CREATION_FAILED',
      details: invoiceError.message
    });
  }

  // Create invoice items
  const invoiceItems = processedItems.map(item => ({
    ...item,
    invoice_id: invoice.id
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) {
    // Rollback invoice creation
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
    return res.status(400).json({
      error: 'Failed to create invoice items',
      code: 'ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: { invoice }
  });
}));

// Update FBR sync status
router.patch('/:id/fbr-sync', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fbr_sync_status, fbr_reference } = req.body;

  const validStatuses = ['pending', 'synced', 'failed'];
  if (!validStatuses.includes(fbr_sync_status)) {
    return res.status(400).json({
      error: 'Invalid FBR sync status',
      code: 'INVALID_FBR_STATUS',
      valid_statuses: validStatuses
    });
  }

  const updateData = { 
    fbr_sync_status,
    fbr_sync_date: new Date().toISOString()
  };

  if (fbr_reference) {
    updateData.fbr_reference = fbr_reference;
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update FBR sync status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'FBR sync status updated successfully',
    data: { invoice }
  });
}));

module.exports = router;
