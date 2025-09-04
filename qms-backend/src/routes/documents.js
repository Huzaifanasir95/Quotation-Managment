const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Skip validation if no file is provided
    if (!file) {
      return cb(null, true);
    }
    
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
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

// Upload document
router.post('/upload', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance']), handleOptionalUpload, asyncHandler(async (req, res) => {
  // File upload is now optional - documents can be created without files
  console.log('📝 Document upload request received');
  console.log('📁 File:', req.file ? 'Present' : 'Not present');
  console.log('📋 Body:', req.body);

  const { 
    entity_type, 
    entity_id, 
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

  // Validate required fields for trade documents
  console.log('🔍 Validating fields...');
  console.log('document_type:', document_type);
  console.log('linked_reference_type:', linked_reference_type);
  console.log('linked_reference_number:', linked_reference_number);
  
  if (!document_type) {
    console.log('❌ Missing document_type');
    return res.status(400).json({
      error: 'Document type is required',
      code: 'MISSING_DOCUMENT_TYPE'
    });
  }

  if (!linked_reference_type || !linked_reference_number) {
    console.log('❌ Missing linked reference info');
    return res.status(400).json({
      error: 'Linked reference information is required',
      code: 'MISSING_LINKED_REFERENCE'
    });
  }
  
  console.log('✅ Validation passed, creating document data...');

  const documentData = {
    reference_type: entity_type || 'trade_document',
    reference_id: entity_id,
    file_name: req.file ? req.file.originalname : null,
    file_path: req.file ? req.file.path : null,
    file_size: req.file ? req.file.size : null,
    mime_type: req.file ? req.file.mimetype : null,
    document_type,
    linked_reference_type,
    linked_reference_number,
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
    uploaded_by: req.user.id
  };

  console.log('💾 Inserting document data:', documentData);
  
  const { data: document, error } = await supabaseAdmin
    .from('document_attachments')
    .insert(documentData)
    .select(`
      *,
      customers (id, name, email),
      vendors (id, name, email),
      business_entities (id, name, legal_name)
    `)
    .single();

  if (error) {
    console.log('❌ Database error:', error);
    // Clean up uploaded file on database error (only if file was uploaded)
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }

    return res.status(400).json({
      error: 'Failed to save document',
      code: 'SAVE_FAILED',
      details: error.message
    });
  }

  // Trigger OCR processing for supported file types (only if file was uploaded)
  const ocrSupportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (req.file && ocrSupportedTypes.includes(req.file.mimetype)) {
    // Update OCR status to processing
    await supabaseAdmin
      .from('document_attachments')
      .update({ ocr_status: 'processing' })
      .eq('id', document.id);

    // In a real implementation, you would queue this for background processing
    // For now, we'll just mark it as pending
  }

  res.status(201).json({
    success: true,
    message: 'Trade document uploaded successfully',
    data: { document }
  });
}));

// Get documents for an entity
router.get('/:entityType/:entityId', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const { data: documents, error } = await supabaseAdmin
    .from('document_attachments')
    .select(`
      *,
      customers (id, name, email, gst_number),
      vendors (id, name, email, gst_number),
      business_entities (id, name, legal_name, country),
      ocr_results (
        id,
        extracted_text,
        confidence_score,
        processing_status,
        processed_at,
        language
      )
    `)
    .eq('reference_type', entityType)
    .eq('reference_id', entityId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch documents',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: documents
  });
}));

// Get all trade documents with filters
router.get('/', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { 
    document_type, 
    compliance_status, 
    ocr_status, 
    customer_id, 
    vendor_id, 
    business_entity_id,
    linked_reference_type,
    date_from,
    date_to,
    limit = 100,
    offset = 0
  } = req.query;

  let query = supabaseAdmin
    .from('document_attachments')
    .select(`
      *,
      customers (id, name, email, gst_number),
      vendors (id, name, email, gst_number),
      business_entities (id, name, legal_name, country),
      ocr_results (
        id,
        extracted_text,
        confidence_score,
        processing_status,
        processed_at,
        language
      )
    `)
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (document_type && document_type !== 'All') {
    query = query.eq('document_type', document_type);
  }
  if (compliance_status && compliance_status !== 'All') {
    query = query.eq('compliance_status', compliance_status);
  }
  if (ocr_status && ocr_status !== 'All') {
    query = query.eq('ocr_status', ocr_status);
  }
  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }
  if (vendor_id) {
    query = query.eq('vendor_id', vendor_id);
  }
  if (business_entity_id) {
    query = query.eq('business_entity_id', business_entity_id);
  }
  if (linked_reference_type && linked_reference_type !== 'All') {
    query = query.eq('linked_reference_type', linked_reference_type);
  }
  if (date_from) {
    query = query.gte('uploaded_at', date_from);
  }
  if (date_to) {
    query = query.lte('uploaded_at', date_to + 'T23:59:59');
  }

  const { data: documents, error } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch documents',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: documents
  });
}));

// Download document
router.get('/download/:id', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: document, error } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !document) {
    return res.status(404).json({
      error: 'Document not found',
      code: 'DOCUMENT_NOT_FOUND'
    });
  }

  try {
    const filePath = document.file_path;
    await fs.access(filePath); // Check if file exists

    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Type', document.mime_type);
    
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (fileError) {
    return res.status(404).json({
      error: 'File not found on disk',
      code: 'FILE_NOT_FOUND'
    });
  }
}));

// Delete document
router.delete('/:id', authenticateToken, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: document, error: fetchError } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !document) {
    return res.status(404).json({
      error: 'Document not found',
      code: 'DOCUMENT_NOT_FOUND'
    });
  }

  // Delete from database
  const { error: deleteError } = await supabaseAdmin
    .from('document_attachments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return res.status(400).json({
      error: 'Failed to delete document',
      code: 'DELETE_FAILED',
      details: deleteError.message
    });
  }

  // Delete file from disk
  try {
    await fs.unlink(document.file_path);
  } catch (fileError) {
    console.error('Failed to delete file from disk:', fileError);
    // Continue anyway since database record is deleted
  }

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

// OCR processing endpoint
router.post('/:id/ocr', authenticateToken, authorize(['admin', 'sales', 'procurement', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: document, error } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !document) {
    return res.status(404).json({
      error: 'Document not found',
      code: 'DOCUMENT_NOT_FOUND'
    });
  }

  // Check if file is an image or PDF
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!supportedTypes.includes(document.mime_type)) {
    return res.status(400).json({
      error: 'OCR not supported for this file type',
      code: 'UNSUPPORTED_FILE_TYPE'
    });
  }

  // Update OCR status to processing
  await supabaseAdmin
    .from('document_attachments')
    .update({ ocr_status: 'processing' })
    .eq('id', id);

  try {
    // In a real implementation, integrate with:
    // - Tesseract.js for client-side OCR
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    
    // Mock OCR processing with trade document specific extraction
    const mockOcrResult = {
      text: 'Sample trade document OCR extracted text\nDocument Number: TD-2024-001\nDate: 2024-09-02\nCountry of Origin: Pakistan\nValue: $10,000 USD',
      confidence: 0.95,
      language: 'en',
      extracted_entities: {
        document_number: 'TD-2024-001',
        date: '2024-09-02',
        country_of_origin: 'Pakistan',
        currency: 'USD',
        amount: 10000,
        addresses: [],
        company_names: [],
        tax_numbers: []
      }
    };

    // Save OCR result
    const ocrData = {
      document_id: id,
      extracted_text: mockOcrResult.text,
      confidence_score: mockOcrResult.confidence,
      processing_status: 'completed',
      processed_at: new Date().toISOString(),
      language: mockOcrResult.language,
      processing_engine: 'mock_engine_v1',
      extracted_entities: mockOcrResult.extracted_entities,
      processed_by: req.user.id
    };

    const { data: ocrResult, error: ocrError } = await supabaseAdmin
      .from('ocr_results')
      .insert(ocrData)
      .select('*')
      .single();

    if (ocrError) {
      // Update document OCR status to failed
      await supabaseAdmin
        .from('document_attachments')
        .update({ ocr_status: 'failed' })
        .eq('id', id);

      return res.status(400).json({
        error: 'Failed to save OCR result',
        code: 'OCR_SAVE_FAILED',
        details: ocrError.message
      });
    }

    // Update document OCR status to completed
    await supabaseAdmin
      .from('document_attachments')
      .update({ ocr_status: 'completed' })
      .eq('id', id);

    res.json({
      success: true,
      message: 'OCR processing completed successfully',
      data: { ocrResult }
    });

  } catch (processingError) {
    // Update document OCR status to failed
    await supabaseAdmin
      .from('document_attachments')
      .update({ ocr_status: 'failed' })
      .eq('id', id);

    return res.status(500).json({
      error: 'OCR processing failed',
      code: 'OCR_PROCESSING_FAILED',
      details: processingError.message
    });
  }
}));

// Update document compliance status
router.patch('/:id/compliance', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { compliance_status, compliance_notes } = req.body;

  if (!compliance_status || !['pending', 'approved', 'rejected', 'under_review'].includes(compliance_status)) {
    return res.status(400).json({
      error: 'Invalid compliance status',
      code: 'INVALID_COMPLIANCE_STATUS'
    });
  }

  const { data: document, error } = await supabaseAdmin
    .from('document_attachments')
    .update({
      compliance_status,
      compliance_notes: compliance_notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      customers (id, name, email),
      vendors (id, name, email),
      business_entities (id, name, legal_name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update compliance status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'Compliance status updated successfully',
    data: { document }
  });
}));

module.exports = router;
