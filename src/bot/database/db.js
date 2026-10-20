/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseManager {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.dbPath = null;
    this.isInitialized = false;
    this.inTransaction = false;
    this.txQueue = Promise.resolve();
    this.autoSaveTimer = null;

    // Safety handlers to ensure every player progress is flushed on exit/shutdown
    process.on('SIGINT', () => this.saveToDisk());
    process.on('SIGTERM', () => this.saveToDisk());
    process.on('beforeExit', () => this.saveToDisk());
  }

  async init() {
    if (this.isInitialized) return this;

    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.resolve(process.cwd(), config.SQLITE_PATH);
    console.log(`[Database] Initializing persistent SQLite database at: ${this.dbPath}`);

    this.SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(fileBuffer);
      console.log('[Database] Loaded existing database from disk.');
    } else {
      this.db = new this.SQL.Database();
      console.log('[Database] Created new SQLite database in memory.');
    }

    await this.createTables();
    this.saveToDisk();
    this.startAutoSave(15000);
    this.isInitialized = true;
    console.log('[Database] Database initialized and verified successfully.');
    return this;
  }

  startAutoSave(intervalMs = 15000) {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.autoSaveTimer = setInterval(() => {
      this.saveToDisk();
    }, intervalMs);
  }

  saveToDisk() {
    if (!this.db || !this.dbPath || this.inTransaction) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error('[Database] Failed to save database to disk:', err);
    }
  }

  async createTables() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS wallets (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS bot_fund (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        balance INTEGER NOT NULL DEFAULT 0,
        total_income INTEGER NOT NULL DEFAULT 0,
        total_withdrawn INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        staff_id TEXT,
        order_type TEXT NOT NULL,
        channel_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        subtotal INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id, guild_id, item_id)
      );`,

      `CREATE TABLE IF NOT EXISTS mutes (
        user_id TEXT PRIMARY KEY,
        muted_by TEXT NOT NULL,
        reason TEXT,
        expires_at INTEGER,
        is_permanent INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        command TEXT,
        timestamp INTEGER NOT NULL,
        reason TEXT,
        punishment TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS mods (
        user_id TEXT PRIMARY KEY,
        added_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS server_configs (
        guild_id TEXT PRIMARY KEY,
        order_channel_id TEXT,
        customer_role_id TEXT,
        receive_order_channel_id TEXT,
        staff_role_id TEXT,
        house_price INTEGER DEFAULT 200000,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS private_channels (
        channel_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        channel_name TEXT NOT NULL,
        order_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS topup_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        amount INTEGER,
        order_id TEXT,
        guild_id TEXT,
        metadata TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        entry_fee INTEGER NOT NULL DEFAULT 100000,
        work_salary_min INTEGER NOT NULL DEFAULT 1000,
        work_salary_max INTEGER NOT NULL DEFAULT 10000,
        daily_salary INTEGER NOT NULL DEFAULT 2500,
        work_cost INTEGER NOT NULL DEFAULT 10000000,
        guild_id TEXT NOT NULL DEFAULT 'GLOBAL',
        created_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS company_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        guild_id TEXT NOT NULL,
        role_rank TEXT NOT NULL DEFAULT 'NVTT',
        work_count INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        UNIQUE(user_id, company_id)
      );`,

      `CREATE TABLE IF NOT EXISTS work_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        salary_earned INTEGER NOT NULL,
        work_cost INTEGER NOT NULL DEFAULT 10000000,
        timestamp INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        from_rank TEXT NOT NULL,
        to_rank TEXT NOT NULL,
        bonus INTEGER NOT NULL DEFAULT 100000,
        timestamp INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS elections (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        channel_id TEXT NOT NULL,
        message_id TEXT,
        winner_id TEXT,
        created_at INTEGER NOT NULL,
        closed_at INTEGER
      );`,

      `CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_tag TEXT NOT NULL,
        votes_count INTEGER NOT NULL DEFAULT 0,
        registered_at INTEGER NOT NULL,
        UNIQUE(election_id, user_id)
      );`,

      `CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        election_id TEXT NOT NULL,
        voter_id TEXT NOT NULL,
        candidate_id INTEGER NOT NULL,
        voted_at INTEGER NOT NULL,
        UNIQUE(election_id, voter_id)
      );`,

      `CREATE TABLE IF NOT EXISTS role_configs (
        guild_id TEXT PRIMARY KEY,
        role_mod TEXT,
        role_mtt TEXT,
        role_tranh_cu_mod TEXT,
        role_nv TEXT,
        role_nvtt TEXT,
        role_tp TEXT,
        role_ct TEXT,
        role_tk TEXT,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS notifications (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS salary_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        claim_date TEXT NOT NULL,
        claimed_at INTEGER NOT NULL,
        UNIQUE(user_id, company_id, claim_date)
      );`,

      `CREATE TABLE IF NOT EXISTS daily_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        checkin_date TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        streak INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, checkin_date)
      );`,

      `CREATE TABLE IF NOT EXISTS phatloc_giveaways (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        amount INTEGER NOT NULL,
        claimed_by TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at INTEGER NOT NULL,
        claimed_at INTEGER
      );`,

      `CREATE TABLE IF NOT EXISTS work_cooldowns (
        user_id TEXT PRIMARY KEY,
        last_worked_at INTEGER NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS company_applications (
        application_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id INTEGER NOT NULL,
        fee INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        processed_at INTEGER,
        processed_by TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS company_review_channels (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`
    ];

    for (const sql of schemas) {
      this.db.run(sql);
    }

    // Ensure company_members has position column if not present
    try {
      this.db.run("ALTER TABLE company_members ADD COLUMN position TEXT DEFAULT 'Nhân viên';");
    } catch (_) {
      // Column already exists
    }

    // Seed default company: "Công ty lốp trưởng"
    const ctyRes = this.db.exec("SELECT * FROM companies WHERE name = 'Công ty lốp trưởng';");
    if (!ctyRes || ctyRes.length === 0 || ctyRes[0].values.length === 0) {
      const now = Date.now();
      this.db.run(
        `INSERT INTO companies (name, entry_fee, work_salary_min, work_salary_max, daily_salary, work_cost, guild_id, created_by, status, created_at)
         VALUES ('Công ty lốp trưởng', 100000, 1000, 10000, 2500, 10000000, 'GLOBAL', '1402913586853974156', 'ACTIVE', ?);`,
        [now]
      );
      console.log('[Database] Seeded default company "Công ty lốp trưởng".');
    }

    // Seed Bot Fund id=1 ("🐷 Lợn đất của em bé") if not exists
    const res = this.db.exec('SELECT * FROM bot_fund WHERE id = 1;');
    if (!res || res.length === 0 || res[0].values.length === 0) {
      const now = Date.now();
      this.db.run(
        'INSERT INTO bot_fund (id, balance, total_income, total_withdrawn, updated_at) VALUES (1, 0, 0, 0, ?);',
        [now]
      );
      console.log('[Database] Seeded initial "🐷 Lợn đất của em bé" bot fund record.');
    }
  }

  _sanitizeParams(params = []) {
    return params.map((p) => {
      if (typeof p === 'bigint') {
        if (p <= BigInt(Number.MAX_SAFE_INTEGER) && p >= BigInt(-Number.MAX_SAFE_INTEGER)) {
          return Number(p);
        }
        return p.toString();
      }
      return p;
    });
  }

  run(sql, params = []) {
    try {
      const safeParams = this._sanitizeParams(params);
      this.db.run(sql, safeParams);
      const changesRes = this.db.exec('SELECT changes() as changes, last_insert_rowid() as lastID;');
      let changes = 0;
      let lastID = 0;
      if (changesRes && changesRes.length > 0 && changesRes[0].values.length > 0) {
        changes = changesRes[0].values[0][0];
        lastID = changesRes[0].values[0][1];
      }
      this.saveToDisk();
      return Promise.resolve({ changes, lastID });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  get(sql, params = []) {
    try {
      const safeParams = this._sanitizeParams(params);
      const stmt = this.db.prepare(sql);
      stmt.bind(safeParams);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return Promise.resolve(row);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  all(sql, params = []) {
    try {
      const safeParams = this._sanitizeParams(params);
      const stmt = this.db.prepare(sql);
      stmt.bind(safeParams);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return Promise.resolve(rows);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async transaction(fn) {
    const runInTx = async () => {
      this.inTransaction = true;
      this.db.run('BEGIN TRANSACTION;');
      try {
        const result = await fn(this);
        this.db.run('COMMIT;');
        this.inTransaction = false;
        this.saveToDisk();
        return result;
      } catch (error) {
        try {
          this.db.run('ROLLBACK;');
        } catch (_) {}
        this.inTransaction = false;
        throw error;
      }
    };

    this.txQueue = this.txQueue.then(runInTx, runInTx);
    return this.txQueue;
  }
}

export const dbManager = new DatabaseManager();
