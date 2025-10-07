// Simple auth middleware for API routes
const authMiddleware = (req, res, next) => {
  // For now, we'll use a simple approach - in production you'd validate JWT tokens
  // Extract user info from headers or use a default user
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real implementation, you'd decode the JWT token here
    // For now, we'll use a default user ID
    req.user = {
      id: '00000000-0000-0000-0000-000000000001', // Default user ID
      email: 'admin@example.com',
      role: 'admin'
    };
  } else {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001', // Default user ID
      email: 'admin@example.com',
      role: 'admin'
    };
  }
  
  next();
};

module.exports = authMiddleware;