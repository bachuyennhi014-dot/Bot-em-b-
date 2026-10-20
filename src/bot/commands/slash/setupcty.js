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
  .setName('setupcty')
  .setDescription('Thiết lập kênh nhận và duyệt đơn xin vào công ty (Chỉ Admin 1402913586853974156)')
  .addChannelOption((option) =>
    option
      .setName('kenh')
      .setDescription('Kênh văn bản nhận đơn xin vào công ty để Thư kí/Chủ tịch xét duyệt')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;

  if (userId !== config.BOT_ADMIN_ID && !ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '/setupcty',
      reason: 'Cố ý dùng slash command /setupcty khi không phải Admin tối cao',
      punishmentDurationMinutes: 10
    });
    return interaction.reply({
      content: `❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin duy nhất của bot (<@${config.BOT_ADMIN_ID}>).\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!`,
      flags: 64
    });
  }

  const channel = interaction.options.getChannel('kenh');
  await RoleConfigService.setCompanyReviewChannel(interaction.guildId, channel.id);
  dbManager.saveToDisk();

  return interaction.reply({
    content: `✅ **Thiết lập kênh duyệt đơn công ty thành công!**\n• Kênh tiếp nhận đơn: <#${channel.id}>\nTất cả hồ sơ xin vào công ty sẽ được gửi về đây để **Thư kí** (setup bằng \`/setuproletk\`) hoặc **Chủ tịch** (setup bằng \`/setuprolect\`) xét duyệt.`,
    flags: 64
  });
}
