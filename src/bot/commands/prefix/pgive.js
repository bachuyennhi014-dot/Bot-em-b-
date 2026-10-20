/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc, parseAmountShorthand } from '../../utils/timeParser.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePgive(message, args) {
  const mention = message.mentions.users.first();
  if (!mention || args.length < 2) {
    return await message.reply('❌ Cú pháp sai! Vui lòng dùng: `*Pgive @user <số kc>` (Hỗ trợ viết tắt 100k, 5m, 1b).');
  }

  // Find amount from args (skip the mention arg)
  const amountStr = args.find(a => !a.startsWith('<@') && !a.endsWith('>'));
  if (!amountStr) {
    return await message.reply('❌ Vui lòng nhập số kim cương muốn chuyển! Ví dụ: `*Pgive @user 500k`.');
  }

  const amount = parseAmountShorthand(amountStr);
  if (!amount || amount <= 0) {
    return await message.reply('❌ Số kim cương chuyển không hợp lệ.');
  }

  try {
    const res = await EconomyService.transferMoney({
      senderId: message.author.id,
      receiverId: mention.id,
      amount
    });

    const embed = BotEmbeds.success(
      'CHUYỂN KIM CƯƠNG THÀNH CÔNG',
      `${EMOJIS.pinkHeart} <@${message.author.id}> đã chuyển thành công **${formatKc(res.amount)} ${EMOJIS.money} kc** cho <@${mention.id}>!\n\n` +
      `• Số dư ví còn lại của bạn: **${formatKc(res.senderRemaining)} kc**\n` +
      `• Mã giao dịch: \`${res.txId}\``
    );

    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`❌ ${err.message}`);
  }
}
