/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigService } from '../../services/configService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';
import { CommandParser } from '../../utils/commandParser.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePsetupnhandon(message, args = []) {
  const userId = message.author.id;

  // Strict Admin check: user.id === "1402913586853974156"
  if (!ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '*Psetupnhandon',
      reason: 'Cố ý sử dụng lệnh setup nhận đơn khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return message.reply(
      '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin tối cao của bot.\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!'
    );
  }

  if (!message.guild) {
    return message.reply('❌ Lệnh này chỉ sử dụng được trong server Discord.');
  }

  // Syntax: *Psetupnhandon <#channel|channelId> <@role|roleId>
  const channelArg = args[0];
  const roleArg = args[1];

  const channel = await CommandParser.resolveChannel(message, channelArg);
  const role = await CommandParser.resolveRole(message, roleArg);

  if (!channel || !role) {
    return message.reply(
      '❌ **Cú pháp chưa đúng!**\n' +
      '• Cách dùng: `*Psetupnhandon <#kênh> <@role>`\n' +
      '• Ví dụ: `*Psetupnhandon #tiep-nhan-don @Nhân Viên` hoặc dùng Slash: `/setupnhandon`'
    );
  }

  await ConfigService.setReceiveOrderSetup(message.guild.id, channel.id, role.id);

  const embed = BotEmbeds.success(
    'THIẾT LẬP KÊNH NHẬN ĐƠN THÀNH CÔNG',
    `✅ **Cấu hình Nhận Đơn đã được lưu vào cơ sở dữ liệu và có hiệu lực ngay lập tức!**\n\n` +
    `• **Kênh nhận đơn mới:** <#${channel.id}> (\`${channel.name}\`)\n` +
    `• **Role Nhân viên duyệt/từ chối đơn:** <@&${role.id}> (\`${role.name}\`)\n` +
    `• Mọi đơn hàng từ \`*Poder\` sẽ được gửi thẳng vào <#${channel.id}> để nhân viên xử lý.`
  );

  return message.reply({ embeds: [embed] });
}
