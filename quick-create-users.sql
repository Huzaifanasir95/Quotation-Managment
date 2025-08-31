-- QMS Role-Based Users Creation
-- Copy and paste these commands into Supabase SQL Editor

-- Admin User (email: admin@qms.com, password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('admin@qms.com', '$2a$10$KAWkiAeTGSaRWGR6YNCm5u6yAoo6jyT6HHenD4c3tcQ72VAzJq2Fi', 'System', 'Administrator', 'admin', true);

-- Sales User (email: sales@qms.com, password: sales123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('sales@qms.com', '$2a$10$1JqB6U.Z0a8oxMILcmc3Ru3AzZsp85wmgFNE581.ocRGF.JLUjFS.', 'Sales', 'Manager', 'sales', true);

-- Procurement User (email: procurement@qms.com, password: procurement123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('procurement@qms.com', '$2a$10$b3qo1QkwJ5MLd1RhJnaQeu12WbyBFMNnSIjKkUdeZpacXtu1k9a8C', 'Procurement', 'Manager', 'procurement', true);

-- Finance User (email: finance@qms.com, password: finance123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('finance@qms.com', '$2a$10$Y./0vH8.HkahO5N9IZc8fuBTZ14MFI3unlqeq2PlI6hkwkOS0lBe6', 'Finance', 'Manager', 'finance', true);

-- Auditor User (email: auditor@qms.com, password: auditor123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('auditor@qms.com', '$2a$10$evEiAfl2NzDxhzYodg7qj.7oBzQ2mQkzIiX4AP3SyLoraR4BM9kdS', 'System', 'Auditor', 'auditor', true);

-- Verify users created successfully
SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY role;
