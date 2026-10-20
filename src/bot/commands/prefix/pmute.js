/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { MuteService } from '../../services/muteService.js';
import { parseDuration } from '../../utils/timeParser.js';

export async function handlePmute(message, args) {
  // 1. Guard: Admin & Mod only (violators get auto-muted 10 mins)
  const isAllowed = await Guard.requireAdminOrMod(message, '*Pmute');
  if (!isAllowed) return;

  const targetUser = message.mentions.users.first() || (args[0] && await message.client.users.fetch(args[0]).catch(() => null));
  const timeArg = args[1];

  if (!targetUser || !timeArg) {
    return message.reply('❌ **Cách dùng:** `*Pmute @user <thời gian>`\n*Ví dụ: `*Pmute @user 10s`, `*Pmute @user 10p`, `*Pmute @user 2h`, `*Pmute @user vv`*');
  }

  const duration = parseDuration(timeArg);
  if (!duration) {
    return message.reply('❌ Đơn vị thời gian không hợp lệ! Hãy dùng: `s` (giây), `p` (phút), `h` (giờ) hoặc `vv` (vĩnh viễn).');
  }

  await MuteService.muteUser({
    userId: targetUser.id,
    mutedBy: message.author.id,
    durationMs: duration.ms,
    isPermanent: duration.isPermanent,
    reason: `Mute bởi staff ${message.author.tag} (${duration.label})`
  });

  await message.reply(`✅ Đã mute BOT thành công đối với <@${targetUser.id}> trong thời gian: **${duration.label}**.`);
}
