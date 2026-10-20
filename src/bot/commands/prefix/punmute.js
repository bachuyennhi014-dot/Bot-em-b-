/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { MuteService } from '../../services/muteService.js';

export async function handlePunmute(message, args) {
  // 1. Guard: Admin & Mod only (violators get auto-muted 10 mins)
  const isAllowed = await Guard.requireAdminOrMod(message, '*Punmute');
  if (!isAllowed) return;

  const targetUser = message.mentions.users.first() || (args[0] && await message.client.users.fetch(args[0]).catch(() => null));

  if (!targetUser) {
    return message.reply('❌ **Cách dùng:** `*Punmute @user`');
  }

  const result = await MuteService.unmuteUser(targetUser.id, message.author.id);

  if (!result.success) {
    return message.reply('❌ Người này hiện không bị mute.');
  }

  await message.reply(`✅ Đã bỏ mute cho <@${targetUser.id}>.`);
}
