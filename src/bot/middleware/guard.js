/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MuteService } from '../services/muteService.js';
import { ModService } from '../services/modService.js';

export class Guard {
  /**
   * Check if user is muted. Returns true if BLOCKED, false if allowed.
   */
  static async isMutedAndBlock(source) {
    const userId = source.author ? source.author.id : source.user?.id;
    if (!userId) return false;

    const isMuted = await MuteService.isMuted(userId);
    if (isMuted) {
      const msg = '❌ **Bạn đang bị cấm (MUTE) sử dụng toàn bộ tính năng của BOT.**';
      if (source.reply) {
        if (source.isRepliable && source.isRepliable()) {
          if (source.replied || source.deferred) {
            await source.followUp({ content: msg, flags: 64 });
          } else {
            await source.reply({ content: msg, flags: 64 });
          }
        } else {
          await source.reply(msg).catch(() => {});
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Verifies Admin or Mod permissions.
   * If normal user calls this command => auto mute 10 minutes + violation log!
   */
  static async requireAdminOrMod(message, commandName) {
    const userId = message.author.id;
    const isAuthorized = await ModService.isAdminOrMod(userId, message.guild);

    if (!isAuthorized) {
      await MuteService.handleViolation({
        userId,
        command: commandName,
        reason: 'Cố ý sử dụng lệnh Quản trị (Admin/Mod) khi không có quyền',
        punishmentDurationMinutes: 10
      });

      await message.reply(
        `❌ **Từ chối quyền truy cập:** Bạn không có quyền sử dụng lệnh \`${commandName}\`.\n` +
        `⚠️ Hệ thống bảo mật đã tự động **MUTE BOT 10 PHÚT** tài khoản của bạn!`
      ).catch(() => {});

      return false;
    }

    return true;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(userId) {
    return ModService.isAdmin(userId);
  }

  /**
   * Verifies Admin permissions for commands
   */
  static async requireAdmin(message, commandName) {
    return await this.requireStrictAdmin(message, commandName);
  }

  /**
   * Verifies strictly UNIQUE Bot Admin (1402913586853974156).
   * If anyone else calls this command => auto mute 10 minutes + violation log!
   */
  static async requireStrictAdmin(message, commandName) {
    const userId = message.author.id;
    const isAdmin = ModService.isAdmin(userId);

    if (!isAdmin) {
      await MuteService.handleViolation({
        userId,
        command: commandName,
        reason: 'Cố ý sử dụng lệnh Độc quyền của ADMIN duy nhất',
        punishmentDurationMinutes: 10
      });

      await message.reply(
        `❌ **Từ chối quyền truy cập:** Lệnh \`${commandName}\` CHỈ DÀNH RIÊNG cho ADMIN duy nhất của bot.\n` +
        `⚠️ Hệ thống bảo mật đã tự động **MUTE BOT 10 PHÚT** tài khoản của bạn!`
      ).catch(() => {});

      return false;
    }

    return true;
  }
}
