/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';

export async function handlePtaocty(message, args) {
  // Only Admin
  const isAllowed = await Guard.requireAdmin(message, '*Ptaocty');
  if (!isAllowed) return;

  // Cú pháp: *Ptaocty <tên> <phí vào> <lương làm> <lương ngày>
  // Example: *Ptaocty "Công ty ABC" 100000 5000 2500
  if (args.length < 4) {
    return await message.reply(
      '❌ Cú pháp: `*Ptaocty <tên công ty> <phí vào> <lương làm> <lương ngày>`\n' +
      'Ví dụ: `*Ptaocty "Công ty xe hơi" 100000 5000 2500`'
    );
  }

  // Parse numbers from the end
  const fullText = args.join(' ');
  const matches = fullText.match(/^(?:"([^"]+)"|(.+?))\s+(\d[\d.,_]*)\s+(\d[\d.,_]*)\s+(\d[\d.,_]*)$/);

  if (!matches) {
    return await message.reply('❌ Định dạng thông số công ty không hợp lệ! Vui lòng kiểm tra lại tên và các con số.');
  }

  const name = (matches[1] || matches[2]).trim();
  const entryFee = parseInt(matches[3].replace(/[.,_]/g, ''), 10);
  const workSalary = parseInt(matches[4].replace(/[.,_]/g, ''), 10);
  const dailySalary = parseInt(matches[5].replace(/[.,_]/g, ''), 10);

  try {
    const cty = await CompanyService.createCompany({
      name,
      entryFee,
      workMin: Math.floor(workSalary * 0.5) || 1000,
      workMax: workSalary,
      dailySalary,
      guildId: message.guild?.id || 'GLOBAL',
      createdBy: message.author.id
    });

    const embed = BotEmbeds.success(
      'THÀNH LẬP CÔNG TY THÀNH CÔNG',
      `🏢 Đã tạo thành công công ty: **${cty.name}**\n\n` +
      `• Phí gia nhập: **${formatKc(cty.entry_fee)} kc**\n` +
      `• Lương mỗi ca làm: **${formatKc(cty.work_salary_min)} – ${formatKc(cty.work_salary_max)} kc**\n` +
      `• Lương ngày (00:00 hàng ngày): **${formatKc(cty.daily_salary)} kc**\n` +
      `• Chi phí vận hành mỗi ca: **10.000.000 kc** theo hệ thống công ty`
    );

    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ Lỗi: ${error.message}`);
  }
}
