/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';

export async function handlePvaocty(message, args) {
  let companyName = args.join(' ').replace(/^["']|["']$/g, '').trim();
  if (!companyName) {
    companyName = 'Công ty lốp trưởng'; // Default company
  }

  try {
    const result = await CompanyService.joinCompany({
      userId: message.author.id,
      companyName,
      guild: message.guild
    });

    const embed = BotEmbeds.success(
      'GIA NHẬP CÔNG TY THÀNH CÔNG',
      `🎉 Chúc mừng <@${message.author.id}> đã trở thành **Nhân viên thực tập (NVTT)** của **${result.company.name}**!\n\n` +
      `• Phí gia nhập: **-${formatKc(result.entryFee)} kc**\n` +
      `• Lương mỗi ca làm việc: **${formatKc(result.company.work_salary_min)} – ${formatKc(result.company.work_salary_max)} kc**\n` +
      `• Lương ngày (00:00): **+${formatKc(result.company.daily_salary)} kc/ngày**\n\n` +
      `📌 Gõ \`*Plam\` để bắt đầu ca làm việc và tích lũy số lần làm để thăng chức lên **Nhân viên (20 lần)**, **Trưởng phòng (40 lần)**, **Thư kí (50 lần)**, **Chủ tịch (60 lần)**!`
    );

    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ ${error.message}`);
  }
}
