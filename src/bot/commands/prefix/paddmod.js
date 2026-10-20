/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { ModService } from '../../services/modService.js';

export async function handlePaddmod(message, args) {
  // 1. Guard: STRICTLY Bot Admin (1402913586853974156) only
  const isAllowed = await Guard.requireStrictAdmin(message, '*Paddmod');
  if (!isAllowed) return;

  const targetUser = message.mentions.users.first() || (args[0] && await message.client.users.fetch(args[0]).catch(() => null));

  if (!targetUser) {
    return message.reply('❌ **Cách dùng:** `*Paddmod @user`');
  }

  const result = await ModService.addMod(targetUser.id, message.author.id);

  if (!result.success && result.reason === 'ALREADY_MOD') {
    return message.reply('❌ Người này đã là Mod.');
  }

  await message.reply(`✅ Đã thêm <@${targetUser.id}> làm Mod.`);
}
