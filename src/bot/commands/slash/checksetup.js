/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommandBuilder } from 'discord.js';
import { buildSetupEmbed } from '../prefix/pchecksetup.js';

export const data = new SlashCommandBuilder()
  .setName('checksetup')
  .setDescription('Xem toàn bộ cấu hình kênh, role, order và thông báo hiện tại của Server');

export async function execute(interaction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: '❌ Lệnh này chỉ sử dụng được trong Server.',
      flags: 64
    });
  }

  const embed = await buildSetupEmbed(interaction.guild);
  return interaction.reply({ embeds: [embed] });
}
