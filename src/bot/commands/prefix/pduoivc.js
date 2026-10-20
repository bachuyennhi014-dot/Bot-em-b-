/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePduoivc(message, args) {
  // Only Admin
  const isAllowed = await Guard.requireAdmin(message, '*Pduoivc');
  if (!isAllowed) return;

  // Cú pháp: *Pduoivc @user <tên công ty>
  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    return await message.reply('❌ Vui lòng tag nhân viên cần đuổi việc. Cú pháp: `*Pduoivc @user <tên công ty>`.');
  }

  // Extract company name
  const withoutUser = args.filter(a => !a.startsWith('<@')).join(' ').replace(/^["']|["']$/g, '').trim();
  const companyName = withoutUser || 'Công ty lốp trưởng';

  try {
    await CompanyService.fireEmployee({
      userId: targetUser.id,
      companyName,
      adminId: message.author.id,
      guild: message.guild
    });

    const embed = BotEmbeds.success(
      'SA THẢI NHÂN VIÊN THÀNH CÔNG',
      `💼 Nhân viên <@${targetUser.id}> đã bị sa thải khỏi công ty **${companyName}** bởi Admin.\n` +
      `Toàn bộ quyền hạn và role công ty liên quan đã được thu hồi và lưu vào nhật ký kiểm toán.`
    );

    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ Lỗi: ${error.message}`);
  }
}
