/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyService } from '../../services/companyService.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc } from '../../utils/timeParser.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePlmvc(message, args) {
  let companyName = args.join(' ').replace(/^["']|["']$/g, '').trim();

  try {
    const res = await CompanyService.work({
      userId: message.author.id,
      companyName,
      guild: message.guild,
      checkCooldown: true
    });

    let desc = `${EMOJIS.pixelBunnie} <@${message.author.id}> vừa hoàn thành xuất sắc ca làm việc tại **${res.company.name}**!\n\n` +
      `• Lương nhận được: **+${formatKc(res.salary)} ${EMOJIS.money} kc** (đã cộng vào ví)\n` +
      `• Chi phí vận hành ca làm: **10.000.000 kc** theo hệ sinh thái công ty\n` +
      `• Chức vụ hiện tại: **${res.currentRank}** (Đã tích lũy: **${res.workCount}** ca làm)\n` +
      `• Cooldown tiếp theo: **5 giây** (<t:${Math.floor((Date.now() + 5 * 1000) / 1000)}:R>)`;

    if (res.promotionInfo) {
      desc += `\n\n🎉 ${EMOJIS.greenStar} **THĂNG CHỨC ĐỘT PHÁ!**\n` +
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
                `🎊 ${EMOJIS.kurominhay} Nhiệt liệt chúc mừng <@${message.author.id}> đã hoàn thành xuất sắc các ca làm việc và chính thức được bổ nhiệm làm **${res.promotionInfo.toName}** tại **${res.company.name}**!\n` +
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

    const embed = BotEmbeds.success('BÁO CÁO CA LÀM VIỆC THÀNH CÔNG', desc);
    return await message.reply({ embeds: [embed] });
  } catch (error) {
    return await message.reply(`❌ ${error.message}`);
  }
}
