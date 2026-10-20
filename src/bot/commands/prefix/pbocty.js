/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';

export async function handlePbocty(message, args) {
  // Only Admin
  const isAllowed = await Guard.requireAdmin(message, '*Pbocty');
  if (!isAllowed) return;

  const companyName = args.join(' ').replace(/^["']|["']$/g, '').trim();
  if (!companyName) {
    return await message.reply('❌ Vui lòng nhập tên công ty cần giải thể. Cú pháp: `*Pbocty <tên công ty>`.');
  }

  try {
    const result = await CompanyService.disbandCompany({
      name: companyName,
      adminId: message.author.id,
      guild: message.guild
    });

    const embed = BotEmbeds.success(
      'GIẢI THỂ CÔNG TY HOÀN TẤT',
      `🏢 Đã giải thể thành công công ty: **${result.company.name}**\n\n` +
      `• Chi phí giải thể quy định: **100.000.000 kc**\n` +
      `• Số lượng nhân viên được nhận bồi thường: **${result.membersCount} người**\n` +
      `• Khoản tiền chia cho mỗi nhân viên: **${formatKc(result.payoutPerMember)} kc**\n` +
      `• Toàn bộ role chức vụ công ty đã được thu hồi và lưu log kiểm toán.`
    );

    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ Lỗi: ${error.message}`);
  }
}
