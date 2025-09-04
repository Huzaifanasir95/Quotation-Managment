// Test script to check business entities API endpoint
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBusinessEntitiesAPI() {
  const API_BASE_URL = 'http://localhost:5000/api/v1';
  
  try {
    console.log('Testing business entities API endpoint...');
    console.log('URL:', `${API_BASE_URL}/business-entities`);
    
    // Test without authentication first
    const response = await fetch(`${API_BASE_URL}/business-entities`);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Network error:', error.message);
    console.log('Make sure your backend server is running on http://localhost:5000');
  }
}

// Test health endpoint first
async function testHealthEndpoint() {
  const API_BASE_URL = 'http://localhost:5000';
  
  try {
    console.log('Testing health endpoint...');
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Health check passed:', data);
      return true;
    } else {
      console.log('Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend server not responding:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Business Entities API Test ===\n');
  
  const healthOk = await testHealthEndpoint();
  console.log('\n' + '='.repeat(40) + '\n');
  
  if (healthOk) {
    await testBusinessEntitiesAPI();
  } else {
    console.log('Backend server is not running. Please start it with:');
    console.log('cd qms-backend && npm start');
  }
}

runTests();
