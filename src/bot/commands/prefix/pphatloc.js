/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc, parseAmountShorthand } from '../../utils/timeParser.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS, EMOJI_IDS } from '../../config/emojis.js';

export async function handlePphatloc(message, args) {
  if (!args || args.length === 0) {
    return await message.reply(`${EMOJIS.x} Cú pháp sai! Vui lòng dùng: \`*Pphatloc <số kc>\` (Tối đa 1m; hỗ trợ 100k, 500k, 1m).`);
  }

  const amount = parseAmountShorthand(args[0]);
  if (!amount || amount <= 0) {
    return await message.reply(`${EMOJIS.x} Số kim cương phát lộc không hợp lệ! Ví dụ: \`*Pphatloc 200k\`, \`*Pphatloc 1m\`.`);
  }

  try {
    const res = await EconomyService.createPhatloc({
      creatorId: message.author.id,
      guildId: message.guild?.id || 'GLOBAL',
      channelId: message.channel.id,
      amount
    });

    const embed = BotEmbeds.phatlocEmbed({
      giveawayId: res.giveawayId,
      creatorTag: message.author.tag || message.author.username,
      creatorId: message.author.id,
      amount: res.amount,
      guild: message.guild
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_phatloc:${res.giveawayId}`)
        .setLabel('Nhận lộc ngay!')
        .setEmoji(EMOJI_IDS.sparkle10)
        .setStyle(ButtonStyle.Success)
    );

    return await message.reply({ embeds: [embed], components: [row] });
  } catch (err) {
    return await message.reply(`${EMOJIS.x} ${err.message}`);
  }
}

