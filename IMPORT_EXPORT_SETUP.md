# Import/Export Page Database Setup

## Issue
The Import/Export page shows "Database setup required" error because the `document_attachments` table doesn't exist in your Supabase database.

## Solution

### Step 1: Access Supabase Dashboard
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your account
3. Select your QMS project

### Step 2: Run the Setup Script
1. In your Supabase dashboard, click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the contents of `setup-document-attachments.sql` from your project root
4. Paste it into the SQL editor
5. Click **Run** to execute the script

### Step 3: Verify
1. Go back to your QMS application
2. Navigate to the Import/Export page
3. Refresh the page - it should now work properly

## What the Script Does
- Creates the `document_attachments` table with all required columns
- Adds proper constraints and indexes
- Inserts sample data for testing (optional)
- Sets up proper permissions

## Alternative: Manual Table Creation
If you prefer to create the table manually, you can use the table structure defined in `database-schema.sql`.

## Troubleshooting
- **Permission denied**: Make sure your Supabase service role key has proper permissions
- **Foreign key errors**: Ensure that `users`, `customers`, `vendors`, and `business_entities` tables exist first
- **Still getting errors**: Check the browser console for detailed error messages

## Need Help?
If you continue to have issues, check the browser console (F12) for detailed error messages or contact your system administrator.