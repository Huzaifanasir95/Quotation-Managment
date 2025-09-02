const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all business entities
router.get('/', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const { data: entities, error } = await supabaseAdmin
    .from('business_entities')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch business entities',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: entities
  });
}));

// Get business entity by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: entity, error } = await supabaseAdmin
    .from('business_entities')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !entity) {
    return res.status(404).json({
      error: 'Business entity not found',
      code: 'ENTITY_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: entity
  });
}));

// Create business entity
router.post('/', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const {
    name,
    legal_name,
    gst_number,
    tax_id,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email,
    logo_url
  } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'Entity name is required',
      code: 'MISSING_NAME'
    });
  }

  const entityData = {
    name,
    legal_name,
    gst_number,
    tax_id,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email,
    logo_url,
    is_active: true
  };

  const { data: entity, error } = await supabaseAdmin
    .from('business_entities')
    .insert(entityData)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create business entity',
      code: 'CREATE_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Business entity created successfully',
    data: entity
  });
}));

// Update business entity
router.put('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    legal_name,
    gst_number,
    tax_id,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email,
    logo_url,
    is_active
  } = req.body;

  const entityData = {
    name,
    legal_name,
    gst_number,
    tax_id,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email,
    logo_url,
    is_active,
    updated_at: new Date().toISOString()
  };

  const { data: entity, error } = await supabaseAdmin
    .from('business_entities')
    .update(entityData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update business entity',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Business entity updated successfully',
    data: entity
  });
}));

// Deactivate business entity
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: entity, error } = await supabaseAdmin
    .from('business_entities')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to deactivate business entity',
      code: 'DEACTIVATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Business entity deactivated successfully',
    data: entity
  });
}));

module.exports = router;
