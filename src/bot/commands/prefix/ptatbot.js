/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { botSupervisor } from '../../services/botSupervisor.js';
import { Guard } from '../../middleware/guard.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { config } from '../../config.js';

export async function handlePtatbot(message) {
  // Check Admin permission
  const isAdmin = Guard.isAdmin(message.author.id);
  if (!isAdmin) {
    await Guard.autoMuteForUnauthorized(message, 'lệnh tắt bot');
    return;
  }

  try {
    const embed = BotEmbeds.success(
      'TẠM DỪNG HOẠT ĐỘNG BOT',
      `🛑 Theo chỉ thị từ Admin tối cao <@${config.BOT_ADMIN_ID}>, Bot đang tiến hành lưu toàn bộ tiến trình người chơi và tạm dừng kết nối.\n\n` +
      `• Trạng thái: **ĐÃ TẮT BỞI ADMIN**\n` +
      `• Mọi dữ liệu đã được lưu an toàn vào cơ sở dữ liệu.\n` +
      `• Chỉ duy nhất Admin tối cao mới có thể bật lại bot bằng lệnh \`*Pbatbot\`.`
    );

    await message.reply({ embeds: [embed] });

    // Gracefully stop bot
    setTimeout(async () => {
      await botSupervisor.stopBot(message.author.id);
    }, 1500);
  } catch (err) {
    await message.reply(`❌ Lỗi: ${err.message}`);
  }
}
