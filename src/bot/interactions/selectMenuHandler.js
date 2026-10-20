/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CompanyService } from '../services/companyService.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { EMOJIS, EMOJI_IDS } from '../config/emojis.js';

export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;

  if (customId === 'select_company_to_join') {
    const selectedValue = interaction.values[0];
    if (!selectedValue || !selectedValue.startsWith('c_')) {
      return interaction.reply({ content: `${EMOJIS.x} Lựa chọn không hợp lệ.`, flags: 64 });
    }

    const companyId = parseInt(selectedValue.replace('c_', ''), 10);
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) {
      return interaction.reply({ content: `${EMOJIS.x} Công ty này không tồn tại hoặc đã ngừng hoạt động.`, flags: 64 });
    }

    const memberRow = await dbManager.get(
      'SELECT COUNT(*) as count FROM company_members WHERE company_id = ? AND status = ?;',
      [companyId, 'ACTIVE']
    );

    const embed = BotEmbeds.companyApplyConfirmEmbed(company, memberRow?.count || 0, interaction.guild);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_confirm_apply_cty:${company.id}`)
        .setLabel('Xác nhận xin vào')
        .setEmoji(EMOJI_IDS.check)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_cancel_apply_cty')
        .setLabel('Hủy')
        .setEmoji(EMOJI_IDS.x)
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }
}

