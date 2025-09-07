const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard stats endpoint
router.get('/dashboard/stats', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // Get counts for various entities
    const [
      { count: customersCount },
      { count: vendorsCount },
      { count: productsCount },
      { count: quotationsCount },
      { count: purchaseOrdersCount },
      { count: invoicesCount }
    ] = await Promise.all([
      supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('vendors').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('quotations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('purchase_orders').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true })
    ]);

    // Get pending approvals
    const { data: pendingQuotations } = await supabaseAdmin
      .from('quotations')
      .select('*')
      .eq('status', 'sent')
      .limit(5);

    // Get low stock products - using a different approach since supabase doesn't support column comparison directly
    const { data: allProducts } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('status', 'active')
      .limit(100);

    // Filter low stock products in JavaScript
    const lowStockProducts = allProducts ? allProducts.filter(product => 
      product.current_stock < product.reorder_point
    ).slice(0, 5) : [];

    // Get recent activities (mock data for now)
    const recentActivities = [
      {
        id: 1,
        type: 'quotation_created',
        description: 'New quotation created',
        timestamp: new Date().toISOString(),
        user: req.user.email
      }
    ];

    res.json({
      success: true,
      data: {
        stats: {
          customers: customersCount || 0,
          vendors: vendorsCount || 0,
          products: productsCount || 0,
          quotations: quotationsCount || 0,
          purchaseOrders: purchaseOrdersCount || 0,
          invoices: invoicesCount || 0
        },
        pendingApprovals: pendingQuotations || [],
        lowStockAlerts: lowStockProducts || [],
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      code: 'STATS_FETCH_FAILED',
      details: error.message
    });
  }
}));

// System health check
router.get('/health', asyncHandler(async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

module.exports = router;
