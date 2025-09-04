const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const config = require('../config');

const router = express.Router();

// Register new user
router.post('/register', validate(schemas.userRegistration), asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;

  // Check if user already exists
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(400).json({
      error: 'User already exists',
      code: 'USER_EXISTS'
    });
  }

  // Hash password - Reduced salt rounds for better performance
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
      role
    })
    .select('id, email, first_name, last_name, role, is_active, created_at')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to create user',
      code: 'USER_CREATION_FAILED',
      details: error.message
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
}));

// Login user - Optimized for performance
router.post('/login', validate(schemas.userLogin), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const startTime = Date.now();
  console.log(`🔑 Login attempt for: ${email}`);

  // Get user by email with minimal fields first
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error || !user) {
    console.log(`❌ User not found or inactive: ${email} (${Date.now() - startTime}ms)`);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  console.log(`📋 User found: ${email} (${Date.now() - startTime}ms)`);

  // Verify password
  const passwordStartTime = Date.now();
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  console.log(`🔐 Password verification took: ${Date.now() - passwordStartTime}ms`);
  
  if (!isValidPassword) {
    console.log(`❌ Invalid password for: ${email} (${Date.now() - startTime}ms)`);
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Update last login asynchronously (don't wait for it)
  supabaseAdmin
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id)
    .then(() => console.log(`📝 Last login updated for: ${email}`))
    .catch(err => console.error(`❌ Failed to update last login:`, err));

  // Generate JWT token
  const tokenStartTime = Date.now();
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  console.log(`🎫 Token generation took: ${Date.now() - tokenStartTime}ms`);

  // Remove password hash from response
  const { password_hash, ...userResponse } = user;

  console.log(`✅ Login successful for: ${email} (Total: ${Date.now() - startTime}ms)`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userResponse,
      token
    }
  });
}));

// Get current user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { password_hash, ...userProfile } = req.user;
  
  res.json({
    success: true,
    data: {
      user: userProfile
    }
  });
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const { first_name, last_name } = req.body;
  const userId = req.user.id;

  const updateData = {};
  if (first_name) updateData.first_name = first_name;
  if (last_name) updateData.last_name = last_name;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      error: 'No valid fields to update',
      code: 'NO_UPDATE_DATA'
    });
  }

  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, first_name, last_name, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update profile',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

// Change password
router.put('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!current_password || !new_password) {
    return res.status(400).json({
      error: 'Current password and new password are required',
      code: 'MISSING_PASSWORDS'
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long',
      code: 'WEAK_PASSWORD'
    });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(current_password, req.user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Current password is incorrect',
      code: 'INVALID_CURRENT_PASSWORD'
    });
  }

  // Hash new password - Reduced salt rounds for better performance
  const saltRounds = 10;
  const new_password_hash = await bcrypt.hash(new_password, saltRounds);

  // Update password
  const { error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: new_password_hash })
    .eq('id', userId);

  if (error) {
    return res.status(400).json({
      error: 'Failed to update password',
      code: 'PASSWORD_UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a JWT-based system, logout is typically handled client-side
  // by removing the token. We can log the logout event here.
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  // Generate new JWT token
  const token = jwt.sign(
    { userId: req.user.id, email: req.user.email, role: req.user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token
    }
  });
}));

module.exports = router;
