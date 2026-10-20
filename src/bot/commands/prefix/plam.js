/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyService } from '../../services/companyService.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';

export async function handlePlam(message, args) {
  let companyName = args.join(' ').replace(/^["']|["']$/g, '').trim();

  try {
    const res = await CompanyService.work({
      userId: message.author.id,
      companyName,
      guild: message.guild
    });

    let desc = `💼 <@${message.author.id}> vừa hoàn thành một ca làm việc tại **${res.company.name}**!\n\n` +
      `• Lương nhận được: **+${formatKc(res.salary)} kc** (đã cộng vào ví)\n` +
      `• Chi phí vận hành ca làm: **10.000.000 kc** theo hệ thống công ty\n` +
      `• Chức vụ hiện tại: **${res.currentRank}** (Đã tích luỹ: **${res.workCount}** ca làm)`;

    if (res.promotionInfo) {
      desc += `\n\n🎉 **THĂNG CHỨC ĐỘT PHÁ!**\n` +
        `Chúc mừng bạn đã được thăng chức lên **${res.promotionInfo.toName}**!\n` +
        `🎁 Thưởng nóng thăng chức: **+${formatKc(res.promotionInfo.bonus)} kc** vào ví!`;

      // Broadcast to notification channel if configured
      if (message.guild) {
        try {
          const notifyChannelId = await RoleConfigService.getNotificationChannel(message.guild.id);
          if (notifyChannelId) {
            const ch = await message.guild.channels.fetch(notifyChannelId).catch(() => null);
            if (ch && ch.isTextBased()) {
              const promoEmbed = BotEmbeds.success(
                'VINH DANH THĂNG CHỨC',
                `🎊 Nhiệt liệt chúc mừng <@${message.author.id}> đã xuất sắc hoàn thành xuất sắc các ca làm việc và chính thức được bổ nhiệm làm **${res.promotionInfo.toName}** tại **${res.company.name}**!\n` +
                `💰 Tiền thưởng vinh danh: **+${formatKc(res.promotionInfo.bonus)} kc**.`
              );
              await ch.send({ embeds: [promoEmbed] }).catch(() => {});
            }
          }
        } catch (e) {
          // ignore notification broadcast error
        }
      }
    }

    const embed = BotEmbeds.success('BÁO CÁO CA LÀM VIỆC', desc);
    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ ${error.message}`);
  }
}
