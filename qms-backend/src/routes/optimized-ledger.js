const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Optimized ledger entries routes with aggregations and cursor pagination

// GET /ledger-entries - Optimized with cursor pagination and aggregations
router.get('/', authenticateToken, authorize(['admin', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { 
    limit = 50, 
    cursor, 
    reference_type,
    status,
    date_from,
    date_to,
    account_type,
    sort_by = 'entry_date',
    sort_order = 'desc'
  } = req.query;

  const pageLimit = Math.min(parseInt(limit), 200);
  
  let query = supabaseAdmin
    .from('ledger_entries')
    .select(`
      *,
      customers:customers(
        id,
        name,
        email
      ),
      vendors:vendors(
        id,
        name,
        email
      )
    `, { count: 'exact' });

  // Apply filters
  if (reference_type && reference_type !== 'all') {
    query = query.eq('reference_type', reference_type);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (account_type && account_type !== 'all') {
    query = query.eq('account_type', account_type);
  }

  if (date_from) {
    query = query.gte('entry_date', date_from);
  }

  if (date_to) {
    query = query.lte('entry_date', date_to);
  }

  // Apply cursor-based pagination
  if (cursor) {
    const operator = sort_order === 'desc' ? 'lt' : 'gt';
    query = query[operator](sort_by, cursor);
  }

  // Apply sorting and limit
  query = query
    .order(sort_by, { ascending: sort_order === 'asc' })
    .order('id', { ascending: false }) // Secondary sort for consistency
    .limit(pageLimit);

  const { data: entries, error, count } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate next cursor
  const nextCursor = entries.length === pageLimit ? 
    entries[entries.length - 1][sort_by] : null;

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        total: count,
        limit: pageLimit,
        next_cursor: nextCursor,
        has_more: entries.length === pageLimit
      }
    }
  });
}));

// GET /ledger-entries/financial-metrics - Optimized financial calculations
router.get('/financial-metrics', authenticateToken, authorize(['admin', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;

  // Use a single query with aggregations to calculate all metrics
  let query = supabaseAdmin
    .from('ledger_entries')
    .select(`
      reference_type,
      total_debit,
      total_credit,
      status
    `);

  if (date_from) {
    query = query.gte('entry_date', date_from);
  }

  if (date_to) {
    query = query.lte('entry_date', date_to);
  }

  query = query.eq('status', 'posted'); // Only include posted entries

  const { data: entries, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate metrics in JavaScript to avoid multiple database queries
  const metrics = entries.reduce((acc, entry) => {
    const debit = entry.total_debit || 0;
    const credit = entry.total_credit || 0;

    switch (entry.reference_type) {
      case 'sale':
        acc.totalSales += Math.max(debit, credit);
        break;
      case 'purchase':
        acc.totalPurchases += Math.max(debit, credit);
        break;
      case 'expense':
        acc.expenses += Math.max(debit, credit);
        break;
    }

    return acc;
  }, {
    totalSales: 0,
    totalPurchases: 0,
    expenses: 0
  });

  // Calculate derived metrics
  metrics.netProfit = metrics.totalSales - metrics.totalPurchases - metrics.expenses;
  metrics.grossProfit = metrics.totalSales - metrics.totalPurchases;
  metrics.profitMargin = metrics.totalSales > 0 ? (metrics.netProfit / metrics.totalSales) * 100 : 0;

  // Get pending invoices count (separate optimized query)
  const { data: pendingInvoices, error: pendingError } = await supabaseAdmin
    .from('ledger_entries')
    .select('id, total_debit, total_credit')
    .eq('status', 'pending')
    .in('reference_type', ['sale', 'purchase']);

  if (!pendingError && pendingInvoices) {
    metrics.pendingInvoices = pendingInvoices.length;
    metrics.pendingAmount = pendingInvoices.reduce((sum, invoice) => 
      sum + Math.max(invoice.total_debit || 0, invoice.total_credit || 0), 0
    );
  } else {
    metrics.pendingInvoices = 0;
    metrics.pendingAmount = 0;
  }

  res.json({
    success: true,
    data: { metrics }
  });
}));

// GET /ledger-entries/balance-sheet - Generate balance sheet data
router.get('/balance-sheet', authenticateToken, authorize(['admin', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { as_of_date = new Date().toISOString().split('T')[0] } = req.query;

  // Single query to get all balance sheet accounts
  const { data: entries, error } = await supabaseAdmin
    .from('ledger_entries')
    .select('account_type, total_debit, total_credit')
    .lte('entry_date', as_of_date)
    .eq('status', 'posted')
    .in('account_type', ['assets', 'liabilities', 'equity']);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate balances by account type
  const balances = entries.reduce((acc, entry) => {
    const accountType = entry.account_type;
    const debit = entry.total_debit || 0;
    const credit = entry.total_credit || 0;

    if (!acc[accountType]) {
      acc[accountType] = { debit: 0, credit: 0, balance: 0 };
    }

    acc[accountType].debit += debit;
    acc[accountType].credit += credit;

    // Assets increase with debits, Liabilities and Equity increase with credits
    if (accountType === 'assets') {
      acc[accountType].balance = acc[accountType].debit - acc[accountType].credit;
    } else {
      acc[accountType].balance = acc[accountType].credit - acc[accountType].debit;
    }

    return acc;
  }, {});

  const totalAssets = balances.assets?.balance || 0;
  const totalLiabilities = balances.liabilities?.balance || 0;
  const totalEquity = balances.equity?.balance || 0;

  res.json({
    success: true,
    data: {
      balance_sheet: {
        as_of_date,
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        total_liabilities_equity: totalLiabilities + totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      },
      details: balances
    }
  });
}));

// GET /ledger-entries/profit-loss - Generate P&L statement
router.get('/profit-loss', authenticateToken, authorize(['admin', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { 
    date_from = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    date_to = new Date().toISOString().split('T')[0]
  } = req.query;

  const { data: entries, error } = await supabaseAdmin
    .from('ledger_entries')
    .select('reference_type, account_type, total_debit, total_credit, entry_date')
    .gte('entry_date', date_from)
    .lte('entry_date', date_to)
    .eq('status', 'posted')
    .in('reference_type', ['sale', 'purchase', 'expense']);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Calculate P&L components
  const pl = entries.reduce((acc, entry) => {
    const amount = Math.max(entry.total_debit || 0, entry.total_credit || 0);

    switch (entry.reference_type) {
      case 'sale':
        acc.revenue += amount;
        break;
      case 'purchase':
        acc.cost_of_goods_sold += amount;
        break;
      case 'expense':
        acc.operating_expenses += amount;
        break;
    }

    return acc;
  }, {
    revenue: 0,
    cost_of_goods_sold: 0,
    operating_expenses: 0
  });

  // Calculate derived values
  pl.gross_profit = pl.revenue - pl.cost_of_goods_sold;
  pl.net_income = pl.gross_profit - pl.operating_expenses;
  pl.gross_margin = pl.revenue > 0 ? (pl.gross_profit / pl.revenue) * 100 : 0;
  pl.net_margin = pl.revenue > 0 ? (pl.net_income / pl.revenue) * 100 : 0;

  res.json({
    success: true,
    data: {
      profit_loss: {
        period: { from: date_from, to: date_to },
        ...pl
      }
    }
  });
}));

// POST /ledger-entries - Create ledger entry with validation
router.post('/', authenticateToken, authorize(['admin', 'finance']), validate(schemas.ledgerEntry), asyncHandler(async (req, res) => {
  const entryData = req.body;

  // Validate that debits equal credits
  const totalDebits = entryData.total_debit || 0;
  const totalCredits = entryData.total_credit || 0;

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return res.status(400).json({ error: 'Total debits must equal total credits' });
  }

  // Generate entry number if not provided
  if (!entryData.reference_number) {
    const currentYear = new Date().getFullYear();
    const { data: lastEntry } = await supabaseAdmin
      .from('ledger_entries')
      .select('reference_number')
      .like('reference_number', `LE-${currentYear}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastEntry) {
      const lastNumber = parseInt(lastEntry.reference_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    entryData.reference_number = `LE-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }

  const { data: entry, error } = await supabaseAdmin
    .from('ledger_entries')
    .insert([{
      ...entryData,
      status: 'posted' // Auto-post simple entries
    }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    success: true,
    data: { entry }
  });
}));

// GET /ledger-entries/search - Fast search with debouncing support
router.get('/search', authenticateToken, authorize(['admin', 'finance', 'auditor']), asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.json({ success: true, data: { entries: [] } });
  }

  const { data: entries, error } = await supabaseAdmin
    .from('ledger_entries')
    .select(`
      id,
      reference_number,
      description,
      entry_date,
      total_debit,
      total_credit,
      reference_type,
      status
    `)
    .or(`
      reference_number.ilike.%${q}%,
      description.ilike.%${q}%
    `)
    .order('entry_date', { ascending: false })
    .limit(parseInt(limit));

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    success: true,
    data: { entries }
  });
}));

module.exports = router;
