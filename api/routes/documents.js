const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client (same as main index.js)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for memory storage (for Supabase uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Skip validation if no file is provided
    if (!file) {
      return cb(null, true);
    }
    
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
    }
  }
});

// Custom middleware to handle optional file uploads
const handleOptionalUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // If it's a file type error and no file was actually uploaded, ignore it
      if (err.message.includes('Invalid file type') && !req.file) {
        return next();
      }
      return next(err);
    }
    next();
  });
};

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
router.post('/upload', handleOptionalUpload, async (req, res) => {
  try {
    console.log('📝 Document upload request received');
    console.log('📁 File:', req.file ? 'Present' : 'Not present');
    console.log('📋 Body:', req.body);

    const { 
      reference_type, 
      reference_id, 
      document_type,
      linked_reference_type,
      linked_reference_number,
      linked_reference_id,
      customer_id,
      vendor_id,
      business_entity_id,
      compliance_notes,
      document_date,
      expiry_date,
      issuing_authority,
      country_of_origin,
      notes,
      description 
    } = req.body;

    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    let mimeType = null;

    // Handle file upload to Supabase Storage if file is present
    if (req.file) {
      try {
        const fileExt = path.extname(req.file.originalname);
        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        const filePath = `attachments/${uniqueFileName}`;

        console.log('📤 Uploading file to Supabase Storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            duplex: 'half'
          });

        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          return res.status(400).json({
            success: false,
            error: 'Failed to upload file',
            code: 'UPLOAD_FAILED',
            details: uploadError.message
          });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = req.file.originalname;
        fileSize = req.file.size;
        mimeType = req.file.mimetype;

        console.log('✅ File uploaded successfully:', fileUrl);
      } catch (error) {
        console.error('❌ File upload error:', error);
        return res.status(500).json({
          success: false,
          error: 'File upload failed',
          code: 'UPLOAD_ERROR',
          details: error.message
        });
      }
    }

    const documentData = {
      reference_type: reference_type || 'quotation',
      reference_id: reference_id,
      file_name: fileName,
      file_path: fileUrl,
      file_size: fileSize,
      mime_type: mimeType,
      document_type: document_type || 'quotation_attachment',
      linked_reference_type: linked_reference_type || null,
      linked_reference_number: linked_reference_number || null,
      linked_reference_id: linked_reference_id || null,
      customer_id: customer_id || null,
      vendor_id: vendor_id || null,
      business_entity_id: business_entity_id || null,
      compliance_status: 'pending',
      compliance_notes: compliance_notes || null,
      ocr_status: req.file ? 'pending' : 'not_applicable',
      document_date: document_date || null,
      expiry_date: expiry_date || null,
      issuing_authority: issuing_authority || null,
      country_of_origin: country_of_origin || null,
      notes: notes || description || null,
      uploaded_by: null // Set to null instead of 'admin' since it's a UUID field
    };

    console.log('💾 Inserting document data:', documentData);
    
    const { data: document, error } = await supabase
      .from('document_attachments')
      .insert(documentData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insertion error:', error);
      return res.status(400).json({
        success: false,
        error: 'Database insertion failed',
        code: 'DB_ERROR',
        details: error.message
      });
    }

    console.log('✅ Document record created:', document.id);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    console.error('💥 Document upload error:', error);
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