/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';

export class Logger {
  static info(message, ...args) {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static warn(message, ...args) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static error(message, ...args) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, ...args);
  }

  static async logAction({ userId, action, amount = null, orderId = null, guildId = null, metadata = null }) {
    try {
      const metaString = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;
      await dbManager.run(
        `INSERT INTO logs (user_id, action, timestamp, amount, order_id, guild_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [userId || 'SYSTEM', action, Date.now(), amount, orderId, guildId, metaString]
      );
      Logger.info(`[AuditLog] ${action} | User: ${userId || 'N/A'} | Order: ${orderId || 'N/A'} | Amount: ${amount || 0}`);
    } catch (err) {
      Logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  static async logAudit(params) {
    return await this.logAction(params);
  }
}
