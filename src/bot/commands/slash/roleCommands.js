/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommandBuilder } from 'discord.js';
import { RoleConfigService } from '../../services/roleConfigService.js';
import { ModService } from '../../services/modService.js';
import { MuteService } from '../../services/muteService.js';

function createRoleSlashCommand(name, description, roleKey, roleLabel) {
  const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(`${description} (Chỉ Admin)`)
    .addRoleOption((option) =>
      option.setName('role').setDescription(`Role chỉ định cho ${roleLabel}`).setRequired(true)
    );

  async function execute(interaction) {
    const userId = interaction.user.id;
    if (!ModService.isAdmin(userId)) {
      await MuteService.handleViolation({
        userId,
        command: `/${name}`,
        reason: `Cố ý sử dụng slash command /${name} khi không phải Admin`,
        punishmentDurationMinutes: 10
      });
      return interaction.reply({
        content: '❌ **Từ chối quyền:** Lệnh này chỉ dành riêng cho Admin duy nhất của bot.\n⚠️ Bạn đã bị **MUTE BOT 10 PHÚT**!',
        flags: 64
      });
    }

    const role = interaction.options.getRole('role');
    await RoleConfigService.setRole(interaction.guildId, roleKey, role.id);

    return interaction.reply({
      content: `✅ **Thiết lập Role thành công!**\n• Chức vụ: **${roleLabel}**\n• Role gán: <@&${role.id}> (\`${role.name}\`)`,
      flags: 64
    });
  }

  return { data, execute };
}

export const modCmd = createRoleSlashCommand('setuprolemod', 'Thiết lập Role Mod Quản Trị', 'role_mod', 'Mod');
export const mttCmd = createRoleSlashCommand('setuprolemtt', 'Thiết lập Role Mod Thực Tập', 'role_mtt', 'Mod thực tập');
export const tranhcuCmd = createRoleSlashCommand('setuproletranhcumod', 'Thiết lập Role Tranh Cử Mod', 'role_tranh_cu_mod', 'Role được tranh cử Mod');
export const nvCmd = createRoleSlashCommand('setuprolenv', 'Thiết lập Role Nhân Viên công ty', 'role_nv', 'Nhân viên');
export const nvttCmd = createRoleSlashCommand('setuprolenvtt', 'Thiết lập Role Nhân Viên Thực Tập', 'role_nvtt', 'Nhân viên thực tập');
export const tpCmd = createRoleSlashCommand('setuproletp', 'Thiết lập Role Trưởng Phòng công ty', 'role_tp', 'Trưởng phòng');
export const ctCmd = createRoleSlashCommand('setuprolect', 'Thiết lập Role Chủ Tịch công ty', 'role_ct', 'Chủ tịch');
export const tkCmd = createRoleSlashCommand('setuproletk', 'Thiết lập Role Thư Kí công ty', 'role_tk', 'Thư kí');
