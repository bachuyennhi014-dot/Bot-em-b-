/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { config } from '../config.js';

export class EconomyService {
  /**
   * Ensure user record and wallet exist
   */
  static async ensureUser(userId) {
    if (!userId) return;
    const now = Date.now();
    await dbManager.run(
      'INSERT OR IGNORE INTO users (user_id, created_at) VALUES (?, ?);',
      [userId, now]
    );
    await dbManager.run(
      'INSERT OR IGNORE INTO wallets (user_id, balance, updated_at) VALUES (?, 0, ?);',
      [userId, now]
    );
  }

  /**
   * Get player's personal wallet balance
   */
  static async getWallet(userId) {
    await this.ensureUser(userId);
    const row = await dbManager.get(
      'SELECT balance FROM wallets WHERE user_id = ?;',
      [userId]
    );
    return row ? row.balance : 0;
  }

  /**
   * Add money to player's wallet
   */
  static async addWallet(userId, amount, reason = 'WALLET_CREDIT') {
    let bigAmount;
    try {
      bigAmount = typeof amount === 'bigint' ? amount : BigInt(String(amount).split('.')[0] || '0');
    } catch (_) {
      return { success: false, reason: 'INVALID_AMOUNT' };
    }
    if (bigAmount <= 0n) return { success: false, reason: 'INVALID_AMOUNT' };
    await this.ensureUser(userId);

    const now = Date.now();
    const txId = `TX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Pass safe integer representation to SQLite
    const safeAmount = bigAmount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bigAmount) : bigAmount;

    return await dbManager.transaction(async (db) => {
      // Upsert into wallets to guarantee immediate persistence even if record was absent
      await db.run(
        `INSERT INTO wallets (user_id, balance, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = ?;`,
        [userId, safeAmount, now, safeAmount, now]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'WALLET_DEPOSIT', ?, 'SUCCESS', ?, ?);`,
        [txId, userId, safeAmount, JSON.stringify({ reason, amountStr: bigAmount.toString() }), now]
      );

      const walletRow = await db.get('SELECT balance FROM wallets WHERE user_id = ?;', [userId]);
      const newBalance = walletRow ? walletRow.balance : safeAmount;

      await Logger.logAction({
        userId,
        action: 'MONEY_ADDED_TO_WALLET',
        amount: safeAmount,
        metadata: { reason, txId, newBalance, amountStr: bigAmount.toString() }
      });

      return { success: true, txId, newBalance };
    });
  }

  /**
   * Deduct money from player's wallet
   */
  static async deductWallet(userId, amount, reason = 'WALLET_DEBIT') {
    if (amount <= 0) return false;
    await this.ensureUser(userId);

    const now = Date.now();
    const txId = `TX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    return await dbManager.transaction(async (db) => {
      const wallet = await db.get('SELECT balance FROM wallets WHERE user_id = ?;', [userId]);
      const current = wallet ? wallet.balance : 0;
      if (current < amount) {
        throw new Error(`Số dư không đủ! Cần ${amount} kc nhưng ví chỉ có ${current} kc.`);
      }

      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?;',
        [amount, now, userId]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'WALLET_DEBIT', ?, 'SUCCESS', ?, ?);`,
        [txId, userId, amount, JSON.stringify({ reason }), now]
      );

      await Logger.logAction({
        userId,
        action: 'MONEY_REMOVED_FROM_WALLET',
        amount,
        metadata: { reason, txId }
      });

      return { success: true, txId };
    });
  }

  // Aliases for convenience
  static async getWalletBalance(userId) {
    return await this.getWallet(userId);
  }

  static async addWalletBalance(userId, amount, reason) {
    return await this.addWallet(userId, amount, reason);
  }

  static async removeWalletBalance(userId, amount, reason) {
    return await this.deductWallet(userId, amount, reason);
  }

  /**
   * Get "🐷 Lợn đất của em bé" Bot Fund stats
   */
  static async getBotFund() {
    const fund = await dbManager.get('SELECT * FROM bot_fund WHERE id = 1;');
    const txCountRow = await dbManager.get(
      'SELECT COUNT(*) as count FROM transactions WHERE type = "ORDER_PAYMENT" AND status = "SUCCESS";'
    );

    return {
      balance: fund ? fund.balance : 0,
      totalIncome: fund ? fund.total_income : 0,
      totalWithdrawn: fund ? fund.total_withdrawn : 0,
      transactionCount: txCountRow ? txCountRow.count : 0
    };
  }

  /**
   * Withdraw money from "🐷 Lợn đất của em bé" Bot Fund
   * Strictly limited to Bot Admin and designated Mods
   */
  static async withdrawBotFund({ userId, amount, reason = 'WITHDRAW_BY_ADMIN' }) {
    let bigAmount;
    try {
      bigAmount = typeof amount === 'bigint' ? amount : BigInt(String(amount).split('.')[0] || '0');
    } catch (_) {
      return { success: false, reason: 'INVALID_AMOUNT', message: '❌ Số lượng không hợp lệ.' };
    }
    if (bigAmount <= 0n) return { success: false, reason: 'INVALID_AMOUNT', message: '❌ Số lượng phải lớn hơn 0.' };

    const safeAmount = bigAmount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bigAmount) : Number(Number.MAX_SAFE_INTEGER);
    const now = Date.now();
    const txId = `TX-WDF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    return await dbManager.transaction(async (db) => {
      const fund = await db.get('SELECT * FROM bot_fund WHERE id = 1;');
      const currentBalance = fund ? fund.balance : 0;
      if (currentBalance < safeAmount) {
        throw new Error(`Quỹ Lợn đất không đủ số dư! Hiện chỉ còn **${currentBalance.toLocaleString('vi-VN')} kc**.`);
      }

      await db.run(
        'UPDATE bot_fund SET balance = balance - ?, total_withdrawn = total_withdrawn + ?, updated_at = ? WHERE id = 1;',
        [safeAmount, safeAmount, now]
      );

      await this.ensureUser(userId);
      await db.run(
        `INSERT INTO wallets (user_id, balance, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = ?;`,
        [userId, safeAmount, now, safeAmount, now]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'BOT_FUND_WITHDRAWAL', ?, 'SUCCESS', ?, ?);`,
        [txId, userId, safeAmount, JSON.stringify({ reason, amountStr: bigAmount.toString() }), now]
      );

      dbManager.saveToDisk();

      const newFund = await db.get('SELECT balance FROM bot_fund WHERE id = 1;');
      const userWallet = await db.get('SELECT balance FROM wallets WHERE user_id = ?;', [userId]);

      return {
        success: true,
        txId,
        withdrawnAmount: safeAmount,
        remainingFund: newFund ? newFund.balance : 0,
        newUserBalance: userWallet ? userWallet.balance : 0
      };
    });
  }

  /**
   * Get user profile statistics for company application
   */
  static async getUserProfileStats(userId, guildId) {
    const wallet = await this.getWallet(userId);

    const earnedRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type IN ('TOPUP', 'WALLET_DEPOSIT', 'ADMIN_GRANT', 'SALARY', 'WORK_SALARY', 'DAILY_SALARY', 'DAILY_CHECKIN', 'LIXI_RECEIVE', 'PHATLOC_RECEIVE', 'GIVEAWAY_CLAIM', 'PROMOTION_BONUS');`,
      [userId]
    );

    const spentRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type IN ('ORDER_PAYMENT', 'BUY_HOUSE', 'COMPANY_APPLICATION_FEE', 'COMPANY_ENTRY_FEE', 'LIXI_SEND', 'PHATLOC_CREATE', 'WALLET_WITHDRAW');`,
      [userId]
    );

    const privateChannel = await dbManager.get(
      'SELECT channel_name FROM private_channels WHERE owner_id = ? AND guild_id = ? LIMIT 1;',
      [userId, guildId]
    );

    const checkinDaysRow = await dbManager.get(
      'SELECT COUNT(*) as totalDays FROM daily_checkins WHERE user_id = ?;',
      [userId]
    );

    const checkinStreakRow = await dbManager.get(
      'SELECT streak FROM daily_checkins WHERE user_id = ? ORDER BY id DESC LIMIT 1;',
      [userId]
    );

    const memberRow = await dbManager.get(
      `SELECT cm.*, c.name as company_name 
       FROM company_members cm 
       JOIN companies c ON cm.company_id = c.id 
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1;`,
      [userId]
    );

    const workCountRow = await dbManager.get(
      'SELECT COUNT(*) as totalWork FROM work_logs WHERE user_id = ?;',
      [userId]
    );

    return {
      currentBalance: wallet,
      totalEarned: earnedRow?.total || 0,
      totalSpent: spentRow?.total || 0,
      privateChannelName: privateChannel ? `#${privateChannel.channel_name}` : 'Chưa có',
      currentJob: memberRow ? `${memberRow.company_name} (${memberRow.position || memberRow.role_rank})` : 'Tự do / Chưa có',
      workCount: workCountRow?.totalWork || (memberRow ? memberRow.work_count : 0),
      checkinDays: checkinDaysRow?.totalDays || 0,
      checkinStreak: checkinStreakRow?.streak || 0
    };
  }

  /**
   * Execute atomic payment for an order
   * - Strict checks: exists, not already paid, accepted, matching buyer, sufficient funds
   * - Deducts buyer wallet
   * - Adds to Bot Fund ("🐷 Lợn đất của em bé")
   * - Sets order status to PAID
   * - Prevents race conditions & double-payment
   */
  static async payOrder({ orderId, buyerId, guildId }) {
    return await dbManager.transaction(async (db) => {
      // 1. Fetch order
      const order = await db.get('SELECT * FROM orders WHERE id = ?;', [orderId]);
      if (!order) {
        return { success: false, reason: 'ORDER_NOT_FOUND', message: '❌ Không tìm thấy đơn hàng này.' };
      }

      // 2. Anti double-payment check
      if (order.status === 'PAID') {
        return { success: false, reason: 'ALREADY_PAID', message: '❌ Đơn hàng này đã được thanh toán.' };
      }

      // 3. Status check
      if (order.status === 'REJECTED') {
        return { success: false, reason: 'REJECTED', message: '❌ Đơn hàng này đã bị nhân viên từ chối.' };
      }
      if (order.status !== 'ACCEPTED') {
        return { success: false, reason: 'NOT_ACCEPTED', message: '❌ Đơn hàng đang chờ nhân viên duyệt, chưa thể thanh toán.' };
      }

      // 4. Ownership check
      if (order.user_id !== buyerId) {
        return { success: false, reason: 'NOT_OWNER', message: '❌ Bạn không phải là người mua của đơn hàng này.' };
      }

      // 5. Balance check
      await this.ensureUser(buyerId);
      const wallet = await db.get('SELECT balance FROM wallets WHERE user_id = ?;', [buyerId]);
      const currentBalance = wallet ? wallet.balance : 0;

      if (currentBalance < order.total_amount) {
        await Logger.logAction({
          userId: buyerId,
          action: 'PAYMENT_FAILED',
          amount: order.total_amount,
          orderId: order.id,
          guildId,
          metadata: { reason: 'INSUFFICIENT_BALANCE', current_balance: currentBalance }
        });
        return {
          success: false,
          reason: 'INSUFFICIENT_FUNDS',
          message: '❌ Bạn không đủ kim cương để thanh toán đơn hàng này.'
        };
      }

      // 6. ATOMIC UPDATES:
      const now = Date.now();
      const txId = `TX-PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      // a) Deduct buyer wallet
      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?;',
        [order.total_amount, now, buyerId]
      );

      // b) Add to Bot Fund "🐷 Lợn đất của em bé"
      await db.run(
        `UPDATE bot_fund 
         SET balance = balance + ?, 
             total_income = total_income + ?, 
             updated_at = ? 
         WHERE id = 1;`,
        [order.total_amount, order.total_amount, now]
      );

      // c) Mark order as PAID
      await db.run(
        'UPDATE orders SET status = "PAID", updated_at = ? WHERE id = ?;',
        [now, order.id]
      );

      // d) Create transaction record
      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'ORDER_PAYMENT', ?, 'SUCCESS', ?, ?);`,
        [txId, buyerId, order.total_amount, JSON.stringify({ orderId: order.id, guildId }), now]
      );

      // e) Audit Logs
      await Logger.logAction({
        userId: buyerId,
        action: 'MONEY_REMOVED_FROM_WALLET',
        amount: order.total_amount,
        orderId: order.id,
        guildId,
        metadata: { txId }
      });

      await Logger.logAction({
        userId: buyerId,
        action: 'MONEY_ADDED_TO_BOT_FUND',
        amount: order.total_amount,
        orderId: order.id,
        guildId,
        metadata: { fund: config.BOT_FUND_NAME, txId }
      });

      await Logger.logAction({
        userId: buyerId,
        action: 'ORDER_PAID',
        amount: order.total_amount,
        orderId: order.id,
        guildId,
        metadata: { txId }
      });

      return {
        success: true,
        txId,
        order,
        paidAmount: order.total_amount
      };
    });
  }

  /**
   * Create a topup pending request (Payment Provider Integration Ready)
   */
  static async createTopupPending({ userId, amount }) {
    await this.ensureUser(userId);
    const topupId = `TOPUP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();

    await dbManager.run(
      'INSERT INTO topup_transactions (id, user_id, amount, status, created_at) VALUES (?, ?, ?, "PENDING", ?);',
      [topupId, userId, amount, now]
    );

    await Logger.logAction({
      userId,
      action: 'TOPUP_CREATED',
      amount,
      metadata: { topupId, status: 'PENDING' }
    });

    return { topupId, amount, status: 'PENDING' };
  }

  /**
   * Daily check-in (*Pdd): 1 time per day, persisted in SQLite
   */
  static async dailyCheckin(userId) {
    await this.ensureUser(userId);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const existing = await dbManager.get(
      'SELECT * FROM daily_checkins WHERE user_id = ? AND checkin_date = ?;',
      [userId, today]
    );

    if (existing) {
      throw new Error(`Bạn đã điểm danh hôm nay (${today}) rồi! Hãy quay lại vào ngày mai nhé.`);
    }

    // Calculate streak
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const prevCheckin = await dbManager.get(
      'SELECT streak FROM daily_checkins WHERE user_id = ? AND checkin_date = ?;',
      [userId, yesterday]
    );

    const streak = prevCheckin ? prevCheckin.streak + 1 : 1;
    // Reward base 5.000 KC + 500 KC * streak (capped at 20.000 KC)
    const reward = Math.min(20000, 5000 + (streak - 1) * 500);

    const now = Date.now();
    await dbManager.run(
      'INSERT INTO daily_checkins (user_id, checkin_date, reward_amount, streak, created_at) VALUES (?, ?, ?, ?, ?);',
      [userId, today, reward, streak, now]
    );

    // Add reward to user's wallet
    await this.addWallet(userId, reward, `DAILY_CHECKIN_DAY_${streak}`);

    await Logger.logAction({
      userId,
      action: 'DAILY_CHECKIN',
      amount: reward,
      metadata: { checkinDate: today, streak }
    });

    return {
      today,
      reward,
      streak
    };
  }

  /**
   * Transfer KC (*Pgive): Transfer KC directly from sender to receiver
   */
  static async transferMoney({ senderId, receiverId, amount, reason = 'GIVE_KC' }) {
    if (senderId === receiverId) {
      throw new Error('Bạn không thể tự chuyển kim cương cho chính mình!');
    }
    if (amount <= 0) {
      throw new Error('Số kim cương chuyển phải lớn hơn 0!');
    }

    await this.ensureUser(senderId);
    await this.ensureUser(receiverId);

    const now = Date.now();
    const txId = `TX-GIVE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    return await dbManager.transaction(async (db) => {
      const senderWallet = await db.get('SELECT balance FROM wallets WHERE user_id = ?;', [senderId]);
      const currentSenderBalance = senderWallet ? senderWallet.balance : 0;
      if (currentSenderBalance < amount) {
        throw new Error(`Số dư không đủ! Bạn có **${formatKc(currentSenderBalance)} kc**, cần **${formatKc(amount)} kc**.`);
      }

      // Deduct sender
      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?;',
        [amount, now, senderId]
      );

      // Add receiver
      await db.run(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?;',
        [amount, now, receiverId]
      );

      // Record transaction
      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'GIVE_SENT', ?, 'SUCCESS', ?, ?);`,
        [txId, senderId, amount, JSON.stringify({ to: receiverId, reason }), now]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'GIVE_RECEIVED', ?, 'SUCCESS', ?, ?);`,
        [`${txId}-RECV`, receiverId, amount, JSON.stringify({ from: senderId, reason }), now]
      );

      await Logger.logAction({
        userId: senderId,
        action: 'MONEY_TRANSFERRED',
        amount,
        metadata: { receiverId, txId, reason }
      });

      return {
        success: true,
        txId,
        amount,
        senderRemaining: currentSenderBalance - amount
      };
    });
  }

  /**
   * Send Lucky Money (*Plixi): Max 10.000.000 KC, deducts from user's wallet
   */
  static async sendLixi({ senderId, amount }) {
    const MAX_LIXI = 10000000; // 10.000.000 KC
    if (amount <= 0) {
      throw new Error('Số tiền lì xì phải lớn hơn 0!');
    }
    if (amount > MAX_LIXI) {
      throw new Error(`Số tiền lì xì tối đa là **${formatKc(MAX_LIXI)} kc** (10m)!`);
    }

    await this.ensureUser(senderId);
    const balance = await this.getWallet(senderId);
    if (balance < amount) {
      throw new Error(`Bạn không đủ kim cương để lì xì! Ví hiện tại có **${formatKc(balance)} kc**.`);
    }

    const now = Date.now();
    const txId = `TX-LIXI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Deduct money from sender
    await dbManager.transaction(async (db) => {
      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?;',
        [amount, now, senderId]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'LIXI_SENT', ?, 'SUCCESS', ?, ?);`,
        [txId, senderId, amount, JSON.stringify({ type: 'LIXI_BROADCAST' }), now]
      );
    });

    await Logger.logAction({
      userId: senderId,
      action: 'LIXI_SENT',
      amount,
      metadata: { txId }
    });

    return {
      txId,
      amount,
      remaining: balance - amount
    };
  }

  /**
   * Create Phat Loc giveaway (*Pphatloc): Max 1.000.000 KC, exactly 1 winner
   */
  static async createPhatloc({ creatorId, guildId, channelId, amount }) {
    const MAX_PHATLOC = 1000000; // 1.000.000 KC
    if (amount <= 0) {
      throw new Error('Số kim cương phát lộc phải lớn hơn 0!');
    }
    if (amount > MAX_PHATLOC) {
      throw new Error(`Số kim cương phát lộc tối đa là **${formatKc(MAX_PHATLOC)} kc** (1m)!`);
    }

    await this.ensureUser(creatorId);
    const balance = await this.getWallet(creatorId);
    if (balance < amount) {
      throw new Error(`Bạn không đủ kim cương để phát lộc! Ví hiện tại có **${formatKc(balance)} kc**.`);
    }

    const giveawayId = `PL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();

    // Deduct money upfront from creator
    await dbManager.transaction(async (db) => {
      await db.run(
        'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?;',
        [amount, now, creatorId]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'PHATLOC_CREATED', ?, 'SUCCESS', ?, ?);`,
        [giveawayId, creatorId, amount, JSON.stringify({ guildId, channelId }), now]
      );

      await db.run(
        `INSERT INTO phatloc_giveaways (id, creator_id, guild_id, channel_id, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'OPEN', ?);`,
        [giveawayId, creatorId, guildId, channelId, amount, now]
      );
    });

    await Logger.logAction({
      userId: creatorId,
      action: 'PHATLOC_CREATED',
      amount,
      metadata: { giveawayId }
    });

    return {
      giveawayId,
      amount,
      remaining: balance - amount
    };
  }

  /**
   * Claim Phat Loc giveaway: First valid user gets the money, then locks
   */
  static async claimPhatloc({ giveawayId, claimerId }) {
    await this.ensureUser(claimerId);
    const now = Date.now();

    return await dbManager.transaction(async (db) => {
      const g = await db.get('SELECT * FROM phatloc_giveaways WHERE id = ?;', [giveawayId]);
      if (!g) {
        throw new Error('Gói phát lộc này không tồn tại!');
      }
      if (g.status !== 'OPEN') {
        throw new Error('Gói phát lộc này đã có người nhận rồi!');
      }
      if (g.creator_id === claimerId) {
        throw new Error('Bạn không thể tự nhận gói phát lộc do chính mình tạo ra!');
      }

      // Mark as claimed
      await db.run(
        'UPDATE phatloc_giveaways SET status = "CLAIMED", claimed_by = ?, claimed_at = ? WHERE id = ?;',
        [claimerId, now, giveawayId]
      );

      // Add money to claimer wallet
      await db.run(
        'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?;',
        [g.amount, now, claimerId]
      );

      await db.run(
        `INSERT INTO transactions (id, user_id, type, amount, status, metadata, created_at)
         VALUES (?, ?, 'PHATLOC_CLAIMED', ?, 'SUCCESS', ?, ?);`,
        [`${giveawayId}-CLAIM`, claimerId, g.amount, JSON.stringify({ creatorId: g.creator_id }), now]
      );

      await Logger.logAction({
        userId: claimerId,
        action: 'PHATLOC_CLAIMED',
        amount: g.amount,
        metadata: { giveawayId, creatorId: g.creator_id }
      });

      return {
        success: true,
        amount: g.amount,
        creatorId: g.creator_id,
        claimedBy: claimerId
      };
    });
  }

  /**
   * Get detailed wallet statistics from transactions table (*Mvi)
   */
  static async getWalletStats(userId) {
    await this.ensureUser(userId);
    const currentBalance = await this.getWallet(userId);

    // KC spent (ORDER_PAYMENT, ENTRY_FEE, etc.)
    const spentRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type IN ('ORDER_PAYMENT', 'WALLET_DEBIT') AND status = 'SUCCESS';`,
      [userId]
    );
    const spent = spentRow ? spentRow.total : 0;

    // KC earned today (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayEarnedRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type IN ('WALLET_CREDIT', 'WALLET_DEPOSIT', 'PHATLOC_CLAIMED') AND created_at >= ? AND status = 'SUCCESS';`,
      [userId, todayStart]
    );
    // Include work salaries from work_logs today
    const workTodayRow = await dbManager.get(
      'SELECT COALESCE(SUM(salary_earned), 0) as total FROM work_logs WHERE user_id = ? AND timestamp >= ?;',
      [userId, todayStart]
    );
    const earnedToday = (todayEarnedRow ? todayEarnedRow.total : 0) + (workTodayRow ? workTodayRow.total : 0);

    // KC given (GIVE_SENT)
    const givenRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type = 'GIVE_SENT' AND status = 'SUCCESS';`,
      [userId]
    );
    const given = givenRow ? givenRow.total : 0;

    // KC received (GIVE_RECEIVED)
    const receivedRow = await dbManager.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
       WHERE user_id = ? AND type = 'GIVE_RECEIVED' AND status = 'SUCCESS';`,
      [userId]
    );
    const received = receivedRow ? receivedRow.total : 0;

    return {
      currentBalance,
      spent,
      earnedToday,
      given,
      received
    };
  }

  /**
   * Get user profile summary (*Mhs)
   */
  static async getUserProfileSummary(userId) {
    await this.ensureUser(userId);
    const balance = await this.getWallet(userId);

    // Checkin info
    const checkinCountRow = await dbManager.get(
      'SELECT COUNT(*) as count, MAX(created_at) as last_time FROM daily_checkins WHERE user_id = ?;',
      [userId]
    );
    const checkinCount = checkinCountRow ? checkinCountRow.count : 0;

    // Lixi info
    const lixiRow = await dbManager.get(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'LIXI_SENT';",
      [userId]
    );
    const lixiTotal = lixiRow ? lixiRow.total : 0;

    // Phat loc info
    const phatlocRow = await dbManager.get(
      'SELECT COUNT(*) as count FROM phatloc_giveaways WHERE creator_id = ?;',
      [userId]
    );
    const phatlocCount = phatlocRow ? phatlocRow.count : 0;

    // Orders info
    const ordersRow = await dbManager.get(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?;',
      [userId]
    );
    const ordersCount = ordersRow ? ordersRow.count : 0;

    // Private channels (mua nhà)
    const channels = await dbManager.all(
      'SELECT channel_name FROM private_channels WHERE owner_id = ?;',
      [userId]
    );

    // Mute status
    const muteInfo = await dbManager.get(
      'SELECT * FROM mutes WHERE user_id = ?;',
      [userId]
    );
    let isMuted = false;
    let muteExpiry = null;
    if (muteInfo) {
      if (muteInfo.is_permanent) {
        isMuted = true;
        muteExpiry = 'Vĩnh viễn';
      } else if (muteInfo.expires_at > Date.now()) {
        isMuted = true;
        muteExpiry = `<t:${Math.floor(muteInfo.expires_at / 1000)}:R>`;
      }
    }

    return {
      userId,
      balance,
      checkinCount,
      lixiTotal,
      phatlocCount,
      ordersCount,
      privateChannels: channels.map(c => c.channel_name),
      isMuted,
      muteExpiry
    };
  }
}
