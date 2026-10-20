/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { botSupervisor } from '../../services/botSupervisor.js';
import { Guard } from '../../middleware/guard.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { config } from '../../config.js';

export async function handlePbatbot(message) {
  // Check Admin permission
  const isAdmin = Guard.isAdmin(message.author.id);
  if (!isAdmin) {
    await Guard.autoMuteForUnauthorized(message, 'lệnh bật bot');
    return;
  }

  try {
    await botSupervisor.startBot(message.author.id);

    const embed = BotEmbeds.success(
      'KÍCH HOẠT HOẠT ĐỘNG BOT 24/7',
      `▶️ Admin tối cao <@${config.BOT_ADMIN_ID}> đã kích hoạt bật lại Bot!\n\n` +
      `• Trạng thái: **ĐANG HOẠT ĐỘNG 24/7**\n` +
      `• Hệ thống tự động phục hồi và bảo toàn tiến trình người chơi đang chạy bình thường.`
    );

    await message.reply({ embeds: [embed] });
  } catch (err) {
    await message.reply(`❌ Lỗi: ${err.message}`);
  }
}
