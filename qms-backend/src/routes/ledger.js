const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all ledger entries with pagination and filters
router.get('/', authenticateToken, authorize(['admin', 'finance', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    date_from, 
    date_to, 
    reference_type, 
    account_type,
    customer_vendor,
    entry_type 
  } = req.query;
  
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('ledger_entries')
    .select(`
      *,
      ledger_entry_lines (
        id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        chart_of_accounts (
          account_code,
          account_name,
          account_type
        )
      ),
      users!created_by (
        first_name,
        last_name
      )
    `, { count: 'exact' })
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (date_from) {
    query = query.gte('entry_date', date_from);
  }
  if (date_to) {
    query = query.lte('entry_date', date_to);
  }
  if (reference_type && reference_type !== 'All') {
    query = query.eq('reference_type', reference_type);
  }

  const { data: entries, error, count } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch ledger entries',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  // Calculate financial metrics
  const metricsQuery = supabaseAdmin
    .from('ledger_entries')
    .select(`
      reference_type,
      total_debit,
      total_credit,
      ledger_entry_lines (
        debit_amount,
        credit_amount,
        chart_of_accounts (
          account_type
        )
      )
    `);

  const { data: allEntries } = await metricsQuery;

  const metrics = {
    totalSales: 0,
    totalPurchases: 0,
    expenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    pendingAmount: 0
  };

  if (allEntries) {
    allEntries.forEach(entry => {
      entry.ledger_entry_lines?.forEach(line => {
        const accountType = line.chart_of_accounts?.account_type;
        if (accountType === 'revenue') {
          metrics.totalSales += line.credit_amount || 0;
        } else if (accountType === 'expense') {
          metrics.expenses += line.debit_amount || 0;
        }
      });
      
      if (entry.reference_type === 'purchase_order') {
        metrics.totalPurchases += entry.total_debit || 0;
      }
    });
    
    metrics.netProfit = metrics.totalSales - metrics.totalPurchases - metrics.expenses;
  }

  res.json({
    success: true,
    data: {
      entries,
      metrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

// Get ledger entry by ID
router.get('/:id', authenticateToken, authorize(['admin', 'finance', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: entry, error } = await supabaseAdmin
    .from('ledger_entries')
    .select(`
      *,
      ledger_entry_lines (
        id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        chart_of_accounts (
          account_code,
          account_name,
          account_type
        )
      ),
      users!created_by (
        first_name,
        last_name
      )
    `)
    .eq('id', id)
    .single();

  if (error || !entry) {
    return res.status(404).json({
      error: 'Ledger entry not found',
      code: 'ENTRY_NOT_FOUND'
    });
  }

  res.json({
    success: true,
    data: { entry }
  });
}));

// Create new ledger entry
router.post('/', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const {
    entry_date,
    reference_type,
    reference_id,
    reference_number,
    description,
    lines
  } = req.body;

  // Validate that debits equal credits
  const totalDebits = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return res.status(400).json({
      error: 'Debits must equal credits',
      code: 'UNBALANCED_ENTRY',
      details: { totalDebits, totalCredits }
    });
  }

  // Generate entry number
  const { data: lastEntry } = await supabaseAdmin
    .from('ledger_entries')
    .select('entry_number')
    .order('created_at', { ascending: false })
    .limit(1);

  let entryNumber = 'LE-2024-001';
  if (lastEntry && lastEntry.length > 0) {
    const lastNumber = parseInt(lastEntry[0].entry_number.split('-')[2]);
    entryNumber = `LE-2024-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  // Create ledger entry
  const { data: entry, error: entryError } = await supabaseAdmin
    .from('ledger_entries')
    .insert({
      entry_number: entryNumber,
      entry_date,
      reference_type,
      reference_id,
      reference_number,
      description,
      total_debit: totalDebits,
      total_credit: totalCredits,
      created_by: req.user.id
    })
    .select()
    .single();

  if (entryError) {
    return res.status(400).json({
      error: 'Failed to create ledger entry',
      code: 'CREATION_FAILED',
      details: entryError.message
    });
  }

  // Create ledger entry lines
  const linesWithEntryId = lines.map(line => ({
    ...line,
    ledger_entry_id: entry.id
  }));

  const { data: entryLines, error: linesError } = await supabaseAdmin
    .from('ledger_entry_lines')
    .insert(linesWithEntryId)
    .select(`
      *,
      chart_of_accounts (
        account_code,
        account_name,
        account_type
      )
    `);

  if (linesError) {
    // Rollback the entry if lines creation fails
    await supabaseAdmin.from('ledger_entries').delete().eq('id', entry.id);
    
    return res.status(400).json({
      error: 'Failed to create ledger entry lines',
      code: 'LINES_CREATION_FAILED',
      details: linesError.message
    });
  }

  res.status(201).json({
    success: true,
    message: 'Ledger entry created successfully',
    data: { 
      entry: {
        ...entry,
        ledger_entry_lines: entryLines
      }
    }
  });
}));

// Get chart of accounts
router.get('/accounts/chart', authenticateToken, authorize(['admin', 'finance', 'sales', 'procurement']), asyncHandler(async (req, res) => {
  const { data: accounts, error } = await supabaseAdmin
    .from('chart_of_accounts')
    .select('*')
    .eq('is_active', true)
    .order('account_code', { ascending: true });

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch chart of accounts',
      code: 'FETCH_FAILED',
      details: error.message
    });
  }

  res.json({
    success: true,
    data: { accounts }
  });
}));

// Get financial summary/metrics
router.get('/metrics/summary', authenticateToken, authorize(['admin', 'finance']), asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  
  let query = supabaseAdmin
    .from('ledger_entries')
    .select(`
      reference_type,
      total_debit,
      total_credit,
      entry_date,
      ledger_entry_lines (
        debit_amount,
        credit_amount,
        chart_of_accounts (
          account_type
        )
      )
    `);

  if (date_from) query = query.gte('entry_date', date_from);
  if (date_to) query = query.lte('entry_date', date_to);

  const { data: entries, error } = await query;

  if (error) {
    return res.status(400).json({
      error: 'Failed to fetch financial metrics',
      code: 'METRICS_FETCH_FAILED',
      details: error.message
    });
  }

  const metrics = {
    totalSales: 0,
    totalPurchases: 0,
    expenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    pendingAmount: 0
  };

  entries?.forEach(entry => {
    entry.ledger_entry_lines?.forEach(line => {
      const accountType = line.chart_of_accounts?.account_type;
      if (accountType === 'revenue') {
        metrics.totalSales += line.credit_amount || 0;
      } else if (accountType === 'expense') {
        metrics.expenses += line.debit_amount || 0;
      }
    });
    
    if (entry.reference_type === 'purchase_order') {
      metrics.totalPurchases += entry.total_debit || 0;
    }
  });
  
  metrics.netProfit = metrics.totalSales - metrics.totalPurchases - metrics.expenses;

  res.json({
    success: true,
    data: { metrics }
  });
}));

module.exports = router;
