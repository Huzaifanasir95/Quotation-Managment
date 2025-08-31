const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all product categories
router.get('/', authenticateToken, authorize(['admin', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, parent_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('product_categories')
    .select(`
      *,
      parent:product_categories!parent_id(name),
      children:product_categories!parent_id(id, name)
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (parent_id) {
    query = query.eq('parent_id', parent_id);
  }

  const { data: categories, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch product categories',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get category by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: category, error } = await supabaseAdmin
    .from('product_categories')
    .select(`
      *,
      parent:product_categories!parent_id(name),
      children:product_categories!parent_id(id, name)
    `)
    .eq('id', id)
    .single();

  if (error || !category) {
    return res.status(404).json({
      error: 'Product category not found',
      code: 'CATEGORY_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { category }
  });
}));

// Create new product category
router.post('/', authenticateToken, authorize(['admin', 'procurement']), asyncHandler(async (req, res) => {
  const categoryData = {
    name: req.body.name,
    description: req.body.description || null,
    parent_id: req.body.parent_id || null,
    is_active: req.body.is_active !== undefined ? req.body.is_active : true
  };

  const { data: category, error } = await supabaseAdmin
    .from('product_categories')
    .insert(categoryData)
    .select(`
      *,
      parent:product_categories!parent_id(name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create product category',
      code: 'CREATION_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Product category created successfully',
    data: { category }
  });
}));

// Update product category
router.put('/:id', authenticateToken, authorize(['admin', 'procurement']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    name: req.body.name,
    description: req.body.description,
    parent_id: req.body.parent_id,
    is_active: req.body.is_active
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const { data: category, error } = await supabaseAdmin
    .from('product_categories')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      parent:product_categories!parent_id(name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update product category',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Product category updated successfully',
    data: { category }
  });
}));

// Delete product category
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category has products
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('category_id', id)
    .limit(1);

  if (productsError) {
    return res.status(400).json({
      error: 'Failed to check category usage',
      code: 'CHECK_FAILED',
      details: productsError.message
    });
  }

  if (products && products.length > 0) {
    return res.status(400).json({
      error: 'Cannot delete category with associated products',
      code: 'CATEGORY_IN_USE'
    });
  }

  // Check if category has subcategories
  const { data: subcategories, error: subcategoriesError } = await supabaseAdmin
    .from('product_categories')
    .select('id')
    .eq('parent_id', id)
    .limit(1);

  if (subcategoriesError) {
    return res.status(400).json({
      error: 'Failed to check subcategories',
      code: 'CHECK_FAILED',
      details: subcategoriesError.message
    });
  }

  if (subcategories && subcategories.length > 0) {
    return res.status(400).json({
      error: 'Cannot delete category with subcategories',
      code: 'CATEGORY_HAS_CHILDREN'
    });
  }

  const { error } = await supabaseAdmin
    .from('product_categories')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(400).json({
      error: 'Failed to delete product category',
      code: 'DELETE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Product category deleted successfully'
  });
}));

// Get category tree (hierarchical structure)
router.get('/tree/all', authenticateToken, authorize(['admin', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { data: categories, error } = await supabaseAdmin
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch category tree',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  // Build hierarchical tree structure
  const buildTree = (categories, parentId = null) => {
    return categories
      .filter(cat => cat.parent_id === parentId)
      .map(cat => ({
        ...cat,
        children: buildTree(categories, cat.id)
      }));
  };

  const categoryTree = buildTree(categories);

  res.json({
    success: true,
    data: { categories: categoryTree }
  });
}));

module.exports = router;
