/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';

export class RoleConfigService {
  static async getRoleConfig(guildId) {
    const row = await dbManager.get(
      'SELECT * FROM role_configs WHERE guild_id = ?;',
      [guildId]
    );
    return row || null;
  }

  static async setRole(guildId, roleKey, roleId) {
    const validKeys = [
      'role_mod',
      'role_mtt',
      'role_tranh_cu_mod',
      'role_nv',
      'role_nvtt',
      'role_tp',
      'role_ct',
      'role_tk'
    ];

    if (!validKeys.includes(roleKey)) {
      throw new Error(`Invalid role key: ${roleKey}`);
    }

    const now = Date.now();
    await dbManager.run(
      `INSERT INTO role_configs (guild_id, ${roleKey}, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         ${roleKey} = excluded.${roleKey},
         updated_at = excluded.updated_at;`,
      [guildId, roleId, now]
    );
    dbManager.saveToDisk();
  }

  static async setNotificationChannel(guildId, channelId) {
    const now = Date.now();
    await dbManager.run(
      `INSERT INTO notifications (guild_id, channel_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         channel_id = excluded.channel_id,
         updated_at = excluded.updated_at;`,
      [guildId, channelId, now]
    );
    dbManager.saveToDisk();
  }

  static async getNotificationChannel(guildId) {
    const row = await dbManager.get(
      'SELECT channel_id FROM notifications WHERE guild_id = ?;',
      [guildId]
    );
    return row ? row.channel_id : null;
  }

  static async setCompanyReviewChannel(guildId, channelId) {
    const now = Date.now();
    await dbManager.run(
      `INSERT INTO company_review_channels (guild_id, channel_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         channel_id = excluded.channel_id,
         updated_at = excluded.updated_at;`,
      [guildId, channelId, now]
    );
    dbManager.saveToDisk();
  }

  static async getCompanyReviewChannel(guildId) {
    const row = await dbManager.get(
      'SELECT channel_id FROM company_review_channels WHERE guild_id = ?;',
      [guildId]
    );
    return row ? row.channel_id : null;
  }

  static async getAllConfigs(guildId) {
    const [serverCfg, roleCfg, notifyCfg, ctyCfg] = await Promise.all([
      dbManager.get('SELECT * FROM server_configs WHERE guild_id = ?;', [guildId]),
      dbManager.get('SELECT * FROM role_configs WHERE guild_id = ?;', [guildId]),
      dbManager.get('SELECT channel_id FROM notifications WHERE guild_id = ?;', [guildId]),
      dbManager.get('SELECT channel_id FROM company_review_channels WHERE guild_id = ?;', [guildId])
    ]);

    return {
      orderChannelId: serverCfg?.order_channel_id || null,
      customerRoleId: serverCfg?.customer_role_id || null,
      receiveOrderChannelId: serverCfg?.receive_order_channel_id || null,
      staffRoleId: serverCfg?.staff_role_id || null,
      notificationChannelId: notifyCfg?.channel_id || null,
      companyReviewChannelId: ctyCfg?.channel_id || null,
      roles: {
        role_mod: roleCfg?.role_mod || null,
        role_mtt: roleCfg?.role_mtt || null,
        role_tranh_cu_mod: roleCfg?.role_tranh_cu_mod || null,
        role_nv: roleCfg?.role_nv || null,
        role_nvtt: roleCfg?.role_nvtt || null,
        role_tp: roleCfg?.role_tp || null,
        role_ct: roleCfg?.role_ct || null,
        role_tk: roleCfg?.role_tk || null
      }
    };
  }
}
