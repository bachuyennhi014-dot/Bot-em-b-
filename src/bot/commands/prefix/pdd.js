/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePdd(message) {
  try {
    const res = await EconomyService.dailyCheckin(message.author.id);
    const embed = BotEmbeds.success(
      'ĐIỂM DANH HÀNG NGÀY THÀNH CÔNG',
      `${EMOJIS.cinnanhay} Chúc mừng <@${message.author.id}> đã điểm danh ngày hôm nay (**${res.today}**)!\n\n` +
      `• Thưởng điểm danh: **+${formatKc(res.reward)} ${EMOJIS.money} kc** (đã chuyển vào ví)\n` +
      `• Chuỗi điểm danh liên tiếp: **${res.streak} ngày** 🔥\n` +
      `• Lần điểm danh tiếp theo: Sau 00:00 ngày mai!`
    );
    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`❌ ${err.message}`);
  }
}
