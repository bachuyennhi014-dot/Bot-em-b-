/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { dbManager } from '../../database/db.js';

export async function handlePsetupcty(message, args) {
  // Only Admin
  const isAllowed = await Guard.requireAdmin(message, '*Psetupcty');
  if (!isAllowed) return;

  const channel = message.mentions.channels.first();
  if (!channel) {
    return await message.reply('❌ Vui lòng tag một kênh văn bản hợp lệ. Cú pháp: `*Psetupcty #kênh`');
  }

  await RoleConfigService.setCompanyReviewChannel(message.guild.id, channel.id);
  dbManager.saveToDisk();

  const embed = BotEmbeds.success(
    'CÀI ĐẶT KÊNH DUYỆT ĐƠN CÔNG TY THÀNH CÔNG',
    `🏢 Kênh duyệt hồ sơ xin vào công ty đã được gán cho: <#${channel.id}>\n\n` +
    `• Đơn xin vào công ty từ lệnh \`*Pcty\` sẽ tự động được gửi về kênh này.\n` +
    `• Người có **Role Thư kí** (\`/setuproletk\`) hoặc **Role Chủ tịch** (\`/setuprolect\`) sẽ có quyền bấm **[✅ DUYỆT ĐƠN]** hoặc **[❌ TỪ CHỐI]**.`
  );

  return await message.reply({ embeds: [embed] });
}
