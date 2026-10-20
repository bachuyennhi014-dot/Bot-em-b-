/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigService } from '../../services/configService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';
import { CommandParser } from '../../utils/commandParser.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePodersetup(message, args = []) {
  const userId = message.author.id;

  // Strict Admin check: user.id === "1402913586853974156"
  if (!ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: '*Podersetup',
      reason: 'Cố ý sử dụng lệnh setup order khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return message.reply(
      '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin tối cao của bot.\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!'
    );
  }

  if (!message.guild) {
    return message.reply('❌ Lệnh này chỉ sử dụng được trong server Discord.');
  }

  // Syntax: *Podersetup <#channel|channelId> <@role|roleId>
  const channelArg = args[0];
  const roleArg = args[1];

  const channel = await CommandParser.resolveChannel(message, channelArg);
  const role = await CommandParser.resolveRole(message, roleArg);

  if (!channel || !role) {
    return message.reply(
      '❌ **Cú pháp chưa đúng!**\n' +
      '• Cách dùng: `*Podersetup <#kênh> <@role>`\n' +
      '• Ví dụ: `*Podersetup #order-food @Khách Hàng` hoặc dùng Slash: `/odersetup`'
    );
  }

  await ConfigService.setOrderSetup(message.guild.id, channel.id, role.id);

  const embed = BotEmbeds.success(
    'THIẾT LẬP KÊNH ORDER THÀNH CÔNG',
    `✅ **Cấu hình Order đã được lưu vào cơ sở dữ liệu và có hiệu lực ngay lập tức!**\n\n` +
    `• **Kênh Order chỉ định:** <#${channel.id}> (\`${channel.name}\`)\n` +
    `• **Role Khách hàng được phép:** <@&${role.id}> (\`${role.name}\`)\n` +
    `• Lệnh đặt hàng: \`*Poder\` (Chỉ được gõ tại <#${channel.id}>)`
  );

  return message.reply({ embeds: [embed] });
}
