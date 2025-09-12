const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration - Optimized for performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased timeout
  acquireTimeoutMillis: 60000,   // Added acquire timeout
  createTimeoutMillis: 30000,    // Added create timeout
  destroyTimeoutMillis: 5000,    // Added destroy timeout
  reapIntervalMillis: 1000,      // Added reap interval
  createRetryIntervalMillis: 200, // Added retry interval
});

// Test database connection
pool.on('connect', () => {
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  query,
  getClient,
  pool
};
