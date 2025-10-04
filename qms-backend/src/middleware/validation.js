const Joi = require('joi');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      console.error('❌ Validation error:', error.details);
      console.error('📝 Request body:', JSON.stringify(req.body, null, 2));
      
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errorDetails
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // User schemas
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    role: Joi.string().valid('admin', 'sales', 'procurement', 'finance', 'auditor').required()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Customer schemas
  customer: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    contact_person: Joi.string().max(255).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(50).optional(),
    fax: Joi.string().max(50).optional(),
    address: Joi.string().optional().allow(null),
    city: Joi.string().max(100).optional().allow(null),
    state: Joi.string().max(100).optional().allow(null),
    country: Joi.string().max(100).optional().allow(null),
    postal_code: Joi.string().max(20).optional().allow(null),
    credit_limit: Joi.number().min(0).optional().allow(null),
    payment_terms: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  }),

  // Vendor schemas
  vendor: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    contact_person: Joi.string().max(255).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(50).optional(),
    address: Joi.string().optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    postal_code: Joi.string().max(20).optional(),
    payment_terms: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  }),

  // Product schemas
  product: Joi.object({
    sku: Joi.string().max(100).required(),
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().optional(),
    category_id: Joi.string().uuid().optional(),
    type: Joi.string().valid('raw_material', 'finished_good', 'service', 'spare_parts').required(),
    unit_of_measure: Joi.string().max(50).required(),
    current_stock: Joi.number().min(0).optional(),
    reorder_point: Joi.number().min(0).optional(),
    max_stock_level: Joi.number().min(0).optional(),
    last_purchase_price: Joi.number().min(0).optional(),
    average_cost: Joi.number().min(0).optional(),
    selling_price: Joi.number().min(0).optional(),
    status: Joi.string().valid('active', 'inactive', 'discontinued').optional()
  }),

  // Quotation schemas
  quotation: Joi.object({
    customer_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().optional(),
    quotation_date: Joi.date().required(),
    valid_until: Joi.date().optional(),
    terms_conditions: Joi.string().optional(),
    notes: Joi.string().optional(),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().allow(null).optional(),
        description: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required(),
        discount_percent: Joi.number().min(0).max(100).optional(),
        tax_percent: Joi.number().min(0).max(100).optional()
      })
    ).min(1).required()
  }),

  // Purchase Order schemas
  purchaseOrder: Joi.object({
    vendor_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().optional(),
    quotation_id: Joi.string().uuid().optional(),
    sales_order_id: Joi.string().uuid().optional(),
    po_date: Joi.date().required(),
    expected_delivery_date: Joi.date().optional(),
    status: Joi.string().valid('draft', 'pending_approval', 'approved', 'sent', 'received', 'closed', 'cancelled').optional(),
    terms_conditions: Joi.string().optional(),
    notes: Joi.string().optional(),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().allow(null).optional(),
        description: Joi.string().required(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required(),
        discount_percent: Joi.number().min(0).max(100).optional(),
        tax_percent: Joi.number().min(0).max(100).optional()
      })
    ).min(1).required()
  }),

  // Stock movement schemas
  stockMovement: Joi.object({
    product_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().required(),
    movement_type: Joi.string().valid('in', 'out', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'purchase', 'sale').required(),
    quantity: Joi.number().positive().required(),
    unit_cost: Joi.number().min(0),
    reference_number: Joi.string().max(100),
    notes: Joi.string().max(500),
    movement_date: Joi.date().iso()
  }),

  // Invoice validation schema
  invoice: Joi.object({
    customer_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().required(),
    invoice_date: Joi.date().iso().required(),
    due_date: Joi.date().iso().required(),
    payment_terms: Joi.string().max(100),
    notes: Joi.string().max(1000),
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').default('draft'),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().allow(null).optional(),
        description: Joi.string().max(500).required(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required(),
        discount_percent: Joi.number().min(0).max(100).default(0),
        tax_percent: Joi.number().min(0).max(100).default(0)
      })
    ).min(1).required()
  }),

  // Sales order validation schema
  salesOrder: Joi.object({
    customer_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().required(),
    quotation_id: Joi.string().uuid(),
    order_date: Joi.date().iso().required(),
    delivery_date: Joi.date().iso(),
    payment_terms: Joi.string().max(100),
    notes: Joi.string().max(1000),
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').default('pending'),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().required(),
        description: Joi.string().max(500).required(),
        quantity: Joi.number().positive().required(),
        unit_price: Joi.number().min(0).required(),
        discount_percent: Joi.number().min(0).max(100).default(0),
        tax_percent: Joi.number().min(0).max(100).default(0)
      })
    ).min(1).required()
  }),

  // Vendor Bill validation schema
  vendorBill: Joi.object({
    bill_number: Joi.string().max(255).required(),
    purchase_order_id: Joi.string().uuid().optional(),
    vendor_id: Joi.string().uuid().required(),
    business_entity_id: Joi.string().uuid().optional(),
    bill_date: Joi.date().required(),
    due_date: Joi.date().optional(),
    subtotal: Joi.number().min(0).optional(),
    tax_amount: Joi.number().min(0).optional(),
    total_amount: Joi.number().min(0).required(),
    notes: Joi.string().max(1000).optional(),
    files: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        size: Joi.number().optional(),
        type: Joi.string().optional(),
        path: Joi.string().required()
      })
    ).optional()
  })
};

module.exports = {
  validate,
  schemas
};
