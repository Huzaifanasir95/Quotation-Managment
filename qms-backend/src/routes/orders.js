const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Convert quotation to sales order
router.post('/convert-quote', authenticateToken, authorize(['admin', 'sales']), asyncHandler(async (req, res) => {
  const { quotation_id, expected_delivery, notes, status = 'pending' } = req.body;

  if (!quotation_id) {
    return res.status(400).json({
      error: 'Quotation ID is required',
      code: 'MISSING_QUOTATION_ID'
    });
  }

  // Get the quotation with items
  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('quotations')
    .select(`
      *,
      customers(*),
      quotation_items(*)
    `)
    .eq('id', quotation_id)
    .single();

  if (quotationError || !quotation) {
    return res.status(404).json({
      error: 'Quotation not found',
      code: 'QUOTATION_NOT_FOUND'
    });
  }

  // Check if quotation can be converted
  if (quotation.status === 'converted') {
    return res.status(400).json({
      error: 'Quotation has already been converted',
      code: 'ALREADY_CONVERTED'
    });
  }

  if (!['draft', 'sent', 'approved'].includes(quotation.status)) {
    return res.status(400).json({
      error: 'Only draft, sent, or approved quotations can be converted',
      code: 'INVALID_STATUS',
      current_status: quotation.status
    });
  }

  // Generate order number
  const currentYear = new Date().getFullYear();
  const { data: lastOrder } = await supabaseAdmin
    .from('sales_orders')
    .select('order_number')
    .like('order_number', `SO-${currentYear}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  const order_number = `SO-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;

  // Create sales order
  const orderData = {
    order_number,
    quotation_id: quotation.id,
    customer_id: quotation.customer_id,
    business_entity_id: quotation.business_entity_id,
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: expected_delivery,
    notes,
    subtotal: quotation.subtotal,
    tax_amount: quotation.tax_amount,
    discount_amount: quotation.discount_amount,
    total_amount: quotation.total_amount,
    status,
    created_by: req.user.id
  };

  const { data: order, error: orderError } = await supabaseAdmin
    .from('sales_orders')
    .insert(orderData)
    .select('*')
    .single();

  if (orderError) {
    return res.status(400).json({
      error: 'Failed to create sales order',
      code: 'ORDER_CREATION_FAILED',
      details: orderError.message
    });
  }

  // Create order items from quotation items
  const orderItems = quotation.quotation_items.map(item => ({
    sales_order_id: order.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    tax_percent: item.tax_percent,
    line_total: item.line_total
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('sales_order_items')
    .insert(orderItems);

  if (itemsError) {
    // Rollback order creation
    await supabaseAdmin.from('sales_orders').delete().eq('id', order.id);
    return res.status(400).json({
      error: 'Failed to create order items',
      code: 'ORDER_ITEMS_CREATION_FAILED',
      details: itemsError.message
    });
  }

  // Update quotation status to converted
  const { error: updateError } = await supabaseAdmin
    .from('quotations')
    .update({ 
      status: 'converted'
    })
    .eq('id', quotation_id);

  if (updateError) {
    // Don't fail the request, just log the warning
  }

  res.status(201).json({
    success: true,
    message: 'Quote successfully converted to sales order',
    data: { 
      order,
      order_number: order.order_number
    }
  });
}));

// Get all sales orders
router.get('/', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, customer_id } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('sales_orders')
    .select(`
      *,
      customers(name, email),
      business_entities(name),
      sales_order_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`order_number.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch sales orders',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get order by ID
router.get('/:id', authenticateToken, authorize(['admin', 'sales', 'finance', 'procurement', 'auditor']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: order, error } = await supabaseAdmin
    .from('sales_orders')
    .select(`
      *,
      customers(*),
      business_entities(*),
      sales_order_items(*),
      quotations(quotation_number)
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    return res.status(404).json({
      error: 'Sales order not found',
      code: 'ORDER_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { order }
  });
}));

// Update order delivery status
router.patch('/:id/delivery-status', authenticateToken, authorize(['admin', 'sales', 'logistics']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { delivery_status, delivery_date, delivery_notes } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(delivery_status)) {
    return res.status(400).json({
      error: 'Invalid delivery status',
      code: 'INVALID_DELIVERY_STATUS',
      valid_statuses: validStatuses
    });
  }

  // Get current order
  const { data: currentOrder, error: fetchError } = await supabaseAdmin
    .from('sales_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentOrder) {
    return res.status(404).json({
      error: 'Sales order not found',
      code: 'ORDER_NOT_FOUND'
    });
  }

  const updateData = { 
    status: delivery_status,
    updated_at: new Date().toISOString()
  };

  // Add delivery date if status is delivered
  if (delivery_status === 'delivered' && delivery_date) {
    updateData.delivery_date = delivery_date;
  }

  if (delivery_notes) {
    updateData.delivery_notes = delivery_notes;
  }

  const { data: order, error } = await supabaseAdmin
    .from('sales_orders')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      customers(name, email),
      business_entities(name)
    `)
    .single();

  if (error) {
    return res.status(400).json({
      error: 'Failed to update delivery status',
      code: 'UPDATE_FAILED',
      details: error.message
    });
  }

  // If order is marked as delivered, trigger automatic invoice generation
  if (delivery_status === 'delivered') {
    try {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number')
        .eq('sales_order_id', id)
        .single();

      if (!existingInvoice) {
        // Generate invoice automatically
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
        const dueDate = new Date(delivery_date || new Date());
        dueDate.setDate(dueDate.getDate() + 30);

        // Get order items for invoice creation
        const { data: orderItems } = await supabaseAdmin
          .from('sales_order_items')
          .select('*')
          .eq('sales_order_id', id);

        // Create invoice
        const invoiceData = {
          invoice_number,
          sales_order_id: id,
          customer_id: order.customer_id,
          business_entity_id: order.business_entity_id,
          invoice_date: delivery_date || new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: order.subtotal,
          tax_amount: order.tax_amount,
          discount_amount: order.discount_amount,
          total_amount: order.total_amount,
          status: 'sent',
          notes: `Auto-generated invoice for delivered order ${order.order_number}`,
          created_by: req.user.id
        };

        const { data: invoice, error: invoiceError } = await supabaseAdmin
          .from('invoices')
          .insert(invoiceData)
          .select('*')
          .single();

        if (!invoiceError && orderItems) {
          // Create invoice items
          const invoiceItems = orderItems.map(item => ({
            invoice_id: invoice.id,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            tax_percent: item.tax_percent,
            line_total: item.line_total
          }));

          await supabaseAdmin
            .from('invoice_items')
            .insert(invoiceItems);

          // Update order to mark invoice as generated
          await supabaseAdmin
            .from('sales_orders')
            .update({ 
              status: 'invoiced',
              invoice_generated: true 
            })
            .eq('id', id);

          res.json({
            success: true,
            message: 'Delivery status updated and invoice automatically generated',
            data: { 
              order,
              auto_generated_invoice: {
                invoice_number,
                total_amount: order.total_amount
              }
            }
          });
        } else {
          res.json({
            success: true,
            message: 'Delivery status updated successfully',
            data: { order },
            warning: 'Could not auto-generate invoice'
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Delivery status updated successfully',
          data: { order },
          note: `Invoice ${existingInvoice.invoice_number} already exists for this order`
        });
      }
    } catch (error) {
      console.error('Error in auto-invoice generation:', error);
      res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: { order },
        warning: 'Could not auto-generate invoice due to error'
      });
    }
  } else {
    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: { order }
    });
  }
}));

module.exports = router;
