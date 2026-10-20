/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BotEmbeds } from '../../utils/embedBuilder.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJI_IDS } from '../../config/emojis.js';

export async function handlePhelp(message) {
  const embed = BotEmbeds.helpMenu(message.guild);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_view_game')
      .setLabel('Lệnh Chơi Game')
      .setEmoji(EMOJI_IDS.sparkle10)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('help_view_admin')
      .setLabel('Lệnh Admin & Mod 🔒')
      .setEmoji(EMOJI_IDS.vuongMien)
      .setStyle(ButtonStyle.Primary)
  );

  return await message.reply({ embeds: [embed], components: [row] });
}

