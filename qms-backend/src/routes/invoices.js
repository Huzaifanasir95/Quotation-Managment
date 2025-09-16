const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all invoices
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, customer_id, fbr_sync_status } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(name, email),
      business_entities(name),
      invoice_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  if (fbr_sync_status) {
    query = query.eq('fbr_sync_status', fbr_sync_status);
  }

  const { data: invoices, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch invoices',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get invoice by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(*),
      business_entities(*),
      invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { invoice }
  });
}));

// Create new invoice
router.post('/', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { items, ...invoiceData } = req.body;

  // Generate invoice number
  const currentYear = new Date().getFullYear();
  const { data: lastInvoice } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const invoice_number = `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

  // Calculate totals
  let subtotal = 0;
  let tax_amount = 0;
  let discount_amount = 0;

  const processedItems = items.map(item => {
    const line_total = item.quantity * item.unit_price;
    const discount = line_total * (item.discount_percent || 0) / 100;
    const taxable_amount = line_total - discount;
    const tax = taxable_amount * (item.tax_percent || 0) / 100;

    subtotal += line_total;
    discount_amount += discount;
    tax_amount += tax;

    return {
      ...item,
      line_total: taxable_amount + tax
    };
  });

  const total_amount = subtotal - discount_amount + tax_amount;

  const finalInvoiceData = {
    ...invoiceData,
    invoice_number,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    created_by: req.user.id
  };

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert(finalInvoiceData)
    .select('*')
    .single();

  if (invoiceError) {
    return res.status(400).json({
      error: 'Failed to create invoice',
      code: 'CREATION_FAILED',
      details: invoiceError.message
    });
  }

  // Create invoice items
  const invoiceItems = processedItems.map(item => ({
    ...item,
    invoice_id: invoice.id
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) {
    // Rollback invoice creation
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
    return res.status(400).json({
      error: 'Failed to create invoice items',
      code: 'ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: { invoice }
  });
}));

// Convert sales order to invoice
router.post('/create-from-order', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { sales_order_id, invoice_date, due_date, notes } = req.body;

  if (!sales_order_id) {
    return res.status(400).json({
      error: 'Sales order ID is required',
      code: 'MISSING_SALES_ORDER_ID'
    });
  }

  // Get the sales order with items
  const { data: salesOrder, error: orderError } = await supabaseAdmin
    .from('sales_orders')
    .select(`
      *,
      customers(*),
      business_entities(*),
      sales_order_items(*),
      quotations(quotation_number)
    `)
    .eq('id', sales_order_id)
    .single();

  if (orderError || !salesOrder) {
    return res.status(404).json({
      error: 'Sales order not found',
      code: 'SALES_ORDER_NOT_FOUND'
    });
  }

  // Check if sales order can be invoiced
  if (salesOrder.status === 'cancelled') {
    return res.status(400).json({
      error: 'Cannot create invoice for cancelled sales order',
      code: 'INVALID_ORDER_STATUS'
    });
  }

  // Check if invoice already exists for this sales order
  const { data: existingInvoice } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .eq('sales_order_id', sales_order_id)
    .single();

  if (existingInvoice) {
    return res.status(400).json({
      error: `Invoice ${existingInvoice.invoice_number} already exists for this sales order`,
      code: 'INVOICE_ALREADY_EXISTS'
    });
  }

  // Generate invoice number
  const currentYear = new Date().getFullYear();
  const { data: lastInvoice } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const invoice_number = `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

  // Prepare invoice data
  const finalInvoiceData = {
    invoice_number,
    sales_order_id: salesOrder.id,
    customer_id: salesOrder.customer_id,
    business_entity_id: salesOrder.business_entity_id,
    invoice_date: invoice_date || new Date().toISOString().split('T')[0],
    due_date: due_date || (() => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
      return dueDate.toISOString().split('T')[0];
    })(),
    subtotal: salesOrder.subtotal,
    tax_amount: salesOrder.tax_amount,
    discount_amount: salesOrder.discount_amount,
    total_amount: salesOrder.total_amount,
    status: 'draft',
    notes: notes || `Invoice generated from Sales Order ${salesOrder.order_number}`,
    created_by: req.user.id
  };

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert(finalInvoiceData)
    .select('*')
    .single();

  if (invoiceError) {
    return res.status(400).json({
      error: 'Failed to create invoice',
      code: 'INVOICE_CREATION_FAILED',
      details: invoiceError.message
    });
  }

  // Create invoice items from sales order items
  const invoiceItems = salesOrder.sales_order_items.map(item => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    tax_percent: item.tax_percent,
    line_total: item.line_total
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) {
    // Rollback invoice creation
    await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
    return res.status(400).json({
      error: 'Failed to create invoice items',
      code: 'INVOICE_ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  // Update sales order status to invoiced
  await supabaseAdmin
    .from('sales_orders')
    .update({ status: 'invoiced' })
    .eq('id', sales_order_id);

  res.status(201).json({
    success: true,
    message: `Invoice ${invoice_number} created successfully from sales order ${salesOrder.order_number}`,
    data: { 
      invoice: {
        ...invoice,
        customer: salesOrder.customers,
        business_entity: salesOrder.business_entities
      }
    }
  });
}));

// Update FBR sync status
router.patch('/:id/fbr-sync', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fbr_sync_status, fbr_reference } = req.body;

  const validStatuses = ['pending', 'synced', 'failed'];
  if (!validStatuses.includes(fbr_sync_status)) {
    return res.status(400).json({
      error: 'Invalid FBR sync status',
      code: 'INVALID_FBR_STATUS',
      valid_statuses: validStatuses
    });
  }

  const updateData = { 
    fbr_sync_status,
    fbr_sync_date: new Date().toISOString()
  };

  if (fbr_reference) {
    updateData.fbr_reference = fbr_reference;
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update FBR sync status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    message: 'FBR sync status updated successfully',
    data: { invoice }
  });
}));

// Auto-generate invoices for completed deliveries
router.post('/auto-generate', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  try {
    // Get all delivered sales orders that don't have invoices yet
    const { data: deliveredOrders, error: orderError } = await supabaseAdmin
      .from('sales_orders')
      .select(`
        *,
        customers(*),
        business_entities(*),
        sales_order_items(*),
        quotations(quotation_number)
      `)
      .eq('status', 'delivered')
      .is('invoice_generated', false); // Add this field to track if invoice was generated

    if (orderError) {
      throw new Error(`Failed to fetch delivered orders: ${orderError.message}`);
    }

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No delivered orders found that need invoicing',
        data: { generatedInvoices: [] }
      });
    }

    // Filter out orders that already have invoices
    const ordersNeedingInvoices = [];
    for (const order of deliveredOrders) {
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('sales_order_id', order.id)
        .single();

      if (!existingInvoice) {
        ordersNeedingInvoices.push(order);
      }
    }

    const generatedInvoices = [];

    // Generate invoices for each delivered order
    for (const salesOrder of ordersNeedingInvoices) {
      try {
        // Generate invoice number
        const currentYear = new Date().getFullYear();
        const { data: lastInvoice } = await supabaseAdmin
          .from('invoices')
          .select('invoice_number')
          .like('invoice_number', `INV-${currentYear}-%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;
        if (lastInvoice) {
          const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
          nextNumber = lastNumber + 1;
        }

        const invoice_number = `INV-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

        // Calculate due date (30 days from delivery)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        // Prepare invoice data
        const finalInvoiceData = {
          invoice_number,
          sales_order_id: salesOrder.id,
          customer_id: salesOrder.customer_id,
          business_entity_id: salesOrder.business_entity_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: salesOrder.subtotal,
          tax_amount: salesOrder.tax_amount,
          discount_amount: salesOrder.discount_amount,
          total_amount: salesOrder.total_amount,
          status: 'sent', // Auto-generated invoices are sent directly
          notes: `Auto-generated invoice for delivered order ${salesOrder.order_number}`,
          created_by: req.user.id
        };

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabaseAdmin
          .from('invoices')
          .insert(finalInvoiceData)
          .select('*')
          .single();

        if (invoiceError) {
          console.error(`Failed to create invoice for order ${salesOrder.order_number}:`, invoiceError);
          continue;
        }

        // Create invoice items from sales order items
        const invoiceItems = salesOrder.sales_order_items.map(item => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent,
          line_total: item.line_total
        }));

        const { error: itemsError } = await supabaseAdmin
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          // Rollback invoice creation
          await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
          console.error(`Failed to create invoice items for order ${salesOrder.order_number}:`, itemsError);
          continue;
        }

        // Mark sales order as invoiced
        await supabaseAdmin
          .from('sales_orders')
          .update({ 
            status: 'invoiced',
            invoice_generated: true
          })
          .eq('id', salesOrder.id);

        generatedInvoices.push({
          invoice_number,
          order_number: salesOrder.order_number,
          customer_name: salesOrder.customers?.name,
          total_amount: salesOrder.total_amount
        });

      } catch (error) {
        console.error(`Error generating invoice for order ${salesOrder.order_number}:`, error);
        continue;
      }
    }

    res.json({
      success: true,
      message: `Successfully generated ${generatedInvoices.length} invoice(s) from delivered orders`,
      data: { generatedInvoices }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to auto-generate invoices',
      code: 'AUTO_GENERATION_FAILED',
      details: error.message
    });
  }
}));

// Get single invoice details
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(name, email, phone),
      business_entities(name),
      invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { invoice }
  });
}));

// Mark invoice as paid
router.patch('/:id/mark-paid', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  console.log(`Attempting to mark invoice ${id} as paid`);

  // First check if invoice exists
  const { data: existingInvoice, error: fetchError } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching invoice:', fetchError);
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND',
      details: fetchError.message
    });
  }

  if (!existingInvoice) {
    console.error('Invoice not found in database');
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND'
    });
  }

  console.log('Found invoice:', { 
    id: existingInvoice.id, 
    status: existingInvoice.status, 
    total_amount: existingInvoice.total_amount,
    paid_amount: existingInvoice.paid_amount 
  });

  // Update invoice with paid amount equal to total amount
  const updateData = { 
    status: 'paid',
    paid_amount: existingInvoice.total_amount
  };

  console.log('Updating invoice with data:', updateData);

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating invoice:', error);
    return res.status(400).json({
      error: 'Failed to mark invoice as paid',
      code: 'UPDATE_FAILED',
      details: error.message,
      supabaseError: error
    });
  }

  console.log('Successfully updated invoice:', invoice);

  res.json({
    success: true,
    message: 'Invoice marked as paid successfully',
    data: { invoice }
  });
}));

// Send invoice reminder
router.post('/:id/send-reminder', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get invoice with customer details
  const { data: invoice, error: fetchError } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      customers(name, email, phone)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !invoice) {
    return res.status(404).json({
      error: 'Invoice not found',
      code: 'INVOICE_NOT_FOUND'
    });
  }

  if (!invoice.customers?.email) {
    return res.status(400).json({
      error: 'Customer email not found',
      code: 'NO_EMAIL'
    });
  }

  try {
    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate sending the email and update the last reminder date
    
    // Update last reminder sent date
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ 
        last_reminder_sent: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // TODO: Implement actual email sending logic here
    // Example:
    // await emailService.sendInvoiceReminder({
    //   to: invoice.customers.email,
    //   customerName: invoice.customers.name,
    //   invoiceNumber: invoice.invoice_number,
    //   amount: invoice.total_amount,
    //   dueDate: invoice.due_date
    // });

    res.json({
      success: true,
      message: `Reminder sent successfully to ${invoice.customers.email}`,
      data: { 
        invoice_id: id,
        customer_email: invoice.customers.email,
        reminder_sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to send reminder',
      code: 'REMINDER_SEND_FAILED',
      details: error.message
    });
  }
}));

module.exports = router;
