/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc, parseAmountShorthand } from '../../utils/timeParser.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePlixi(message, args) {
  if (!args || args.length === 0) {
    return await message.reply('❌ Cú pháp sai! Vui lòng dùng: `*Plixi <số kc>` (Hỗ trợ viết tắt như 100k, 5m, 1b; tối đa 10m).');
  }

  const amount = parseAmountShorthand(args[0]);
  if (!amount || amount <= 0) {
    return await message.reply('❌ Số kim cương lì xì không hợp lệ! Ví dụ: `*Plixi 500k`, `*Plixi 2m`, `*Plixi 10000000`.');
  }

  try {
    const res = await EconomyService.sendLixi({
      senderId: message.author.id,
      amount
    });

    const embed = BotEmbeds.success(
      'LÌ XÌ KIM CƯƠNG MAY MẮN',
      `🧧 ${EMOJIS.nohong} Người chơi <@${message.author.id}> vừa lì xì **${formatKc(res.amount)} ${EMOJIS.money} kc** cho cả phòng chat!\n\n` +
      `Chúc tất cả các thành viên trong server luôn may mắn và phát tài!\n` +
      `• Số dư ví còn lại: **${formatKc(res.remaining)} kc**\n` +
      `• Mã giao dịch: \`${res.txId}\``
    );

    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`❌ ${err.message}`);
  }
}
