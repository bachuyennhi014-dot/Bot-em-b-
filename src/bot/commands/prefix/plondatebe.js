/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../../middleware/guard.js';
import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJI_IDS } from '../../config/emojis.js';

export async function handlePlondatebe(message) {
  // 1. Guard: Admin & Mod only (violators get auto-muted 10 mins)
  const isAllowed = await Guard.requireAdminOrMod(message, '*Plondatebe');
  if (!isAllowed) return;

  const fundStats = await EconomyService.getBotFund();

  const embed = BotEmbeds.botFund({
    balance: fundStats.balance,
    totalIncome: fundStats.totalIncome,
    totalWithdrawn: fundStats.totalWithdrawn,
    transactionCount: fundStats.transactionCount,
    guild: message.guild
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_withdraw_fund')
      .setLabel('Rút tiền quỹ')
      .setEmoji(EMOJI_IDS.pinkCreditCard)
      .setStyle(ButtonStyle.Danger)
  );

  await message.reply({ embeds: [embed], components: [row] });
}

