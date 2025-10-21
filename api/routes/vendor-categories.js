const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all vendor categories with statistics
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = supabase
      .from('vendor_categories')
      .select(`
        *,
        vendor:vendors(*),
        category:product_categories(*)
      `);
    
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    
    const { data: vendorCategories, error } = await query;
    
    if (error) {
      console.error('Error fetching vendor categories:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch vendor categories',
        error: error.message
      });
    }

    // Get statistics for each category
    const { data: categoryStats, error: statsError } = await supabase
      .from('product_categories')
      .select(`
        id,
        name,
        vendor_categories(count),
        rate_requests(
          id,
          status,
          rate_request_vendors(
            id,
            status
          )
        )
      `);

    if (statsError) {
      console.error('Error fetching category stats:', statsError);
    }

    // Calculate statistics
    const categoriesWithStats = categoryStats?.map(category => {
      const rateRequests = category.rate_requests || [];
      const totalRequests = rateRequests.length;
      const sentRequests = rateRequests.filter(req => req.status === 'sent').length;
      
      let pendingCount = 0;
      let respondedCount = 0;
      
      rateRequests.forEach(request => {
        const vendors = request.rate_request_vendors || [];
        pendingCount += vendors.filter(v => v.status === 'pending' || v.status === 'sent').length;
        respondedCount += vendors.filter(v => v.status === 'responded').length;
      });

      return {
        id: category.id,
        name: category.name,
        totalVendors: category.vendor_categories?.length || 0,
        requestsSent: sentRequests,
        pending: pendingCount,
        responded: respondedCount
      };
    }) || [];

    res.json({
      success: true,
      data: {
        vendorCategories,
        categoryStats: categoriesWithStats
      }
    });

  } catch (error) {
    console.error('Error in vendor categories endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get vendors for a specific category
router.get('/category/:categoryId/vendors', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { include_unassigned } = req.query;

    // Get assigned vendors
    const { data: assignedVendors, error: assignedError } = await supabase
      .from('vendor_categories')
      .select(`
        id,
        vendor:vendors(*),
        assigned_at,
        notes
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true);

    if (assignedError) {
      console.error('Error fetching assigned vendors:', assignedError);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch assigned vendors',
        error: assignedError.message
      });
    }

    let unassignedVendors = [];
    
    if (include_unassigned === 'true') {
      // Get all vendors not assigned to this category
      const assignedVendorIds = assignedVendors.map(vc => vc.vendor.id);
      
      let unassignedQuery = supabase
        .from('vendors')
        .select('*')
        .eq('status', 'active');
      
      if (assignedVendorIds.length > 0) {
        unassignedQuery = unassignedQuery.not('id', 'in', `(${assignedVendorIds.join(',')})`);
      }
      
      const { data: unassigned, error: unassignedError } = await unassignedQuery;
      
      if (unassignedError) {
        console.error('Error fetching unassigned vendors:', unassignedError);
      } else {
        unassignedVendors = unassigned || [];
      }
    }

    res.json({
      success: true,
      data: {
        assigned: assignedVendors,
        unassigned: unassignedVendors
      }
    });

  } catch (error) {
    console.error('Error in category vendors endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Assign vendors to category
router.post('/category/:categoryId/vendors', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { vendor_ids, notes } = req.body;
    const userId = req.user?.id; // Assuming auth middleware sets this

    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'vendor_ids is required and must be a non-empty array'
      });
    }

    // Create vendor category assignments
    const vendorCategoryData = vendor_ids.map(vendorId => ({
      vendor_id: vendorId,
      category_id: categoryId,
      assigned_by: userId,
      notes: notes || null
    }));

    const { data, error } = await supabase
      .from('vendor_categories')
      .insert(vendorCategoryData)
      .select(`
        *,
        vendor:vendors(*),
        category:product_categories(*)
      `);

    if (error) {
      console.error('Error assigning vendors to category:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to assign vendors to category',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Vendors assigned to category successfully',
      data
    });

  } catch (error) {
    console.error('Error in assign vendors endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Remove vendor from category
router.delete('/category/:categoryId/vendor/:vendorId', async (req, res) => {
  try {
    const { categoryId, vendorId } = req.params;

    const { error } = await supabase
      .from('vendor_categories')
      .delete()
      .eq('category_id', categoryId)
      .eq('vendor_id', vendorId);

    if (error) {
      console.error('Error removing vendor from category:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to remove vendor from category',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Vendor removed from category successfully'
    });

  } catch (error) {
    console.error('Error in remove vendor endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get rate requests for a category
router.get('/category/:categoryId/rate-requests', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { status } = req.query;

    let query = supabase
      .from('rate_requests')
      .select(`
        *,
        category:product_categories(*),
        quotation:quotations(*),
        quotation_item:quotation_items(*),
        created_by_user:users(first_name, last_name, email),
        rate_request_vendors(
          *,
          vendor:vendors(*)
        )
      `)
      .eq('category_id', categoryId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rate requests:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch rate requests',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in rate requests endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create rate request
router.post('/rate-requests', async (req, res) => {
  try {
    const {
      category_id,
      quotation_id,
      quotation_item_id,
      request_type = 'category',
      title,
      description,
      quantity,
      unit_of_measure,
      specifications,
      deadline,
      vendor_ids = []
    } = req.body;

    const userId = req.user?.id;

    if (!category_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'category_id and title are required'
      });
    }

    // Generate request number
    const timestamp = Date.now();
    const request_number = `RR-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`;

    // Get the actual admin user from database
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    // Use admin user ID if found, otherwise null (field is now nullable)
    const validUserId = adminUser?.id || null;

    // Create rate request
    const { data: rateRequest, error: requestError } = await supabase
      .from('rate_requests')
      .insert({
        request_number,
        category_id,
        quotation_id,
        quotation_item_id,
        request_type,
        title,
        description,
        quantity,
        unit_of_measure,
        specifications,
        deadline,
        created_by: validUserId
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating rate request:', requestError);
      return res.status(400).json({
        success: false,
        message: 'Failed to create rate request',
        error: requestError.message
      });
    }

    // If specific vendors provided, create vendor assignments
    if (vendor_ids.length > 0) {
      const vendorAssignments = vendor_ids.map(vendorId => ({
        rate_request_id: rateRequest.id,
        vendor_id: vendorId
      }));

      const { error: vendorError } = await supabase
        .from('rate_request_vendors')
        .insert(vendorAssignments);

      if (vendorError) {
        console.error('Error assigning vendors to rate request:', vendorError);
      }
    } else {
      // Auto-assign all vendors in the category
      const { data: categoryVendors, error: categoryError } = await supabase
        .from('vendor_categories')
        .select('vendor_id')
        .eq('category_id', category_id)
        .eq('is_active', true);

      if (!categoryError && categoryVendors.length > 0) {
        const vendorAssignments = categoryVendors.map(vc => ({
          rate_request_id: rateRequest.id,
          vendor_id: vc.vendor_id
        }));

        const { error: autoAssignError } = await supabase
          .from('rate_request_vendors')
          .insert(vendorAssignments);

        if (autoAssignError) {
          console.error('Error auto-assigning vendors:', autoAssignError);
        }
      }
    }

    // Fetch complete rate request with vendors
    const { data: completeRequest, error: fetchError } = await supabase
      .from('rate_requests')
      .select(`
        *,
        category:product_categories(*),
        rate_request_vendors(
          *,
          vendor:vendors(*)
        )
      `)
      .eq('id', rateRequest.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete rate request:', fetchError);
    }

    res.status(201).json({
      success: true,
      message: 'Rate request created successfully',
      data: completeRequest || rateRequest
    });

  } catch (error) {
    console.error('Error in create rate request endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update rate request status
router.patch('/rate-requests/:requestId/status', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    const updateData = { status, updated_at: new Date().toISOString() };
    
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('rate_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating rate request status:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update rate request status',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Rate request status updated successfully',
      data
    });

  } catch (error) {
    console.error('Error in update rate request status endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all product categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in categories endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;