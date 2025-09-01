const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, authorize(['admin', 'sales', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, category, type, status } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('products')
    .select(`
      *,
      product_categories(name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category) {
    query = query.eq('category_id', category);
  }

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data: products, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch products',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get product by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      product_categories(name)
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    return res.status(404).json({
      error: 'Product not found',
      code: 'PRODUCT_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { product }
  });
}));

// Create new product
router.post('/', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.product), asyncHandler(async (req, res) => {
  const productData = {
    ...req.body,
    created_by: req.user.id
  };

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert(productData)
    .select(`
      *,
      product_categories(name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create product',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
}));

// Update product
router.put('/:id', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.product), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      product_categories(name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update product',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: { product }
  });
}));

// Delete product
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({
      error: 'Failed to delete product',
      code: 'DELETE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

// Get low stock products
router.get('/alerts/low-stock', authenticateToken, authorize(['admin', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .filter('current_stock', 'lte', 'reorder_point')
    .eq('status', 'active')
    .order('current_stock', { ascending: true });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch low stock products',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: { products }
  });
}));

module.exports = router;
