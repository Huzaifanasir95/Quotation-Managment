const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: customers, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch customers',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get customer by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return res.status(404).json({
      error: 'Customer not found',
      code: 'CUSTOMER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { customer }
  });
}));

// Create new customer
router.post('/', authenticateToken, authorize(['admin', 'sales']), validate(schemas.customer), asyncHandler(async (req, res) => {
  const customerData = {
    ...req.body,
    created_by: req.user.id
  };

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert(customerData)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create customer',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: { customer }
  });
}));

// Update customer
router.put('/:id', authenticateToken, authorize(['admin', 'sales']), validate(schemas.customer), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update customer',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Customer updated successfully',
    data: { customer }
  });
}));

// Delete customer
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({
      error: 'Failed to delete customer',
      code: 'DELETE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Customer deleted successfully'
  });
}));

module.exports = router;
