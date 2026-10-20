/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder } from 'discord.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { config } from '../../config.js';
import { EMOJIS, decorateTitle, getBottomDivider } from '../../config/emojis.js';

export async function buildSetupEmbed(guild) {
  const configs = await RoleConfigService.getAllConfigs(guild.id);
  const roles = configs.roles || {};

  const formatChannel = (id) => (id ? `${EMOJIS.check} <#${id}>` : `${EMOJIS.x} *Chưa thiết lập*`);
  const formatRole = (id) => (id ? `${EMOJIS.check} <@&${id}>` : `${EMOJIS.x} *Chưa thiết lập*`);

  const embed = new EmbedBuilder()
    .setColor(0xf7c0e3)
    .setTitle(decorateTitle(`BẢNG TỔNG HỢP CẤU HÌNH SERVER — ${guild.name}`, 0))
    .setDescription(
      `Toàn bộ thiết lập bên dưới được lưu trữ vĩnh viễn trong SQLite và tự động bảo toàn 24/7.\n` +
      `Admin có thể cài đặt bằng **Slash Command** (\`/...\`) hoặc **Lệnh Prefix** (\`${config.PREFIX}...\`).\n\n` +
      getBottomDivider(0)
    )
    .addFields(
      {
        name: `${EMOJIS.num1} Hệ Thống Order & Mua Sắm`,
        value:
          `• Kênh Order: ${formatChannel(configs.orderChannelId)}\n` +
          `• Role Khách hàng: ${formatRole(configs.customerRoleId)}\n` +
          `*(Cài đặt: \`${config.PREFIX}odersetup #kênh @role\` hoặc \`/odersetup\`)*`,
        inline: false
      },
      {
        name: `${EMOJIS.num2} Hệ Thống Nhận Đơn & Duyệt Hàng`,
        value:
          `• Kênh nhận đơn: ${formatChannel(configs.receiveOrderChannelId)}\n` +
          `• Role Nhân viên duyệt: ${formatRole(configs.staffRoleId)}\n` +
          `*(Cài đặt: \`${config.PREFIX}setupnhandon #kênh @role\` hoặc \`/setupnhandon\`)*`,
        inline: false
      },
      {
        name: `${EMOJIS.num3} Kênh Thông Báo Sự Kiện`,
        value:
          `• Kênh phát sóng: ${formatChannel(configs.notificationChannelId)}\n` +
          `*(Cài đặt: \`${config.PREFIX}setupthongbao #kênh\` hoặc \`/setupthongbao\`)*`,
        inline: false
      },
      {
        name: `${EMOJIS.num4} Kênh Duyệt Đơn Xin Việc Công Ty`,
        value:
          `• Kênh nhận đơn: ${formatChannel(configs.companyReviewChannelId)}\n` +
          `*(Cài đặt: \`${config.PREFIX}setupcty #kênh\` hoặc \`/setupcty\`)*`,
        inline: false
      },
      {
        name: `${EMOJIS.num5} Role Quản Trị & Bầu Cử Mod`,
        value:
          `• Role Mod: ${formatRole(roles.role_mod)}\n` +
          `• Role Mod thực tập (MTT): ${formatRole(roles.role_mtt)}\n` +
          `• Role Tranh cử Mod: ${formatRole(roles.role_tranh_cu_mod)}\n` +
          `*(Cài đặt: \`${config.PREFIX}setuprole mod|mtt|tranhcu @role\` hoặc \`/setuprole...\`)*`,
        inline: false
      },
      {
        name: `${EMOJIS.sparkle10} Role Chức Vụ Công Ty & Thăng Cấp`,
        value:
          `• Chủ tịch (CT) [Có quyền duyệt đơn]: ${formatRole(roles.role_ct)}\n` +
          `• Thư kí (TK) [Có quyền duyệt đơn]: ${formatRole(roles.role_tk)}\n` +
          `• Trưởng phòng (TP): ${formatRole(roles.role_tp)}\n` +
          `• Nhân viên (NV): ${formatRole(roles.role_nv)}\n` +
          `• Nhân viên thực tập (NVTT): ${formatRole(roles.role_nvtt)}\n` +
          `*(Cài đặt: \`${config.PREFIX}setuprole ct|tk|tp|nv|nvtt @role\`)*`,
        inline: false
      }
    )
    .setFooter({
      text: 'Ngọc Anh Nhã|helena19_05',
      iconURL: guild.iconURL?.({ dynamic: true }) || undefined
    });

  return embed;
}

export async function handlePchecksetup(message) {
  if (!message.guild) {
    return message.reply(`${EMOJIS.x} Lệnh này chỉ có thể sử dụng trong Server Discord.`);
  }

  const embed = await buildSetupEmbed(message.guild);
  return message.reply({ embeds: [embed] });
}
