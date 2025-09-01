const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all quotations
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, customer_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers(name, email),
      business_entities(name),
      quotation_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`quotation_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  const { data: quotations, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch quotations',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      quotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get quotation by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: quotation, error } = await supabaseAdmin
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
    return res.status(404).json({
      error: 'Quotation not found',
      code: 'QUOTATION_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { quotation }
  });
}));

// Create new quotation
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
    quotation_number,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    created_by: req.user.id
  };

  // Create quotation
  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('quotations')
    .insert(finalQuotationData)
    .select('*')
    .single();

  if (quotationError) {
    return res.status(400).json({
      error: 'Failed to create quotation',
      code: 'CREATION_FAILED',
      details: quotationError.message
    });
  }

  // Create quotation items
  const quotationItems = processedItems.map(item => ({
    ...item,
    quotation_id: quotation.id
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('quotation_items')
    .insert(quotationItems);

  if (itemsError) {
    // Rollback quotation creation
    await supabaseAdmin.from('quotations').delete().eq('id', quotation.id);
    return res.status(400).json({
      error: 'Failed to create quotation items',
      code: 'ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Quotation created successfully',
    data: { quotation }
  });
}));

// Update quotation status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'sales']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'];
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

  const { data: quotation, error } = await supabaseAdmin
    .from('quotations')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update quotation status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Quotation status updated successfully',
    data: { quotation }
  });
}));

// Delete quotation
router.delete('/:id', authenticateToken, authorize(['admin', 'sales']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('quotations')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({
      error: 'Failed to delete quotation',
      code: 'DELETE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Quotation deleted successfully'
  });
}));

module.exports = router;
