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

// Upload document
router.post('/upload', authenticateToken, upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      code: 'NO_FILE'
    });
  }

  const { entity_type, entity_id, description } = req.body;

  const documentData = {
    entity_type,
    entity_id,
    file_name: req.file.originalname,
    file_path: req.file.path,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
    description,
    uploaded_by: req.user.id
  };

  const { data: document, error } = await supabaseAdmin
    .from('document_attachments')
    .insert(documentData)
    .select('*')
    .single();

  if (error) {
    // Clean up uploaded file on database error
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      console.error('Failed to clean up file:', unlinkError);
    }

    return res.status(400).json({
      error: 'Failed to save document',
      code: 'SAVE_FAILED',
      details: error.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: { document }
  });
}));

// Get documents for an entity
router.get('/:entityType/:entityId', authenticateToken, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;

  const { data: documents, error } = await supabaseAdmin
    .from('document_attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch documents',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: { documents }
  });
}));

// Download document
router.get('/download/:id', authenticateToken, asyncHandler(async (req, res) => {
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
router.post('/:id/ocr', authenticateToken, asyncHandler(async (req, res) => {
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

  // Mock OCR processing (in real implementation, integrate with Tesseract.js or cloud OCR)
  const mockOcrResult = {
    text: 'Sample OCR extracted text from document',
    confidence: 0.95,
    language: 'en'
  };

  // Save OCR result
  const ocrData = {
    document_id: id,
    extracted_text: mockOcrResult.text,
    confidence_score: mockOcrResult.confidence,
    language: mockOcrResult.language,
    processed_by: req.user.id
  };

  const { data: ocrResult, error: ocrError } = await supabaseAdmin
    .from('ocr_results')
    .insert(ocrData)
    .select('*')
    .single();

  if (ocrError) {
    return res.status(400).json({
      error: 'Failed to save OCR result',
      code: 'OCR_SAVE_FAILED',
      details: ocrError.message
    });
  }

  res.json({
    success: true,
    message: 'OCR processing completed',
    data: { ocrResult }
  });
}));

module.exports = router;
