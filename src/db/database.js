
// Current DB schema version — increment when making schema changes
const DB_VERSION = 4;

export async function initDatabase(db) {
  try {
    // SQLiteProvider already provides the initialized db instance
    await db.execAsync('PRAGMA journal_mode = WAL;');

    // Create tables (never drop — data persists across app restarts)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS system_prefs (
          id TEXT PRIMARY KEY,
          value TEXT
      );

      CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,   -- 'cash', 'bank', 'ewallet', 'credit', 'investment'
          color TEXT NOT NULL,
          initial_balance REAL DEFAULT 0,
          current_balance REAL DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          exclude_from_total INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,      -- 'income' or 'expense'
          is_fixed INTEGER DEFAULT 0,
          is_deleted INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS subcategories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER,
          name TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          fee REAL DEFAULT 0,
          type TEXT NOT NULL,     -- 'income', 'expense', 'transfer'
          account_id INTEGER NOT NULL,
          to_account_id INTEGER,  -- only used if type = 'transfer'
          category_id INTEGER,    -- null if transfer
          subcategory_id INTEGER, -- null if transfer
          description TEXT,
          date TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0, -- Soft Delete column
          FOREIGN KEY (account_id) REFERENCES accounts (id),
          FOREIGN KEY (to_account_id) REFERENCES accounts (id),
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted ON transactions(date, is_deleted);

      CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          monthly_limit REAL NOT NULL,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS recurring_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          fee REAL DEFAULT 0,
          type TEXT NOT NULL,
          account_id INTEGER NOT NULL,
          to_account_id INTEGER,
          category_id INTEGER,
          subcategory_id INTEGER,
          description TEXT,
          frequency TEXT NOT NULL,
          next_date TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts (id),
          FOREIGN KEY (to_account_id) REFERENCES accounts (id),
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
      );

      CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          person_name TEXT NOT NULL,
          original_amount REAL NOT NULL,
          remaining_amount REAL NOT NULL,
          description TEXT,
          due_date TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          description TEXT,
          FOREIGN KEY (debt_id) REFERENCES debts (id)
      );
    `);

    // Run versioned migrations (safe for upgrades)
    await runMigrations(db);

    // Seed default data only on first install
    const accCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM accounts');
    if (accCount.count === 0) {
      await seedAccounts(db);
      await seedCategories(db);
    }

    return db;
  } catch (error) {
    console.error('Failed to init database:', error);
    throw error;
  }
}

async function runMigrations(db) {
  const row = await db.getFirstAsync("SELECT value FROM system_prefs WHERE id = 'db_version'");
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  // Migration v0 → v1: patch older installs
  if (currentVersion < 1) {
    try { await db.execAsync('ALTER TABLE categories ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch(_e) {}
  }

  if (currentVersion < 2) {
    try { await db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted ON transactions(date, is_deleted)'); } catch(_e) {}
  }

  // Migration v2 → v3: Budgeting, Recurring, Debt Tracking
  if (currentVersion < 3) {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          monthly_limit REAL NOT NULL,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (category_id) REFERENCES categories (id)
        );
        CREATE TABLE IF NOT EXISTS recurring_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          fee REAL DEFAULT 0,
          type TEXT NOT NULL,
          account_id INTEGER NOT NULL,
          to_account_id INTEGER,
          category_id INTEGER,
          subcategory_id INTEGER,
          description TEXT,
          frequency TEXT NOT NULL,
          next_date TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts (id),
          FOREIGN KEY (to_account_id) REFERENCES accounts (id),
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
        );
        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          person_name TEXT NOT NULL,
          original_amount REAL NOT NULL,
          remaining_amount REAL NOT NULL,
          description TEXT,
          due_date TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS debt_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debt_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          description TEXT,
          FOREIGN KEY (debt_id) REFERENCES debts (id)
        );
      `);
    } catch(_e) {}
  }

  // Migration v3 → v4: Financial Planner tables
  if (currentVersion < 4) {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS financial_profile (
          id               INTEGER PRIMARY KEY DEFAULT 1,
          monthly_income   REAL NOT NULL DEFAULT 0,
          income_stability TEXT NOT NULL DEFAULT 'stable',
          employment_type  TEXT NOT NULL DEFAULT 'employee',
          marital_status   TEXT NOT NULL DEFAULT 'single',
          dependents       INTEGER NOT NULL DEFAULT 0,
          age              INTEGER DEFAULT NULL,
          location_type    TEXT DEFAULT 'city',
          updated_at       TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS income_sources (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name        TEXT NOT NULL,
          type        TEXT NOT NULL DEFAULT 'salary',
          amount      REAL NOT NULL DEFAULT 0,
          frequency   TEXT NOT NULL DEFAULT 'monthly',
          is_active   INTEGER NOT NULL DEFAULT 1,
          created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS fixed_expenses (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          name             TEXT NOT NULL,
          category         TEXT NOT NULL DEFAULT 'other',
          necessity_level  TEXT NOT NULL DEFAULT 'essential',
          amount           REAL NOT NULL DEFAULT 0,
          frequency        TEXT NOT NULL DEFAULT 'monthly',
          is_active        INTEGER NOT NULL DEFAULT 1,
          created_at       TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS financial_goals (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          name            TEXT NOT NULL,
          type            TEXT NOT NULL DEFAULT 'custom',
          target_amount   REAL NOT NULL DEFAULT 0,
          current_amount  REAL NOT NULL DEFAULT 0,
          monthly_alloc   REAL NOT NULL DEFAULT 0,
          target_date     TEXT,
          priority        INTEGER NOT NULL DEFAULT 1,
          status          TEXT NOT NULL DEFAULT 'active',
          created_at      TEXT DEFAULT (datetime('now')),
          updated_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS financial_assessments (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          period_month         INTEGER NOT NULL,
          period_year          INTEGER NOT NULL,
          total_income         REAL NOT NULL DEFAULT 0,
          total_expense        REAL NOT NULL DEFAULT 0,
          cash_flow            REAL NOT NULL DEFAULT 0,
          savings_rate         REAL NOT NULL DEFAULT 0,
          health_score         REAL NOT NULL DEFAULT 0,
          score_cashflow       REAL DEFAULT 0,
          score_debt           REAL DEFAULT 0,
          score_emergency      REAL DEFAULT 0,
          score_savings        REAL DEFAULT 0,
          score_housing        REAL DEFAULT 0,
          score_goals          REAL DEFAULT 0,
          ratio_housing        REAL DEFAULT 0,
          ratio_food           REAL DEFAULT 0,
          ratio_transport      REAL DEFAULT 0,
          ratio_debt           REAL DEFAULT 0,
          ratio_lifestyle      REAL DEFAULT 0,
          ratios_json          TEXT DEFAULT '{}',
          diagnoses_json       TEXT DEFAULT '[]',
          calculated_at        TEXT DEFAULT (datetime('now')),
          UNIQUE(period_month, period_year)
        );

        CREATE TABLE IF NOT EXISTS simulations (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          name         TEXT NOT NULL,
          type         TEXT NOT NULL,
          input_json   TEXT NOT NULL DEFAULT '{}',
          result_json  TEXT NOT NULL DEFAULT '{}',
          created_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS achievements (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          key          TEXT NOT NULL UNIQUE,
          unlocked_at  TEXT
        );
      `);
    } catch (_e) { console.warn('Migration v4 partial error:', _e); }
  }

  // Save current version
  if (currentVersion < DB_VERSION) {
    await db.runAsync(
      "INSERT OR REPLACE INTO system_prefs (id, value) VALUES ('db_version', ?)",
      [String(DB_VERSION)]
    );
  }
}

async function seedAccounts(db) {
  const accountsData = [
    { name: 'Dompet Tunai', type: 'cash', color: '#10b981', exclude: 0 },
    { name: 'BYOND BSI', type: 'bank', color: '#0ea5e9', exclude: 0 },
    { name: 'Bank Jateng', type: 'bank', color: '#ef4444', exclude: 0 },
    { name: 'Bank Jago', type: 'bank', color: '#f97316', exclude: 0 },
    { name: 'OVO', type: 'ewallet', color: '#8b5cf6', exclude: 0 },
    { name: 'DANA', type: 'ewallet', color: '#3b82f6', exclude: 0 },
    { name: 'ShopeePay', type: 'ewallet', color: '#f59e0b', exclude: 0 },
    { name: 'Ajaib / Bibit', type: 'investment', color: '#14b8a6', exclude: 1 },
    { name: 'Kartu Kredit', type: 'credit', color: '#6366f1', exclude: 1 }
  ];

  for (let acc of accountsData) {
    await db.runAsync(
      'INSERT INTO accounts (name, type, color, exclude_from_total, initial_balance, current_balance) VALUES (?, ?, ?, ?, 0, 0)',
      [acc.name, acc.type, acc.color, acc.exclude]
    );
  }
}

async function seedCategories(db) {
  const categoriesData = [
    { name: 'Pemasukan Aktif', type: 'income', is_fixed: 0, subs: ['Gaji / upah bulanan', 'Honor / fee proyek', 'Bonus & THR', 'Komisi penjualan', 'Hasil usaha / bisnis', 'Pendapatan freelance'] },
    { name: 'Pemasukan Pasif', type: 'income', is_fixed: 0, subs: ['Dividen saham', 'Bunga deposito', 'Hasil sewa properti', 'Cashback', 'Kiriman keluarga'] },

    { name: 'Kebutuhan Pokok (Tetap)', type: 'expense', is_fixed: 1, subs: ['Sewa rumah / kos', 'Cicilan KPR', 'Iuran lingkungan', 'Biaya perawatan rumah', 'Tagihan listrik', 'Air (PDAM)', 'Gas / elpiji', 'Internet rumah', 'TV kabel', 'Bensin / BBM', 'KRL / MRT / Busway'] },
    { name: 'Makanan & Minuman', type: 'expense', is_fixed: 0, subs: ['Belanja bahan makanan', 'Bumbu & rempah', 'Makan di Luar (Warteg/Resto)', 'Fast food', 'GoFood / GrabFood', 'Kopi kekinian', 'Snack & camilan'] },
    { name: 'Komunikasi & Digital', type: 'expense', is_fixed: 0, subs: ['Paket data seluler', 'Pulsa telepon', 'Beli gadget baru', 'Aksesoris gadget'] },
    { name: 'Langganan & Subscription', type: 'expense', is_fixed: 1, subs: ['Streaming Video (Netflix, Disney+)', 'Streaming Musik (Spotify)', 'YouTube Premium', 'Software (Microsoft 365, Canva)', 'Berlangganan AI', 'Top-up game', 'Media Premium'] },
    { name: 'Kesehatan', type: 'expense', is_fixed: 0, subs: ['BPJS Kesehatan', 'Dokter / Klinik', 'Obat resep dokter', 'Vitamin & suplemen', 'Gym / Kebugaran'] },
    { name: 'Pakaian & Penampilan', type: 'expense', is_fixed: 0, subs: ['Baju / Pakaian kerja', 'Laundry', 'Salon / Barbershop', 'Skincare & Kosmetik'] },
    { name: 'Pendidikan', type: 'expense', is_fixed: 1, subs: ['SPP / UKT', 'Kursus / Les privat', 'Buku & alat tulis', 'Pengembangan Diri'] },
    { name: 'Hiburan & Gaya Hidup', type: 'expense', is_fixed: 0, subs: ['Liburan Domestik/LN', 'Nonton Bioskop', 'Hobi', 'Nongkrong di kafe'] },
    { name: 'Sosial & Keagamaan', type: 'expense', is_fixed: 0, subs: ['Zakat & Sedekah', 'Donasi / Amal', 'Kado Ulang Tahun / Nikahan', 'Sumbangan warga / Hajatan'] },
    { name: 'Kewajiban Keuangan', type: 'expense', is_fixed: 1, subs: ['Cicilan Kendaraan', 'Cicilan PayLater / Pinjaman', 'Asuransi', 'Pajak (PPh/PBB)'] },
    { name: 'Tabungan & Investasi', type: 'expense', is_fixed: 1, subs: ['Tabungan / Dana Darurat', 'Reksa dana / Saham', 'Emas', 'Kripto'] },
    { name: 'Rumah Tangga', type: 'expense', is_fixed: 0, subs: ['Gaji ART / Babysitter', 'Belanja kebutuhan rumah (Sabun dll)', 'Perabotan', 'Peralatan elektronik'] },
    { name: 'Anak & Keluarga', type: 'expense', is_fixed: 0, subs: ['Susu / MPASI', 'Popok bayi', 'Mainan anak', 'Kiriman orang tua'] },
    { name: 'Kendaraan (Non-Pokok)', type: 'expense', is_fixed: 0, subs: ['Servis berkala', 'Cuci kendaraan', 'Pajak STNK', 'Tilang'] },
    { name: 'Bisnis & Pekerjaan', type: 'expense', is_fixed: 0, subs: ['Gaji Karyawan', 'Sewa tempat usaha', 'Beli stok / bahan baku', 'Marketing / Iklan', 'Tools bisnis lokal'] },
  ];

  for (let cat of categoriesData) {
    const result = await db.runAsync(
      'INSERT INTO categories (name, type, is_fixed) VALUES (?, ?, ?)',
      [cat.name, cat.type, cat.is_fixed]
    );
    const catId = result.lastInsertRowId;
    for (let sub of cat.subs) {
      await db.runAsync('INSERT INTO subcategories (category_id, name) VALUES (?, ?)', [catId, sub]);
    }
  }
}

export function getDateFilterBoundary(filter) {
  const now = new Date();
  let start = new Date(0);
  let end = new Date(now.getFullYear() + 100, 0, 1);

  if (filter === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (filter === 'week') {
    const d = new Date();
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(d.getFullYear(), d.getMonth(), diffToMonday);
    start.setHours(0,0,0,0);
  } else if (filter === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (filter === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (filter === 'last_year') {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getAccounts(db) {
  return await db.getAllAsync('SELECT * FROM accounts WHERE is_active = 1');
}

export async function getTotalHarta(db) {
  const result = await db.getFirstAsync('SELECT SUM(current_balance) as total FROM accounts WHERE is_active = 1 AND exclude_from_total = 0');
  return result?.total || 0;
}

export async function getCategories(db, type) {
  return await db.getAllAsync('SELECT * FROM categories WHERE type = ? AND (is_deleted = 0 OR is_deleted IS NULL)', [type || 'expense']);
}

export async function getSubCategories(db, categoryId) {
  return await db.getAllAsync('SELECT * FROM subcategories WHERE category_id = ?', [categoryId]);
}

// Tambah Kategori Baru (Pusat Kendali)
export async function addCategory(db, { name, type, is_fixed }) {
  return await db.runAsync('INSERT INTO categories (name, type, is_fixed) VALUES (?, ?, ?)', [name, type, is_fixed || 0]);
}

export async function deleteCategory(db, id) {
  return await db.runAsync('UPDATE categories SET is_deleted = 1 WHERE id = ?', [id || null]);
}

export async function deleteSubCategory(db, id) {
  return await db.runAsync('DELETE FROM subcategories WHERE id = ?', [id || null]);
}

// System Prefs
export async function getPref(db, id, defaultValue = '') {
  const row = await db.getFirstAsync('SELECT value FROM system_prefs WHERE id = ?', [id]);
  return row ? row.value : defaultValue;
}

export async function setPref(db, id, value) {
  return await db.runAsync('INSERT OR REPLACE INTO system_prefs (id, value) VALUES (?, ?)', [id, value]);
}

// Tambah Subkategori Baru
export async function addSubCategory(db, { category_id, name }) {
  return await db.runAsync('INSERT INTO subcategories (category_id, name) VALUES (?, ?)', [category_id, name]);
}

export async function updateAccountBalance(db, accountId) {
    const stats = await db.getFirstAsync(`
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_inc,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_exp,
            SUM(CASE WHEN type = 'transfer' AND account_id = ? THEN (amount + fee) ELSE 0 END) as t_out,
            SUM(CASE WHEN type = 'transfer' AND to_account_id = ? THEN amount ELSE 0 END) as t_in
        FROM transactions WHERE (account_id = ? OR to_account_id = ?) AND is_deleted = 0
    `, [accountId, accountId, accountId, accountId]);
    
    if (!stats) return;

    const acc = await db.getFirstAsync('SELECT initial_balance FROM accounts WHERE id = ?', [accountId]);
    if (!acc) return;

    const newBalance = (acc.initial_balance || 0) 
                     + (stats.total_inc || 0) 
                     - (stats.total_exp || 0) 
                     - (stats.t_out || 0) 
                     + (stats.t_in || 0);

    await db.runAsync('UPDATE accounts SET current_balance = ? WHERE id = ?', [newBalance, accountId]);
}

export async function addTransaction(db, params) {
  try {
    await db.execAsync('BEGIN TRANSACTION');
    const result = await db.runAsync(
      'INSERT INTO transactions (amount, fee, type, account_id, to_account_id, category_id, subcategory_id, description, date, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [
        params.amount, 
        params.fee || 0, 
        params.type, 
        params.account_id, 
        params.to_account_id || null, 
        params.category_id || null, 
        params.subcategory_id || null, 
        params.description || '', 
        params.date
      ]
    );
    
    await updateAccountBalance(db, params.account_id);
    if (params.to_account_id) {
      await updateAccountBalance(db, params.to_account_id);
    }
    await db.execAsync('COMMIT');
    return result;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function deleteTransaction(db, transactionId) {
  try {
    // 1. Get the transaction details before deletion
    const tx = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', [transactionId]);
    if (!tx || tx.is_deleted === 1) return false;

    // 2. Start Atomic Transaction
    await db.execAsync('BEGIN TRANSACTION');

    // 3. Mark as soft deleted
    await db.runAsync('UPDATE transactions SET is_deleted = 1 WHERE id = ?', [transactionId]);

    // 4. Rollback balances safely recalculating from scratch
    await updateAccountBalance(db, tx.account_id);
    if (tx.to_account_id) {
      await updateAccountBalance(db, tx.to_account_id);
    }

    // 5. Commit
    await db.execAsync('COMMIT');
    return true;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    console.error("Soft delete failed: ", e);
    throw e;
  }
}

export async function updateTransaction(db, transactionId, params, oldTx) {
  try {
    await db.execAsync('BEGIN TRANSACTION');

    await db.runAsync(
      `UPDATE transactions SET amount = ?, fee = ?, type = ?, account_id = ?, to_account_id = ?, category_id = ?, subcategory_id = ?, description = ?, date = ? WHERE id = ?`,
      [
        params.amount,
        params.fee || 0,
        params.type,
        params.account_id,
        params.to_account_id || null,
        params.category_id || null,
        params.subcategory_id || null,
        params.description || '',
        params.date,
        transactionId
      ]
    );

    // Update balances for all affected accounts (old and new)
    const accountsToUpdate = new Set([oldTx.account_id, params.account_id]);
    if (oldTx.to_account_id) accountsToUpdate.add(oldTx.to_account_id);
    if (params.to_account_id) accountsToUpdate.add(params.to_account_id);

    for (const accId of accountsToUpdate) {
      if (accId) await updateAccountBalance(db, accId);
    }

    await db.execAsync('COMMIT');
    return true;
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function getAllTransactions(db, searchQuery = '', filterType = 'all', bounds, accountId = null, limit = 0, offset = 0) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  
  let query = `
    SELECT t.*, c.name as category_name, s.name as subcategory_name, a1.name as account_name, a2.name as to_account_name, a1.color as account_color 
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    LEFT JOIN accounts a1 ON t.account_id = a1.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    WHERE t.date >= ? AND t.date <= ? AND t.is_deleted = 0
  `;
  const params = [start, end];

  if (filterType !== 'all') {
    query += ' AND t.type = ?';
    params.push(filterType);
  }

  if (searchQuery) {
    query += ' AND (LOWER(c.name) LIKE LOWER(?) OR LOWER(s.name) LIKE LOWER(?) OR LOWER(t.description) LIKE LOWER(?))';
    const likeQ = '%' + searchQuery + '%';
    params.push(likeQ, likeQ, likeQ);
  }

  if (accountId) {
    query += ' AND (t.account_id = ? OR t.to_account_id = ?)';
    params.push(accountId, accountId);
  }

  query += ' ORDER BY t.date DESC';
  
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  
  return await db.getAllAsync(query, params);
}

export async function getRecentTransactions(db, limit = 10, bounds) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  return await db.getAllAsync(`
    SELECT t.*, c.name as category_name, s.name as subcategory_name, a1.name as account_name, a2.name as to_account_name, a1.color as account_color 
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    LEFT JOIN accounts a1 ON t.account_id = a1.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    WHERE t.date >= ? AND t.date <= ? AND t.is_deleted = 0
    ORDER BY t.date DESC LIMIT ?
  `, [start, end, limit]);
}

export async function getStats(db, bounds) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  const result = await db.getAllAsync('SELECT type, SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ? AND is_deleted = 0 GROUP BY type', [start, end]);
  
  let income = 0;
  let expense = 0;
  result.forEach(row => {
    if (row.type === 'income') income = row.total;
    if (row.type === 'expense') expense = row.total;
  });
  
  const feeResult = await db.getFirstAsync('SELECT SUM(fee) as total_fee FROM transactions WHERE type = "transfer" AND date >= ? AND date <= ? AND is_deleted = 0', [start, end]);
  if (feeResult && feeResult.total_fee) {
    expense += feeResult.total_fee;
  }
  
  return { income, expense, balance: income - expense };
}

export async function getExpenseByCategory(db, bounds) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  return await db.getAllAsync(`
    SELECT c.id, c.name, SUM(t.amount) as total 
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ? AND t.is_deleted = 0
    GROUP BY c.id
    ORDER BY total DESC
  `, [start, end]);
}

export async function getFixedVsVariableExpense(db, bounds) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  return await db.getAllAsync(`
    SELECT c.is_fixed, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' 
      AND t.date >= ? AND t.date <= ? 
      AND t.is_deleted = 0
    GROUP BY c.is_fixed
  `, [start, end]);
}

export async function getSubCategoryExpense(db, categoryId, bounds) {
  const { start, end } = bounds || { start: '1970-01-01T00:00:00.000Z', end: '2100-01-01T00:00:00.000Z' };
  return await db.getAllAsync(`
    SELECT 
      COALESCE(s.name, '(Tanpa subkategori)') as name,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    WHERE t.type = 'expense' AND t.category_id = ?
      AND t.date >= ? AND t.date <= ? AND t.is_deleted = 0
    GROUP BY t.subcategory_id
    ORDER BY total DESC
  `, [categoryId, start, end]);
}

export async function getMonthComparison(db) {
  const now = new Date();
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [thisMonth, lastMonth] = await Promise.all([
    getStats(db, { start: thisStart, end: thisEnd }),
    getStats(db, { start: lastStart, end: lastEnd }),
  ]);
  return { thisMonth, lastMonth };
}

export function calculateFinancialHealth({ income, expense, balance, fixedExpense }) {
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const eir = income > 0 ? (expense / income) * 100 : 0;
  const fixedRatio = income > 0 ? (fixedExpense / income) * 100 : 0;
  const runway = expense > 0 ? balance / expense : Infinity; 
  const netCashFlow = income - expense;
  
  let score = 0;
  if (savingsRate >= 30) score += 35;
  else if (savingsRate >= 20) score += 25;
  else if (savingsRate >= 10) score += 15;
  else if (savingsRate >= 0) score += 5;

  if (eir <= 70) score += 25;
  else if (eir <= 80) score += 18;
  else if (eir <= 90) score += 10;
  else if (eir < 100) score += 3;

  if (fixedRatio <= 40) score += 20;
  else if (fixedRatio <= 50) score += 14;
  else if (fixedRatio <= 60) score += 7;

  if (runway >= 6) score += 20;
  else if (runway >= 3) score += 14;
  else if (runway >= 1) score += 7;

  return {
    savingsRate: parseFloat(savingsRate.toFixed(1)),
    eir: parseFloat(eir.toFixed(1)),
    fixedRatio: parseFloat(fixedRatio.toFixed(1)),
    runway: parseFloat(runway.toFixed(1)),
    netCashFlow,
    score: Math.min(100, score),
    status: score >= 70 ? 'sehat' : score >= 40 ? 'warning' : 'kritis'
  };
}

export function generateSummary(metrics, topCategories) {
  const { savingsRate, fixedRatio, runway, netCashFlow, status, score } = metrics;
  const lines = [];

  if (status === 'sehat') {
    lines.push(`Keuangan bulan ini dalam kondisi sehat dengan skor ${score}/100.`);
  } else if (status === 'warning') {
    lines.push(`Keuangan bulan ini memerlukan perhatian (skor ${score}/100).`);
  } else {
    lines.push(`PERHATIAN: Keuangan bulan ini kritis (skor ${score}/100).`);
  }

  if (savingsRate < 0) {
    lines.push(`Terjadi defisit sebesar Rp ${Math.abs(netCashFlow).toLocaleString('id-ID')} — pengeluaran melebihi pemasukan.`);
  } else if (savingsRate < 20) {
    lines.push(`Savings rate ${savingsRate}% masih di bawah rekomendasi minimal 20% (CFP).`);
  } else {
    lines.push(`Savings rate ${savingsRate}% — berhasil menyisihkan dana dengan sangat baik.`);
  }

  if (fixedRatio > 60) {
    lines.push(`Biaya tetap sangat kaku mencapai ${fixedRatio}%. Evaluasi langganan atau cicilan.`);
  } else if (fixedRatio > 50) {
    lines.push(`Biaya tetap ${fixedRatio}% mulai membatasi keluwesan manuver keuangan Anda.`);
  }

  if (runway < 1) {
    lines.push(`Dana darurat kritis: tersisa ${(runway * 30).toFixed(0)} hari kemampuan bayar.`);
  } else if (runway < 3) {
    lines.push(`Tingkat runway ${runway.toFixed(1)} bulan. Disarankan idealnya 3-6 bulan.`);
  } else {
    lines.push(`Runway super aman (${runway.toFixed(1)} bulan buffer waktu).`);
  }

  if (topCategories && topCategories.length > 0) {
    const top = topCategories[0];
    const totalExp = metrics.totalExp || 1;
    const pct = ((top.total / totalExp) * 100).toFixed(0);
    if (pct > 30) {
      lines.push(`Pos terbesar: "${top.name}" menelan ${pct}% total beban Anda.`);
    }
  }

  return lines.join(' ');
}

// ─── BUDGET FUNCTIONS ────────────────────────────────────────────────────────

export async function getBudgets(db) {
  return await db.getAllAsync(`
    SELECT b.*, c.name as category_name
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.is_active = 1
    ORDER BY c.name
  `);
}

export async function getBudgetWithSpending(db, month, year) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  return await db.getAllAsync(`
    SELECT b.id, b.category_id, b.monthly_limit, c.name as category_name,
      COALESCE(
        (SELECT SUM(t.amount) FROM transactions t
         WHERE t.category_id = b.category_id AND t.type = 'expense'
         AND t.date >= ? AND t.date <= ? AND t.is_deleted = 0), 0
      ) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.is_active = 1
    ORDER BY (spent * 1.0 / b.monthly_limit) DESC
  `, [startDate, endDate]);
}

export async function setBudget(db, category_id, monthly_limit) {
  return await db.runAsync(
    'INSERT OR REPLACE INTO budgets (category_id, monthly_limit, is_active) VALUES (?, ?, 1)',
    [category_id, monthly_limit]
  );
}

export async function deleteBudget(db, id) {
  return await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

// ─── RECURRING TRANSACTION FUNCTIONS ─────────────────────────────────────────

export async function getRecurringTransactions(db) {
  return await db.getAllAsync(`
    SELECT r.*, c.name as category_name, a1.name as account_name, a2.name as to_account_name
    FROM recurring_transactions r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts a1 ON r.account_id = a1.id
    LEFT JOIN accounts a2 ON r.to_account_id = a2.id
    ORDER BY r.next_date ASC
  `);
}

export async function addRecurringTransaction(db, params) {
  return await db.runAsync(
    `INSERT INTO recurring_transactions (amount, fee, type, account_id, to_account_id, category_id, subcategory_id, description, frequency, next_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [params.amount, params.fee || 0, params.type, params.account_id, params.to_account_id || null, params.category_id || null, params.subcategory_id || null, params.description || '', params.frequency, params.next_date]
  );
}

export async function updateRecurringTransaction(db, id, params) {
  return await db.runAsync(
    `UPDATE recurring_transactions SET amount = ?, fee = ?, type = ?, account_id = ?, to_account_id = ?, category_id = ?, subcategory_id = ?, description = ?, frequency = ?, next_date = ?, is_active = ? WHERE id = ?`,
    [params.amount, params.fee || 0, params.type, params.account_id, params.to_account_id || null, params.category_id || null, params.subcategory_id || null, params.description || '', params.frequency, params.next_date, params.is_active ? 1 : 0, id]
  );
}

export async function deleteRecurringTransaction(db, id) {
  return await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
}

export async function toggleRecurringTransaction(db, id, isActive) {
  return await db.runAsync('UPDATE recurring_transactions SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

export function calculateNextDate(frequency, currentDate) {
  const d = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

export async function processDueRecurring(db) {
  const today = new Date().toISOString().split('T')[0];
  const dueItems = await db.getAllAsync(
    "SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_date <= ?",
    [today]
  );

  const created = [];
  for (const item of dueItems) {
    try {
      await db.execAsync('BEGIN TRANSACTION');
      const result = await db.runAsync(
        'INSERT INTO transactions (amount, fee, type, account_id, to_account_id, category_id, subcategory_id, description, date, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
        [item.amount, item.fee, item.type, item.account_id, item.to_account_id, item.category_id, item.subcategory_id, item.description || '', new Date().toISOString()]
      );
      await updateAccountBalance(db, item.account_id);
      if (item.to_account_id) await updateAccountBalance(db, item.to_account_id);
      const nextDate = calculateNextDate(item.frequency, item.next_date);
      await db.runAsync('UPDATE recurring_transactions SET next_date = ? WHERE id = ?', [nextDate, item.id]);
      await db.execAsync('COMMIT');
      created.push({ ...item, transactionId: result.lastInsertRowId });
    } catch (e) {
      await db.execAsync('ROLLBACK');
      console.error('processDueRecurring error for item', item.id, e);
    }
  }
  return created;
}

// ─── DEBT TRACKING FUNCTIONS ─────────────────────────────────────────────────

export async function getDebts(db, type = null) {
  if (type) {
    return await db.getAllAsync('SELECT * FROM debts WHERE type = ? ORDER BY status ASC, due_date ASC', [type]);
  }
  return await db.getAllAsync('SELECT * FROM debts ORDER BY status ASC, due_date ASC');
}

export async function getDebtSummary(db) {
  const receivable = await db.getFirstAsync("SELECT COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE type = 'receivable' AND status != 'settled'");
  const payable = await db.getFirstAsync("SELECT COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE type = 'payable' AND status != 'settled'");
  return {
    totalReceivable: receivable?.total || 0,
    totalPayable: payable?.total || 0,
    net: (receivable?.total || 0) - (payable?.total || 0),
  };
}

export async function addDebt(db, params) {
  return await db.runAsync(
    "INSERT INTO debts (type, person_name, original_amount, remaining_amount, description, due_date, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    [params.type, params.person_name, params.amount, params.amount, params.description || '', params.due_date || null]
  );
}

export async function addDebtPayment(db, debtId, amount, date, description = '') {
  try {
    await db.execAsync('BEGIN TRANSACTION');
    await db.runAsync(
      'INSERT INTO debt_payments (debt_id, amount, date, description) VALUES (?, ?, ?, ?)',
      [debtId, amount, date, description]
    );
    const debt = await db.getFirstAsync('SELECT * FROM debts WHERE id = ?', [debtId]);
    if (!debt) throw new Error('Debt not found');
    const newRemaining = Math.max(0, debt.remaining_amount - amount);
    const newStatus = newRemaining === 0 ? 'settled' : 'partial';
    await db.runAsync('UPDATE debts SET remaining_amount = ?, status = ? WHERE id = ?', [newRemaining, newStatus, debtId]);
    await db.execAsync('COMMIT');
    return { success: true, newRemaining, newStatus };
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function settleDebt(db, debtId) {
  const debt = await db.getFirstAsync('SELECT * FROM debts WHERE id = ?', [debtId]);
  if (!debt) throw new Error('Debt not found');
  if (debt.remaining_amount > 0) {
    await addDebtPayment(db, debtId, debt.remaining_amount, new Date().toISOString(), 'Pelunasan');
  }
  return await db.runAsync("UPDATE debts SET status = 'settled', remaining_amount = 0 WHERE id = ?", [debtId]);
}

export async function deleteDebt(db, debtId) {
  try {
    await db.execAsync('BEGIN TRANSACTION');
    await db.runAsync('DELETE FROM debt_payments WHERE debt_id = ?', [debtId]);
    await db.runAsync('DELETE FROM debts WHERE id = ?', [debtId]);
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export async function getDebtPayments(db, debtId) {
  return await db.getAllAsync('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC', [debtId]);
}

export async function factoryReset(db) {
  try {
    await db.runAsync('BEGIN EXCLUSIVE TRANSACTION;');

    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM sqlite_sequence WHERE name = 'transactions';
      DELETE FROM debt_payments;
      DELETE FROM sqlite_sequence WHERE name = 'debt_payments';
    `);

    await db.execAsync(`
      UPDATE accounts SET current_balance = initial_balance;
    `);

    await db.runAsync(
      "INSERT OR REPLACE INTO system_prefs (id, value) VALUES ('username', 'Pengguna')"
    );

    await db.runAsync('COMMIT;');
  } catch (error) {
    await db.runAsync('ROLLBACK;');
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL PLANNER — DB Functions
// ─────────────────────────────────────────────────────────────────────────────

// ── Financial Profile ────────────────────────────────────────────────────────

export async function getFinancialProfile(db) {
  return await db.getFirstAsync('SELECT * FROM financial_profile WHERE id = 1');
}

export async function saveFinancialProfile(db, profile) {
  const existing = await getFinancialProfile(db);
  if (existing) {
    await db.runAsync(
      `UPDATE financial_profile SET
        monthly_income=?, income_stability=?, employment_type=?,
        marital_status=?, dependents=?, age=?, location_type=?,
        updated_at=datetime('now')
       WHERE id=1`,
      [
        profile.monthly_income, profile.income_stability, profile.employment_type,
        profile.marital_status, profile.dependents, profile.age, profile.location_type,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO financial_profile
        (id, monthly_income, income_stability, employment_type, marital_status, dependents, age, location_type)
       VALUES (1,?,?,?,?,?,?,?)`,
      [
        profile.monthly_income, profile.income_stability, profile.employment_type,
        profile.marital_status, profile.dependents, profile.age, profile.location_type,
      ]
    );
  }
}

// ── Income Sources ────────────────────────────────────────────────────────────

export async function getIncomeSources(db) {
  return await db.getAllAsync('SELECT * FROM income_sources WHERE is_active=1 ORDER BY amount DESC');
}

export async function addIncomeSource(db, source) {
  const result = await db.runAsync(
    'INSERT INTO income_sources (name, type, amount, frequency) VALUES (?,?,?,?)',
    [source.name, source.type, source.amount, source.frequency || 'monthly']
  );
  return result.lastInsertRowId;
}

export async function updateIncomeSource(db, id, source) {
  await db.runAsync(
    'UPDATE income_sources SET name=?, type=?, amount=?, frequency=? WHERE id=?',
    [source.name, source.type, source.amount, source.frequency || 'monthly', id]
  );
}

export async function deleteIncomeSource(db, id) {
  await db.runAsync('UPDATE income_sources SET is_active=0 WHERE id=?', [id]);
}

export async function getTotalMonthlyIncome(db) {
  const sources = await getIncomeSources(db);
  return sources.reduce((sum, s) => {
    const monthly = s.frequency === 'annual' ? s.amount / 12
                  : s.frequency === 'weekly'  ? s.amount * 4
                  : s.amount;
    return sum + monthly;
  }, 0);
}

// ── Fixed Expenses ────────────────────────────────────────────────────────────

export async function getFixedExpenses(db) {
  return await db.getAllAsync('SELECT * FROM fixed_expenses WHERE is_active=1 ORDER BY category, amount DESC');
}

export async function addFixedExpense(db, expense) {
  const result = await db.runAsync(
    'INSERT INTO fixed_expenses (name, category, necessity_level, amount, frequency) VALUES (?,?,?,?,?)',
    [expense.name, expense.category, expense.necessity_level || 'essential', expense.amount, expense.frequency || 'monthly']
  );
  return result.lastInsertRowId;
}

export async function updateFixedExpense(db, id, expense) {
  await db.runAsync(
    'UPDATE fixed_expenses SET name=?, category=?, necessity_level=?, amount=?, frequency=? WHERE id=?',
    [expense.name, expense.category, expense.necessity_level || 'essential', expense.amount, expense.frequency || 'monthly', id]
  );
}

export async function deleteFixedExpense(db, id) {
  await db.runAsync('UPDATE fixed_expenses SET is_active=0 WHERE id=?', [id]);
}

// ── Financial Goals ───────────────────────────────────────────────────────────

export async function getFinancialGoals(db, statusFilter = 'active') {
  if (statusFilter === 'all') {
    return await db.getAllAsync('SELECT * FROM financial_goals ORDER BY priority, created_at');
  }
  return await db.getAllAsync(
    'SELECT * FROM financial_goals WHERE status=? ORDER BY priority, created_at',
    [statusFilter]
  );
}

export async function addFinancialGoal(db, goal) {
  const result = await db.runAsync(
    `INSERT INTO financial_goals (name, type, target_amount, current_amount, monthly_alloc, target_date, priority)
     VALUES (?,?,?,?,?,?,?)`,
    [goal.name, goal.type, goal.target_amount, goal.current_amount || 0, goal.monthly_alloc || 0, goal.target_date || null, goal.priority || 1]
  );
  return result.lastInsertRowId;
}

export async function updateFinancialGoal(db, id, goal) {
  await db.runAsync(
    `UPDATE financial_goals SET name=?, type=?, target_amount=?, current_amount=?,
     monthly_alloc=?, target_date=?, priority=?, status=?, updated_at=datetime('now') WHERE id=?`,
    [goal.name, goal.type, goal.target_amount, goal.current_amount, goal.monthly_alloc, goal.target_date, goal.priority, goal.status || 'active', id]
  );
}

export async function contributeToGoal(db, goalId, amount) {
  const goal = await db.getFirstAsync('SELECT * FROM financial_goals WHERE id=?', [goalId]);
  if (!goal) throw new Error('Goal not found');
  const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);
  const newStatus = newAmount >= goal.target_amount ? 'completed' : 'active';
  await db.runAsync(
    "UPDATE financial_goals SET current_amount=?, status=?, updated_at=datetime('now') WHERE id=?",
    [newAmount, newStatus, goalId]
  );
  return { newAmount, newStatus };
}

export async function deleteFinancialGoal(db, id) {
  await db.runAsync('DELETE FROM financial_goals WHERE id=?', [id]);
}

// ── Financial Assessments ─────────────────────────────────────────────────────

export async function saveFinancialAssessment(db, assessment) {
  await db.runAsync(
    `INSERT OR REPLACE INTO financial_assessments
      (period_month, period_year, total_income, total_expense, cash_flow, savings_rate,
       health_score, score_cashflow, score_debt, score_emergency, score_savings, score_housing, score_goals,
       ratio_housing, ratio_food, ratio_transport, ratio_debt, ratio_lifestyle, ratios_json, diagnoses_json, calculated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
    [
      assessment.period_month, assessment.period_year,
      assessment.total_income, assessment.total_expense, assessment.cash_flow, assessment.savings_rate,
      assessment.health_score,
      assessment.score_cashflow || 0, assessment.score_debt || 0, assessment.score_emergency || 0,
      assessment.score_savings || 0, assessment.score_housing || 0, assessment.score_goals || 0,
      assessment.ratio_housing || 0, assessment.ratio_food || 0, assessment.ratio_transport || 0,
      assessment.ratio_debt || 0, assessment.ratio_lifestyle || 0,
      JSON.stringify(assessment.ratios || {}),
      JSON.stringify(assessment.diagnoses || []),
    ]
  );
}

export async function getLatestAssessment(db) {
  const row = await db.getFirstAsync(
    'SELECT * FROM financial_assessments ORDER BY period_year DESC, period_month DESC LIMIT 1'
  );
  if (!row) return null;
  return {
    ...row,
    ratios: JSON.parse(row.ratios_json || '{}'),
    diagnoses: JSON.parse(row.diagnoses_json || '[]'),
  };
}

export async function getAssessmentHistory(db, limit = 6) {
  const rows = await db.getAllAsync(
    'SELECT * FROM financial_assessments ORDER BY period_year DESC, period_month DESC LIMIT ?',
    [limit]
  );
  return rows.map(r => ({
    ...r,
    ratios: JSON.parse(r.ratios_json || '{}'),
    diagnoses: JSON.parse(r.diagnoses_json || '[]'),
  }));
}

// ── Aggregated transaction data for engine ────────────────────────────────────

export async function getMonthlyTransactionSummary(db, month, year) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end   = `${year}-${String(month).padStart(2,'0')}-31`;

  const rows = await db.getAllAsync(
    `SELECT
       t.type,
       t.amount,
       c.name  AS category_name,
       sc.name AS subcategory_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
     WHERE t.is_deleted = 0
       AND t.date >= ? AND t.date <= ?`,
    [start, end]
  );

  return rows;
}

export async function getTotalLiquidBalance(db) {
  // Liquid = cash + bank + ewallet (excludes credit & investment)
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(current_balance), 0) AS total
     FROM accounts
     WHERE is_active=1
       AND exclude_from_total=0
       AND type IN ('cash','bank','ewallet')`,
  );
  return row?.total || 0;
}

// ── Simulations ───────────────────────────────────────────────────────────────

export async function saveSimulation(db, sim) {
  const result = await db.runAsync(
    'INSERT INTO simulations (name, type, input_json, result_json) VALUES (?,?,?,?)',
    [sim.name, sim.type, JSON.stringify(sim.input), JSON.stringify(sim.result)]
  );
  return result.lastInsertRowId;
}

export async function getSimulations(db) {
  const rows = await db.getAllAsync('SELECT * FROM simulations ORDER BY created_at DESC LIMIT 20');
  return rows.map(r => ({
    ...r,
    input: JSON.parse(r.input_json || '{}'),
    result: JSON.parse(r.result_json || '{}'),
  }));
}

export async function deleteSimulation(db, id) {
  await db.runAsync('DELETE FROM simulations WHERE id=?', [id]);
}

// ── Achievements ──────────────────────────────────────────────────────────────

export async function getAchievements(db) {
  return await db.getAllAsync('SELECT * FROM achievements');
}

export async function unlockAchievement(db, key) {
  await db.runAsync(
    `INSERT OR IGNORE INTO achievements (key, unlocked_at) VALUES (?, datetime('now'))`,
    [key]
  );
}
