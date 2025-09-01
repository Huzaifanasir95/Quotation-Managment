const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all vendors
router.get('/', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('vendors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: vendors, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch vendors',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get vendor by ID
router.get('/:id', authenticateToken, authorize(['admin', 'procurement', 'finance', 'sales', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vendor) {
    return res.status(404).json({
      error: 'Vendor not found',
      code: 'VENDOR_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { vendor }
  });
}));

// Create new vendor
router.post('/', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.vendor), asyncHandler(async (req, res) => {
  const vendorData = {
    ...req.body,
    created_by: req.user.id
  };

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .insert(vendorData)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create vendor',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Vendor created successfully',
    data: { vendor }
  });
}));

// Update vendor
router.put('/:id', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.vendor), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update vendor',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Vendor updated successfully',
    data: { vendor }
  });
}));

// Delete vendor
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('vendors')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({
      error: 'Failed to delete vendor',
      code: 'DELETE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Vendor deleted successfully'
  });
}));

module.exports = router;
