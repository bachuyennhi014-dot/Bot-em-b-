/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';
import { config } from '../../config.js';
import { dbManager } from '../../database/db.js';

export const data = new SlashCommandBuilder()
  .setName('setupthongbao')
  .setDescription('Thiết lập kênh thông báo các sự kiện quan trọng (Chỉ Admin 1402913586853974156)')
  .addChannelOption((option) =>
    option
      .setName('kenh')
      .setDescription('Chọn kênh nhận thông báo sự kiện, tranh cử, thăng chức, công ty...')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;

  if (userId !== config.BOT_ADMIN_ID && !ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '/setupthongbao',
      reason: 'Cố ý sử dụng slash command /setupthongbao khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return interaction.reply({
      content: `❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin duy nhất của bot (<@${config.BOT_ADMIN_ID}>).\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!`,
      flags: 64
    });
  }

  const channel = interaction.options.getChannel('kenh');
  await RoleConfigService.setNotificationChannel(interaction.guildId, channel.id);
  dbManager.saveToDisk();

  return interaction.reply({
    content: `✅ **Thiết lập kênh thông báo thành công cho server!**\n• Kênh thông báo chính thức: <#${channel.id}>\nCác sự kiện quan trọng (bầu cử, thăng chức, bảng vinh danh...) sẽ được tự động phát sóng tại đây.`,
    flags: 64
  });
}
