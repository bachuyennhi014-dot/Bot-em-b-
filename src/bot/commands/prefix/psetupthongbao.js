/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoleConfigService } from '../../services/roleConfigService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';
import { CommandParser } from '../../utils/commandParser.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePsetupthongbao(message, args = []) {
  const userId = message.author.id;

  // Strict Admin check: user.id === "1402913586853974156"
  if (!ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '*Psetupthongbao',
      reason: 'Cố ý sử dụng lệnh setup thông báo khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return message.reply(
      '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin tối cao của bot.\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!'
    );
  }

  if (!message.guild) {
    return message.reply('❌ Lệnh này chỉ sử dụng được trong server Discord.');
  }

  // Syntax: *Psetupthongbao <#channel|channelId>
  const channelArg = args[0];
  const channel = await CommandParser.resolveChannel(message, channelArg);

  if (!channel) {
    return message.reply(
      '❌ **Cú pháp chưa đúng!**\n' +
      '• Cách dùng: `*Psetupthongbao <#kênh>`\n' +
      '• Ví dụ: `*Psetupthongbao #thong-bao` hoặc dùng Slash: `/setupthongbao`'
    );
  }

  await RoleConfigService.setNotificationChannel(message.guild.id, channel.id);

  const embed = BotEmbeds.success(
    'THIẾT LẬP KÊNH THÔNG BÁO THÀNH CÔNG',
    `✅ **Kênh thông báo sự kiện đã được lưu an toàn vào cơ sở dữ liệu!**\n\n` +
    `• **Kênh phát sóng chính thức:** <#${channel.id}> (\`${channel.name}\`)\n` +
    `• Mọi sự kiện quan trọng (bầu cử Mod, thăng chức công ty, vinh danh...) sẽ được tự động gửi tại đây.`
  );

  return message.reply({ embeds: [embed] });
}
