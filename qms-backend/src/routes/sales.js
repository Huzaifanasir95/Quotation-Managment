const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get sales dashboard data
router.get('/dashboard', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  try {
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Get pending quotations count (draft, sent, and non-expired quotations)
    const { count: pendingQuotations } = await supabaseAdmin
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'sent'])
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().split('T')[0]);

    // Get sales this month (from invoices)
    const { data: salesThisMonth } = await supabaseAdmin
      .from('invoices')
      .select('total_amount')
      .gte('invoice_date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('invoice_date', lastDayOfMonth.toISOString().split('T')[0])
      .eq('status', 'paid');

    const salesTotal = salesThisMonth?.reduce((sum, invoice) => sum + parseFloat(invoice.total_amount || 0), 0) || 0;

    // Get top customers by quotation value
    const { data: topCustomersData } = await supabaseAdmin
      .from('quotations')
      .select(`
        customer_id,
        total_amount,
        customers(name)
      `)
      .eq('status', 'approved');

    // Process top customers data
    const customerTotals = {};
    topCustomersData?.forEach(quote => {
      const customerId = quote.customer_id;
      const customerName = quote.customers?.name || 'Unknown';
      if (!customerTotals[customerId]) {
        customerTotals[customerId] = {
          name: customerName,
          totalQuotes: 0,
          quotesCount: 0
        };
      }
      customerTotals[customerId].totalQuotes += parseFloat(quote.total_amount || 0);
      customerTotals[customerId].quotesCount += 1;
    });

    const topCustomers = Object.values(customerTotals)
      .sort((a, b) => b.totalQuotes - a.totalQuotes)
      .slice(0, 5);

    // Get recent inquiries (assuming OCR documents as inquiries)
    const { count: recentInquiries } = await supabaseAdmin
      .from('document_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('reference_type', 'inquiry')
      .gte('uploaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    res.json({
      success: true,
      data: {
        pendingQuotations: pendingQuotations || 0,
        salesThisMonth: salesTotal,
        topCustomers,
        recentInquiries: recentInquiries || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch sales dashboard data',
      code: 'SALES_DASHBOARD_FAILED',
      details: error.message
    });
  }
}));

// Get quotation trends (last 6 months)
router.get('/quotation-trends', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  try {
    const trends = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Get quotations for this month
      const { data: monthQuotations } = await supabaseAdmin
        .from('quotations')
        .select('status, total_amount')
        .gte('quotation_date', firstDay.toISOString().split('T')[0])
        .lte('quotation_date', lastDay.toISOString().split('T')[0]);

      const totalQuotations = monthQuotations?.length || 0;
      const acceptedQuotations = monthQuotations?.filter(q => q.status === 'approved' || q.status === 'converted').length || 0;
      const revenue = monthQuotations
        ?.filter(q => q.status === 'approved' || q.status === 'converted')
        .reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0) || 0;

      trends.push({
        month: monthNames[month],
        quotations: totalQuotations,
        accepted: acceptedQuotations,
        revenue: Math.round(revenue)
      });
    }

    res.json({
      success: true,
      data: { trends }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch quotation trends',
      code: 'QUOTATION_TRENDS_FAILED',
      details: error.message
    });
  }
}));

// Get customers with quotation statistics
router.get('/customers', authenticateToken, authorize(['admin', 'sales', 'finance']), asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('customers')
      .select(`
        *,
        quotations(total_amount, status)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: customers, error, count } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch customers',
        code: 'CUSTOMERS_FETCH_FAILED',
        details: error.message
      });
    }

    // Process customer data to include quotation statistics
    const processedCustomers = customers?.map(customer => {
      const quotations = customer.quotations || [];
      const totalQuotes = quotations.reduce((sum, q) => sum + parseFloat(q.total_amount || 0), 0);
      const quotesCount = quotations.length;

      return {
        id: customer.id,
        name: customer.name,
        contact_person: customer.contact_person,
        email: customer.email,
        phone: customer.phone,
        gst_number: customer.gst_number,
        totalQuotes: Math.round(totalQuotes),
        quotesCount,
        status: customer.status
      };
    }) || [];

    res.json({
      success: true,
      data: {
        customers: processedCustomers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch customers',
      code: 'CUSTOMERS_FETCH_FAILED',
      details: error.message
    });
  }
}));

module.exports = router;
