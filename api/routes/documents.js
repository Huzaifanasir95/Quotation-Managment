const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client (same as main index.js)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get documents for an entity (matching localhost pattern)
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    console.log(`📁 Getting documents for ${entityType}:${entityId}`);

    const { data: documents, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', entityType)
      .eq('reference_id', entityId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return res.json({
        success: true,
        data: []
      });
    }

    console.log(`✅ Found ${documents?.length || 0} documents for ${entityType}:${entityId}`);

    res.json({
      success: true,
      data: documents || []
    });
  } catch (error) {
    console.error('💥 Documents fetch error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Get quotation attachments (legacy endpoint for compatibility)
router.get('/quotation/attachments', async (req, res) => {
  try {
    const { quotation_id } = req.query;
    
    console.log('📎 Documents API: Getting quotation attachments for:', quotation_id);
    
    if (!quotation_id) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID is required'
      });
    }

    // Try to get attachments from document_attachments table
    const { data: attachments, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', 'quotation')
      .eq('reference_id', quotation_id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Quotation attachments error:', error);
      // Return empty array instead of error for missing table
      return res.json({
        success: true,
        data: {
          attachments: []
        }
      });
    }

    console.log(`✅ Found ${attachments?.length || 0} attachments for quotation ${quotation_id}`);

    res.json({
      success: true,
      data: {
        attachments: attachments || []
      }
    });
  } catch (error) {
    console.error('💥 Quotation attachments error:', error);
    res.json({
      success: true,
      data: {
        attachments: []
      }
    });
  }
});

// Alternative endpoint pattern that frontend might be calling
router.get('/quotation/:quotationId', async (req, res) => {
  try {
    const { quotationId } = req.params;
    
    console.log(`📁 Getting quotation documents for: ${quotationId}`);

    const { data: documents, error } = await supabase
      .from('document_attachments')
      .select('*')
      .eq('reference_type', 'quotation')
      .eq('reference_id', quotationId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching quotation documents:', error);
      return res.json({
        success: true,
        data: []
      });
    }

    console.log(`✅ Found ${documents?.length || 0} documents for quotation ${quotationId}`);

    res.json({
      success: true,
      data: documents || []
    });
  } catch (error) {
    console.error('💥 Quotation documents fetch error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Document upload endpoint
router.post('/upload', async (req, res) => {
  try {
    console.log('Document upload endpoint called');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    // For now, return a mock success response
    // In a real implementation, you would handle file uploads to Supabase Storage
    const mockDocument = {
      id: 'mock-' + Date.now(),
      reference_type: req.body.reference_type || 'trade_document',
      reference_id: req.body.reference_id || null,
      file_name: req.body.file_name || 'uploaded_document.pdf',
      file_path: '/mock/path/to/document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      document_type: req.body.document_type || 'commercial_invoice',
      linked_reference_type: req.body.linked_reference_type || null,
      linked_reference_number: req.body.linked_reference_number || null,
      linked_reference_id: req.body.linked_reference_id || null,
      customer_id: req.body.customer_id || null,
      vendor_id: req.body.vendor_id || null,
      business_entity_id: req.body.business_entity_id || null,
      compliance_status: 'pending',
      compliance_notes: req.body.compliance_notes || null,
      ocr_status: 'pending',
      document_date: req.body.document_date || null,
      expiry_date: req.body.expiry_date || null,
      issuing_authority: req.body.issuing_authority || null,
      country_of_origin: req.body.country_of_origin || null,
      notes: req.body.notes || null,
      uploaded_by: 'admin',
      uploaded_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document: mockDocument }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Document download endpoint (mock implementation)
router.get('/download/:id', async (req, res) => {
  try {
    // For now, return a 404 since this is a mock implementation
    res.status(404).json({
      success: false,
      message: 'Document not found or download not implemented in demo mode'
    });
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;