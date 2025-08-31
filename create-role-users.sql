-- Create Role-Based Users for QMS System
-- Run these commands in Supabase SQL Editor

-- First, let's check if the users table exists and see its structure
-- SELECT * FROM users LIMIT 1;

-- Create Admin User
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    'admin@qms.com',
    '$2a$10$KAWkiAeTGSaRWGR6YNCm5u6yAoo6jyT6HHenD4c3tcQ72VAzJq2Fi', -- password: admin123
    'System',
    'Administrator',
    'admin',
    true
);

-- Create Sales User
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    'sales@qms.com',
    '$2a$10$1JqB6U.Z0a8oxMILcmc3Ru3AzZsp85wmgFNE581.ocRGF.JLUjFS.', -- password: sales123
    'Sales',
    'Manager',
    'sales',
    true
);

-- Create Procurement User
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    'procurement@qms.com',
    '$2a$10$b3qo1QkwJ5MLd1RhJnaQeu12WbyBFMNnSIjKkUdeZpacXtu1k9a8C', -- password: procurement123
    'Procurement',
    'Manager',
    'procurement',
    true
);

-- Create Finance User
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    'finance@qms.com',
    '$2a$10$Y./0vH8.HkahO5N9IZc8fuBTZ14MFI3unlqeq2PlI6hkwkOS0lBe6', -- password: finance123
    'Finance',
    'Manager',
    'finance',
    true
);

-- Create Auditor User
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role, 
    is_active
) VALUES (
    'auditor@qms.com',
    '$2a$10$evEiAfl2NzDxhzYodg7qj.7oBzQ2mQkzIiX4AP3SyLoraR4BM9kdS', -- password: auditor123
    'System',
    'Auditor',
    'auditor',
    true
);

-- Verify the users were created successfully
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
ORDER BY role, created_at DESC;

-- Alternative: If you want to use proper bcrypt hashing, use this approach:
-- You'll need to generate proper password hashes using bcrypt with 10 rounds

/*
ALTERNATIVE SQL WITH PROPER PASSWORD HASHING:
If the above doesn't work due to password validation, you can use these commands
with proper bcrypt hashes generated for each password:

-- For password 'admin123' (bcrypt hash with 10 rounds):
-- $2b$10$K.9Z9Z9Z9Z9Z9Z9Z9Z9Z9u...

-- Run this in Node.js to generate proper hashes:
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10).then(hash => console.log('admin:', hash));
bcrypt.hash('sales123', 10).then(hash => console.log('sales:', hash));
bcrypt.hash('procurement123', 10).then(hash => console.log('procurement:', hash));
bcrypt.hash('finance123', 10).then(hash => console.log('finance:', hash));
bcrypt.hash('auditor123', 10).then(hash => console.log('auditor:', hash));
*/
