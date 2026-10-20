/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePvi(message) {
  try {
    const stats = await EconomyService.getWalletStats(message.author.id);
    const embed = BotEmbeds.walletStatsEmbed(stats, message.author.tag || message.author.username, message.guild);
    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`${EMOJIS.x} ${err.message}`);
  }
}

// Backwards compatibility alias
export const handleMvi = handlePvi;
