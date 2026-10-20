/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';

export class MuteService {
  /**
   * Check if a user is currently muted
   */
  static async isMuted(userId) {
    if (!userId) return false;
    try {
      const muteRecord = await dbManager.get(
        'SELECT * FROM mutes WHERE user_id = ?;',
        [userId]
      );

      if (!muteRecord) return false;

      // Check if permanent
      if (muteRecord.is_permanent === 1) {
        return true;
      }

      // Check if temporary and expired
      const now = Date.now();
      if (muteRecord.expires_at && muteRecord.expires_at < now) {
        // Auto-remove expired mute
        await dbManager.run('DELETE FROM mutes WHERE user_id = ?;', [userId]);
        await Logger.logAction({
          userId,
          action: 'MUTE_EXPIRED',
          metadata: { previous_expires_at: muteRecord.expires_at }
        });
        return false;
      }

      return true;
    } catch (err) {
      Logger.error(`Error checking mute for ${userId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Mute a user
   */
  static async muteUser({ userId, mutedBy, durationMs = null, isPermanent = false, reason = 'Muted by staff' }) {
    const now = Date.now();
    const expiresAt = isPermanent ? null : now + durationMs;

    await dbManager.run(
      `INSERT INTO mutes (user_id, muted_by, reason, expires_at, is_permanent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         muted_by = excluded.muted_by,
         reason = excluded.reason,
         expires_at = excluded.expires_at,
         is_permanent = excluded.is_permanent,
         created_at = excluded.created_at;`,
      [userId, mutedBy, reason, expiresAt, isPermanent ? 1 : 0, now]
    );

    await Logger.logAction({
      userId,
      action: 'MUTE_CREATED',
      metadata: { muted_by: mutedBy, expires_at: expiresAt, is_permanent: isPermanent, reason }
    });

    return {
      success: true,
      expiresAt,
      isPermanent
    };
  }

  /**
   * Unmute a user
   */
  static async unmuteUser(userId, unmutedBy = 'SYSTEM') {
    const existing = await dbManager.get(
      'SELECT * FROM mutes WHERE user_id = ?;',
      [userId]
    );

    if (!existing) {
      return { success: false, reason: 'NOT_MUTED' };
    }

    await dbManager.run('DELETE FROM mutes WHERE user_id = ?;', [userId]);

    await Logger.logAction({
      userId,
      action: 'MUTE_REMOVED',
      metadata: { unmuted_by: unmutedBy }
    });

    return { success: true };
  }

  /**
   * Record security/permission violation and apply automatic 10-minute mute
   */
  static async handleViolation({ userId, command, reason, punishmentDurationMinutes = 10 }) {
    const now = Date.now();
    const durationMs = punishmentDurationMinutes * 60 * 1000;
    const punishment = `Auto mute ${punishmentDurationMinutes} phút`;

    // 1. Record violation
    await dbManager.run(
      `INSERT INTO violations (user_id, command, timestamp, reason, punishment)
       VALUES (?, ?, ?, ?, ?);`,
      [userId, command, now, reason, punishment]
    );

    // 2. Apply auto-mute
    await this.muteUser({
      userId,
      mutedBy: 'BOT_SECURITY',
      durationMs,
      isPermanent: false,
      reason: `Vi phạm: ${reason} (Lệnh: ${command})`
    });

    await Logger.logAction({
      userId,
      action: 'ADMIN_COMMAND_DENIED',
      metadata: { command, reason, punishment }
    });

    return {
      durationMinutes: punishmentDurationMinutes
    };
  }
}
