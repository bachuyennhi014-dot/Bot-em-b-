/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { MuteService } from './muteService.js';

// In-memory strike tracking for wrong order channel attempts
const channelStrikes = new Map(); // key: `${guildId}:${userId}`, value: count

export class ConfigService {
  static async getServerConfig(guildId) {
    if (!guildId) return null;
    const row = await dbManager.get(
      'SELECT * FROM server_configs WHERE guild_id = ?;',
      [guildId]
    );
    return row || null;
  }

  static async setOrderSetup(guildId, orderChannelId, customerRoleId) {
    const now = Date.now();
    await dbManager.run(
      `INSERT INTO server_configs (guild_id, order_channel_id, customer_role_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         order_channel_id = excluded.order_channel_id,
         customer_role_id = excluded.customer_role_id,
         updated_at = excluded.updated_at;`,
      [guildId, orderChannelId, customerRoleId, now]
    );
    dbManager.saveToDisk();

    await Logger.logAction({
      userId: 'ADMIN',
      action: 'ORDER_SETUP_UPDATED',
      guildId,
      metadata: { orderChannelId, customerRoleId }
    });
  }

  static async setReceiveOrderSetup(guildId, receiveOrderChannelId, staffRoleId) {
    const now = Date.now();
    await dbManager.run(
      `INSERT INTO server_configs (guild_id, receive_order_channel_id, staff_role_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         receive_order_channel_id = excluded.receive_order_channel_id,
         staff_role_id = excluded.staff_role_id,
         updated_at = excluded.updated_at;`,
      [guildId, receiveOrderChannelId, staffRoleId, now]
    );
    dbManager.saveToDisk();

    await Logger.logAction({
      userId: 'ADMIN',
      action: 'RECEIVE_ORDER_SETUP_UPDATED',
      guildId,
      metadata: { receiveOrderChannelId, staffRoleId }
    });
  }

  /**
   * Check order channel validity and track violations (>3 wrong channel tries = 10m auto-mute)
   */
  static async checkOrderChannel(guildId, channelId, userId) {
    const cfg = await this.getServerConfig(guildId);
    if (!cfg || !cfg.order_channel_id) {
      return { allowed: false, reason: 'NOT_CONFIGURED', message: 'Hệ thống Order chưa được Admin thiết lập kênh (`/odersetup`).' };
    }

    if (cfg.order_channel_id !== channelId) {
      const strikeKey = `${guildId}:${userId}`;
      const strikes = (channelStrikes.get(strikeKey) || 0) + 1;
      channelStrikes.set(strikeKey, strikes);

      if (strikes >= 3) {
        channelStrikes.delete(strikeKey);
        await MuteService.handleViolation({
          userId,
          command: '*Poder',
          reason: 'Sử dụng lệnh *Poder sai kênh quá 3 lần',
          punishmentDurationMinutes: 10
        });

        return {
          allowed: false,
          muted: true,
          message: '❌ Bạn đã sử dụng lệnh `*Poder` sai kênh quá 3 lần. Hệ thống tự động **MUTE BOT 10 PHÚT**!'
        };
      }

      return {
        allowed: false,
        muted: false,
        message: `❌ Lệnh chỉ được phép sử dụng tại kênh <#${cfg.order_channel_id}>. (Cảnh cáo: ${strikes}/3 lần)`
      };
    }

    // Success in correct channel -> reset strikes
    channelStrikes.delete(`${guildId}:${userId}`);
    return { allowed: true, config: cfg };
  }
}
