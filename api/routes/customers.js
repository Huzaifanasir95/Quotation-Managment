const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client (same as main index.js)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
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
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: customer, error } = await supabase
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
  } catch (error) {
    console.error('Customer fetch error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      created_at: new Date().toISOString()
    };

    const { data: customer, error } = await supabase
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
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    console.log(`📝 Updating customer ${id} with data:`, updateData);

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Customer update error:', error);
      return res.status(400).json({
        error: 'Failed to update customer',
        code: 'UPDATE_FAILED',
        details: error.message
      });
    }

    console.log(`✅ Customer updated successfully: ${id}`);

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('💥 Customer update error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
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
  } catch (error) {
    console.error('Customer deletion error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;