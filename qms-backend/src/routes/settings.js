const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch settings',
        error: error.message
      });
    }

    // If no settings exist, create default settings record
    if (!data) {
      const defaultSettings = {
        default_terms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in USD and exclude shipping.\n3. Products are subject to availability.\n4. Returns accepted within 14 days with original packaging.\n5. Late payments may incur additional charges.\n6. Delivery terms as per agreement.',
        quotation_terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.',
        invoice_terms: '1. Payment is due within 30 days of invoice date.\n2. Late payment charges: 2% per month.\n3. All disputes must be raised within 7 days of invoice date.\n4. Goods once sold cannot be returned without prior approval.',
        purchase_order_terms: '1. Delivery as per agreed schedule.\n2. Quality as per specifications.\n3. Payment terms as agreed.\n4. Penalties for delayed delivery may apply.',
        default_currency: 'USD',
        default_tax_rate: 18.0,
        quotation_number_format: 'Q-YYYY-###',
        invoice_number_format: 'INV-YYYY-###',
        email_notifications: true,
        sms_notifications: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create the default settings record
      const { data: newSettings, error: insertError } = await supabase
        .from('system_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default settings:', insertError);
        // Return default settings even if insert fails
        return res.json({
          success: true,
          data: defaultSettings
        });
      }

      return res.json({
        success: true,
        data: newSettings
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error in GET /settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const {
      default_terms,
      quotation_terms,
      invoice_terms,
      purchase_order_terms,
      default_currency,
      default_tax_rate,
      quotation_number_format,
      invoice_number_format,
      email_notifications,
      sms_notifications
    } = req.body;

    // Check if settings record exists
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    let result;
    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('system_settings')
        .update({
          default_terms,
          quotation_terms,
          invoice_terms,
          purchase_order_terms,
          default_currency,
          default_tax_rate,
          quotation_number_format,
          invoice_number_format,
          email_notifications,
          sms_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings record
      result = await supabase
        .from('system_settings')
        .insert({
          default_terms,
          quotation_terms,
          invoice_terms,
          purchase_order_terms,
          default_currency,
          default_tax_rate,
          quotation_number_format,
          invoice_number_format,
          email_notifications,
          sms_notifications,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating settings:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in PUT /settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get terms and conditions only
router.get('/terms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('default_terms, quotation_terms, invoice_terms, purchase_order_terms')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching terms:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch terms and conditions',
        error: error.message
      });
    }

    // Return default terms if none exist
    const defaultTerms = {
      default_terms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in USD and exclude shipping.\n3. Products are subject to availability.\n4. Returns accepted within 14 days with original packaging.\n5. Late payments may incur additional charges.\n6. Delivery terms as per agreement.',
      quotation_terms: '1. This quotation is valid for 30 days from the date of issue.\n2. Prices are subject to change without notice.\n3. Payment terms: 50% advance, 50% on delivery.\n4. Delivery time: 7-14 business days after order confirmation.',
      invoice_terms: '1. Payment is due within 30 days of invoice date.\n2. Late payment charges: 2% per month.\n3. All disputes must be raised within 7 days of invoice date.\n4. Goods once sold cannot be returned without prior approval.',
      purchase_order_terms: '1. Delivery as per agreed schedule.\n2. Quality as per specifications.\n3. Payment terms as agreed.\n4. Penalties for delayed delivery may apply.'
    };

    res.json({
      success: true,
      data: data || defaultTerms
    });
  } catch (error) {
    console.error('Error in GET /settings/terms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update terms and conditions only
router.put('/terms', async (req, res) => {
  try {
    const {
      default_terms,
      quotation_terms,
      invoice_terms,
      purchase_order_terms
    } = req.body;

    // Validate required fields
    if (!default_terms && !quotation_terms && !invoice_terms && !purchase_order_terms) {
      return res.status(400).json({
        success: false,
        message: 'At least one terms field is required'
      });
    }

    // Check if settings record exists
    const { data: existingSettings } = await supabase
      .from('system_settings')
      .select('id')
      .single();

    let result;
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (default_terms !== undefined) updateData.default_terms = default_terms;
    if (quotation_terms !== undefined) updateData.quotation_terms = quotation_terms;
    if (invoice_terms !== undefined) updateData.invoice_terms = invoice_terms;
    if (purchase_order_terms !== undefined) updateData.purchase_order_terms = purchase_order_terms;

    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('system_settings')
        .update(updateData)
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Create new settings record with default values for other fields
      result = await supabase
        .from('system_settings')
        .insert({
          ...updateData,
          default_currency: 'USD',
          default_tax_rate: 18.0,
          quotation_number_format: 'Q-YYYY-###',
          invoice_number_format: 'INV-YYYY-###',
          email_notifications: true,
          sms_notifications: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating terms:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update terms and conditions',
        error: result.error.message
      });
    }

    res.json({
      success: true,
      message: 'Terms and conditions updated successfully',
      data: {
        default_terms: result.data.default_terms,
        quotation_terms: result.data.quotation_terms,
        invoice_terms: result.data.invoice_terms,
        purchase_order_terms: result.data.purchase_order_terms
      }
    });
  } catch (error) {
    console.error('Error in PUT /settings/terms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
