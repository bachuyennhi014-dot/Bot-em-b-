/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Guard } from '../../middleware/guard.js';
import { ElectionService } from '../../services/electionService.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { EMOJIS, EMOJI_IDS, decorateTitle, getBottomDivider } from '../../config/emojis.js';

export async function handlePtochuctranhcumod(message) {
  // Only Admin
  const isAllowed = await Guard.requireAdmin(message, '*Ptochuctranhcumod');
  if (!isAllowed) return;

  if (!message.guild) {
    return await message.reply('❌ Lệnh này chỉ có thể sử dụng trong Server Discord.');
  }

  // Find notification channel or fallback to current channel
  const notifyChannelId = await RoleConfigService.getNotificationChannel(message.guild.id);
  let targetChannel = message.channel;
  if (notifyChannelId) {
    const ch = await message.guild.channels.fetch(notifyChannelId).catch(() => null);
    if (ch && ch.isTextBased()) {
      targetChannel = ch;
    }
  }

  // Create election in database
  const electionId = await ElectionService.createElection({
    guildId: message.guild.id,
    title: `Tranh Cử Mod Khóa Mới - Server ${message.guild.name}`,
    channelId: targetChannel.id,
    messageId: null
  });

  const embed = new EmbedBuilder()
    .setColor(0xf7c0e3)
    .setTitle(decorateTitle('ĐẠI HỘI BẦU CỬ QUẢN TRỊ VIÊN (MOD) CHÍNH THỨC BẮT ĐẦU!', 1))
    .setDescription(
      `Admin <@${message.author.id}> đã phát động đợt bầu cử Mod mới cho toàn thể server!\n\n` +
      `• **Điều kiện ứng cử viên:**\n` +
      `Phải sở hữu role **Tranh cử Mod** (Đạt cấp Chủ tịch và tích luỹ đủ 150 ca làm việc).\n\n` +
      `• **Phần thưởng người chiến thắng:**\n` +
      `Được tự động cấp role **Mod thực tập (MTT)** và tham gia đội ngũ ban quản trị server.\n\n` +
      `Bấm vào nút **Tranh cử** bên dưới để ghi danh tham gia, hoặc **Bỏ phiếu** để bình chọn cho ứng viên bạn tin tưởng!\n\n` +
      getBottomDivider(1)
    )
    .addFields(
      { name: 'Mã đợt bầu cử', value: `\`${electionId}\``, inline: true },
      { name: 'Trạng thái', value: 'Đang mở ghi danh & Bỏ phiếu', inline: true },
      { name: 'Danh sách ứng viên', value: '*Chưa có ứng viên nào ghi danh. Hãy là người đầu tiên!*', inline: false }
    )
    .setFooter({
      text: 'Ngọc Anh Nhã|helena19_05',
      iconURL: message.guild.iconURL?.({ dynamic: true }) || undefined
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`election_reg_${electionId}`)
      .setLabel('Tranh cử')
      .setEmoji(EMOJI_IDS.vuongMien)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`election_vote_${electionId}`)
      .setLabel('Bỏ phiếu')
      .setEmoji(EMOJI_IDS.sao7Mau)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`election_close_${electionId}`)
      .setLabel('Kết thúc & Công bố (Admin)')
      .setEmoji(EMOJI_IDS.x)
      .setStyle(ButtonStyle.Danger)
  );

  const sentMessage = await targetChannel.send({
    content: `@everyone ${EMOJIS.sao7Mau} **THÔNG BÁO QUAN TRỌNG: ĐẠI HỘI TRANH CỬ MOD ĐÃ MỞ!**`,
    embeds: [embed],
    components: [row]
  });

  if (targetChannel.id !== message.channel.id) {
    await message.reply(`${EMOJIS.check} Đã phát động đại hội tranh cử thành công tại kênh <#${targetChannel.id}>!`);
  }
}
