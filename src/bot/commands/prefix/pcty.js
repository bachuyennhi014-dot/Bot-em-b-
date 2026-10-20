/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EMOJIS, EMOJI_IDS } from '../../config/emojis.js';

export async function handlePcty(message) {
  try {
    const companies = await CompanyService.listCompanies();
    const embed = BotEmbeds.companyListEmbed(companies, message.guild);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_open_company_select')
        .setLabel('Xem danh sách công ty')
        .setEmoji(EMOJI_IDS.ribbon3)
        .setStyle(ButtonStyle.Primary)
    );

    return await message.reply({ embeds: [embed], components: [row] });
  } catch (err) {
    return await message.reply(`${EMOJIS.x} ${err.message}`);
  }
}

