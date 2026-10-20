/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';

export const data = new SlashCommandBuilder()
  .setName('odersetup')
  .setDescription('Thiết lập kênh Order và Role Khách hàng (Chỉ Admin)')
  .addChannelOption((option) =>
    option
      .setName('kenh')
      .setDescription('Kênh chỉ định cho phép khách hàng order')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addRoleOption((option) =>
    option
      .setName('role')
      .setDescription('Role khách hàng được phép order')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;

  // Strict Admin check: user.id === "1402913586853974156"
  if (!ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '/odersetup',
      reason: 'Cố ý sử dụng slash command /odersetup khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return interaction.reply({
      content: '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin duy nhất của bot.\n⚠️ Tài khoản của bạn đã bị **MUTE BOT 10 PHÚT**!',
      flags: 64
    });
  }

  const channel = interaction.options.getChannel('kenh');
  const role = interaction.options.getRole('role');

  await ConfigService.setOrderSetup(interaction.guildId, channel.id, role.id);

  await interaction.reply({
    content: `✅ **Thiết lập Order thành công!**\n• Kênh Order: <#${channel.id}>\n• Role Khách hàng: <@&${role.id}>`,
    flags: 64
  });
}
