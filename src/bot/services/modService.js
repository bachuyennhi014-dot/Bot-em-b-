/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';
import { RoleConfigService } from './roleConfigService.js';

export class ModService {
  /**
   * Strictly checks if the user is the bot admin (1402913586853974156)
   */
  static isAdmin(userId) {
    if (!userId) return false;
    return (
      userId === config.BOT_ADMIN_ID ||
      userId === '1402913586853974156' ||
      (Array.isArray(config.ADMIN_IDS) && config.ADMIN_IDS.includes(userId))
    );
  }

  /**
   * Checks if user is in mods table with ACTIVE status OR possesses the setup role_mod in guild
   */
  static async isMod(userId, guild = null) {
    if (this.isAdmin(userId)) return true;
    try {
      const row = await dbManager.get(
        'SELECT user_id FROM mods WHERE user_id = ? AND status = "ACTIVE";',
        [userId]
      );
      if (row) return true;
    } catch (err) {
      Logger.error(`Error checking mod status for ${userId}: ${err.message}`);
    }

    if (guild && guild.id) {
      try {
        const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
        if (roleConfig && roleConfig.role_mod) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member && member.roles.cache.has(roleConfig.role_mod)) {
            return true;
          }
        }
      } catch (err) {
        Logger.error(`Error checking guild role_mod for ${userId}: ${err.message}`);
      }
    }

    return false;
  }

  static async isAdminOrMod(userId, guild = null) {
    if (this.isAdmin(userId)) return true;
    return await this.isMod(userId, guild);
  }

  /**
   * Adds a new mod (Admin only)
   */
  static async addMod(targetUserId, addedByUserId) {
    if (!this.isAdmin(addedByUserId)) {
      throw new Error('UNAUTHORIZED');
    }

    const existing = await dbManager.get(
      'SELECT user_id FROM mods WHERE user_id = ?;',
      [targetUserId]
    );

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return { success: false, reason: 'ALREADY_MOD' };
      } else {
        await dbManager.run(
          'UPDATE mods SET status = "ACTIVE", added_by = ?, created_at = ? WHERE user_id = ?;',
          [addedByUserId, Date.now(), targetUserId]
        );
      }
    } else {
      await dbManager.run(
        'INSERT INTO mods (user_id, added_by, status, created_at) VALUES (?, ?, "ACTIVE", ?);',
        [targetUserId, addedByUserId, Date.now()]
      );
    }

    await Logger.logAction({
      userId: addedByUserId,
      action: 'MOD_ADDED',
      metadata: { target_user_id: targetUserId }
    });

    return { success: true };
  }
}
