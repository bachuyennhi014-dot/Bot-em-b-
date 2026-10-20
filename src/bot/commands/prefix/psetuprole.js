/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoleConfigService } from '../../services/roleConfigService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';
import { CommandParser } from '../../utils/commandParser.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

const ROLE_KEY_MAP = {
  mod: { key: 'role_mod', label: 'Quản Trị Viên (Mod)' },
  mtt: { key: 'role_mtt', label: 'Mod Thực Tập (MTT)' },
  tranhcumod: { key: 'role_tranh_cu_mod', label: 'Tranh Cử Mod' },
  tranhcu: { key: 'role_tranh_cu_mod', label: 'Tranh Cử Mod' },
  nv: { key: 'role_nv', label: 'Nhân Viên Công Ty' },
  nvtt: { key: 'role_nvtt', label: 'Nhân Viên Thực Tập Công Ty' },
  tp: { key: 'role_tp', label: 'Trưởng Phòng Công Ty' },
  ct: { key: 'role_ct', label: 'Chủ Tịch Công Ty' },
  tk: { key: 'role_tk', label: 'Thư Kí Công Ty' }
};

export async function handlePsetuprole(message, args = [], forcedKey = null) {
  const userId = message.author.id;

  // Strict Admin check: user.id === "1402913586853974156"
  if (!ModService.isAdmin(userId)) {
    await MuteService.handleViolation({
      userId,
      command: forcedKey ? `*Psetuprole${forcedKey}` : '*Psetuprole',
      reason: 'Cố ý sử dụng lệnh setup role khi không phải Admin',
      punishmentDurationMinutes: 10
    });
    return message.reply(
      '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin tối cao của bot.\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!'
    );
  }

  if (!message.guild) {
    return message.reply('❌ Lệnh này chỉ sử dụng được trong server Discord.');
  }

  let roleKeyDef = null;
  let roleArg = null;

  if (forcedKey) {
    roleKeyDef = ROLE_KEY_MAP[forcedKey.toLowerCase()];
    roleArg = args[0];
  } else {
    // Syntax: *Psetuprole <key> <@role>
    const subKey = args[0]?.toLowerCase();
    roleKeyDef = ROLE_KEY_MAP[subKey];
    roleArg = args[1];
  }

  if (!roleKeyDef) {
    return message.reply(
      '❌ **Chức vụ không hợp lệ!**\n' +
      '• Các chức vụ được hỗ trợ: `mod`, `mtt`, `tranhcumod`, `nv`, `nvtt`, `tp`, `ct`, `tk`\n' +
      '• Ví dụ: `*Psetuprole mod @Mod` hoặc `*Psetuprolenv @Nhân Viên` hoặc `*Psetuprolect @Chủ Tịch`'
    );
  }

  const role = await CommandParser.resolveRole(message, roleArg);
  if (!role) {
    return message.reply(
      `❌ **Vui lòng gắn thẻ hoặc nhập ID của Role!**\n` +
      `• Ví dụ: \`*Psetuprole ${forcedKey || args[0]} @TênRole\``
    );
  }

  await RoleConfigService.setRole(message.guild.id, roleKeyDef.key, role.id);

  const embed = BotEmbeds.success(
    'THIẾT LẬP ROLE THÀNH CÔNG',
    `✅ **Cấu hình Role đã được lưu và cập nhật ngay lập tức!**\n\n` +
    `• **Chức vụ:** **${roleKeyDef.label}**\n` +
    `• **Role chỉ định:** <@&${role.id}> (\`${role.name}\`)\n` +
    `• Hệ thống thăng chức công ty, tranh cử mod và phân quyền sẽ tự động áp dụng role này.`
  );

  return message.reply({ embeds: [embed] });
}
