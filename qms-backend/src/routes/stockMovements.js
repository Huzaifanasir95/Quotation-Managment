const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all stock movements
router.get('/', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, product_id, movement_type, date_from, date_to } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('stock_movements')
    .select(`
      *,
      products(name, sku),
      business_entities(name)
    `, { count: 'exact' })
    .order('movement_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (product_id) {
    query = query.eq('product_id', product_id);
  }

  if (movement_type) {
    query = query.eq('movement_type', movement_type);
  }

  if (date_from) {
    query = query.gte('movement_date', date_from);
  }

  if (date_to) {
    query = query.lte('movement_date', date_to);
  }

  const { data: stockMovements, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch stock movements',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      stockMovements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Create stock movement (adjustment)
router.post('/', authenticateToken, authorize(['admin', 'procurement']), validate(schemas.stockMovement), asyncHandler(async (req, res) => {
  const stockMovementData = {
    ...req.body,
    created_by: req.user.id
  };

  // Get current stock level
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('current_stock')
    .eq('id', req.body.product_id)
    .single();

  if (productError || !product) {
    return res.status(404).json({
      error: 'Product not found',
      code: 'PRODUCT_NOT_FOUND'
    });
  }

  const currentStock = product.current_stock || 0;
  let newStock = currentStock;

  // Calculate new stock based on movement type
  switch (req.body.movement_type) {
    case 'in':
    case 'purchase':
    case 'adjustment_in':
      newStock = currentStock + req.body.quantity;
      break;
    case 'out':
    case 'sale':
    case 'adjustment_out':
      newStock = currentStock - req.body.quantity;
      break;
    case 'transfer_in':
      newStock = currentStock + req.body.quantity;
      break;
    case 'transfer_out':
      newStock = currentStock - req.body.quantity;
      break;
  }

  // Prevent negative stock for outbound movements
  if (newStock < 0 && ['out', 'sale', 'adjustment_out', 'transfer_out'].includes(req.body.movement_type)) {
    return res.status(400).json({
      error: 'Insufficient stock',
      code: 'INSUFFICIENT_STOCK',
      current_stock: currentStock,
      requested_quantity: req.body.quantity
    });
  }

  // Create stock movement
  const { data: stockMovement, error: movementError } = await supabaseAdmin
    .from('stock_movements')
    .insert(stockMovementData)
    .select('*')
    .single();

  if (movementError) {
    return res.status(400).json({
      error: 'Failed to create stock movement',
      code: 'CREATION_FAILED',
      details: movementError.message
    });
  }

  // Update product stock
  const { error: updateError } = await supabaseAdmin
    .from('products')
    .update({ current_stock: newStock })
    .eq('id', req.body.product_id);

  if (updateError) {
    // Rollback stock movement
    await supabaseAdmin.from('stock_movements').delete().eq('id', stockMovement.id);
    return res.status(400).json({
      error: 'Failed to update product stock',
      code: 'STOCK_UPDATE_FAILED',
      details: updateError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Stock movement created successfully',
    data: { 
      stockMovement,
      new_stock_level: newStock
    }
  });
}));

// Get stock history for a product
router.get('/product/:productId/history', authenticateToken, authorize(['admin', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const { data: stockHistory, error, count } = await supabaseAdmin
    .from('stock_movements')
    .select(`
      *,
      products(name, sku)
    `, { count: 'exact' })
    .eq('product_id', productId)
    .order('movement_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch stock history',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      stockHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get low stock alerts
router.get('/alerts/low-stock', authenticateToken, authorize(['admin', 'procurement']), asyncHandler(async (req, res) => {
  const { data: lowStockProducts, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .lt('current_stock', supabaseAdmin.raw('minimum_stock_level'))
    .eq('is_active', true)
    .order('current_stock', { ascending: true });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch low stock alerts',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: { lowStockProducts }
  });
}));

module.exports = router;
