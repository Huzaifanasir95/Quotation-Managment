const express = require('express');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all users with pagination and filtering
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search = '', role = '', status = '' } = req.query;
  const offset = (page - 1) * limit;

  console.log('🔍 Users API: Getting users with params:', { page, limit, search, role, status });

  let query = supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  // Apply search filter
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Apply role filter
  if (role && role !== 'all') {
    query = query.eq('role', role);
  }

  // Apply status filter
  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  const { data: users, error, count } = await query;

  if (error) {
    console.error('❌ Users fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }

  console.log(`✅ Successfully fetched ${users?.length || 0} users`);

  res.json({
    success: true,
    data: {
      users: users || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    }
  });
}));

// Get user by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log(`🔍 Users API: Getting user ${id}`);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ User fetch error:', error);
    return res.status(404).json({
      success: false,
      message: 'User not found',
      error: error.message
    });
  }

  console.log(`✅ Successfully fetched user ${id}`);

  res.json({
    success: true,
    data: { user }
  });
}));

// Create new user
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;

  console.log('🆕 Users API: Creating user:', { first_name, last_name, email, role });

  // Validate required fields
  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      required: ['first_name', 'last_name', 'email', 'password', 'role']
    });
  }

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists',
      code: 'USER_EXISTS'
    });
  }

  // Hash password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      is_active: true
    })
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('❌ User creation error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }

  console.log(`✅ Successfully created user ${user.id}`);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
}));

// Update user
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, role } = req.body;

  console.log(`🔄 Users API: Updating user ${id}:`, { first_name, last_name, email, role });

  // Build update object with only provided fields
  const updateData = {};
  if (first_name !== undefined) updateData.first_name = first_name;
  if (last_name !== undefined) updateData.last_name = last_name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  updateData.updated_at = new Date().toISOString();

  // Check if email is being changed and if it's already taken
  if (email) {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists for another user',
        code: 'EMAIL_EXISTS'
      });
    }
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('❌ User update error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }

  console.log(`✅ Successfully updated user ${id}`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
}));

// Toggle user status (activate/deactivate)
router.patch('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting boolean

  console.log(`🔄 Users API: Toggling status for user ${id} to:`, status);

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .update({ 
      is_active: status === true || status === 'true',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('❌ User status update error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }

  console.log(`✅ Successfully updated user ${id} status to ${user.is_active ? 'active' : 'inactive'}`);

  res.json({
    success: true,
    message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
    data: { user }
  });
}));

// Delete user (soft delete by deactivating)
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ Users API: Deleting user ${id}`);

  // Check if user exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('id', id)
    .single();

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // For safety, we'll deactivate instead of hard delete
  // In production, you might want to do a hard delete or keep audit trail
  const { error } = await supabaseAdmin
    .from('users')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('❌ User deletion error:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }

  console.log(`✅ Successfully deleted (deactivated) user ${id}`);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

module.exports = router;