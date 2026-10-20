/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { data as odersetupData } from './commands/slash/odersetup.js';
import { data as setupnhandonData } from './commands/slash/setupnhandon.js';
import { data as setupthongbaoData } from './commands/slash/setupthongbao.js';
import { data as setupctyData } from './commands/slash/setupcty.js';
import { data as checksetupData } from './commands/slash/checksetup.js';
import {
  modCmd,
  mttCmd,
  tranhcuCmd,
  nvCmd,
  nvttCmd,
  tpCmd,
  ctCmd,
  tkCmd
} from './commands/slash/roleCommands.js';
import { Logger } from './utils/logger.js';

export function extractClientIdFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[0];
    if (!part) return null;
    const decoded = Buffer.from(part, 'base64').toString('utf-8');
    if (/^\d{17,20}$/.test(decoded)) {
      return decoded;
    }
  } catch (_) {}
  return null;
}

export function getAllSlashCommands() {
  return [
    setupthongbaoData.toJSON(),
    setupctyData.toJSON(),
    odersetupData.toJSON(),
    setupnhandonData.toJSON(),
    checksetupData.toJSON(),
    modCmd.data.toJSON(),
    mttCmd.data.toJSON(),
    tranhcuCmd.data.toJSON(),
    nvCmd.data.toJSON(),
    nvttCmd.data.toJSON(),
    tpCmd.data.toJSON(),
    ctCmd.data.toJSON(),
    tkCmd.data.toJSON()
  ];
}

export async function deploySlashCommands(options = {}) {
  const { client = null, guildId = null } = options;

  const token = (options.token || process.env.DISCORD_TOKEN || config.TOKEN || '').trim();
  if (!token || token.length < 10) {
    Logger.warn('[DeployCommands] Bỏ qua đăng ký slash commands vì chưa có DISCORD_TOKEN.');
    return { success: false, reason: 'NO_TOKEN' };
  }

  const clientId = (
    options.clientId ||
    client?.user?.id ||
    process.env.CLIENT_ID ||
    config.CLIENT_ID ||
    extractClientIdFromToken(token) ||
    ''
  ).trim();

  if (!clientId) {
    Logger.warn('[DeployCommands] Không tìm thấy CLIENT_ID hợp lệ để đăng ký slash commands.');
    return { success: false, reason: 'NO_CLIENT_ID' };
  }

  const commands = getAllSlashCommands();
  const rest = new REST({ version: '10' }).setToken(token);

  Logger.info(`[DeployCommands] Bắt đầu đồng bộ ${commands.length} slash commands (bao gồm /setupthongbao) cho App ID: ${clientId}...`);

  let deployedGuildCount = 0;

  // 1. Deploy immediately to specified guild if provided
  if (guildId) {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands
      });
      Logger.info(`[DeployCommands] ✅ Đã đăng ký tức thì vào Guild: ${guildId}`);
      deployedGuildCount++;
    } catch (err) {
      Logger.error(`[DeployCommands] Lỗi khi đăng ký Guild ${guildId}: ${err.message}`);
    }
  }

  // 2. Deploy immediately to ALL cached guilds if client is available
  if (client?.guilds?.cache?.size) {
    for (const [gId, guild] of client.guilds.cache) {
      if (gId === guildId) continue; // already deployed
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, gId), {
          body: commands
        });
        deployedGuildCount++;
        Logger.info(`[DeployCommands] ✅ Đã đăng ký tức thì vào Guild: "${guild.name}" (${gId})`);
      } catch (err) {
        Logger.error(`[DeployCommands] Lỗi khi đăng ký vào Guild "${guild.name}" (${gId}): ${err.message}`);
      }
    }
  } else if (!guildId && (process.env.GUILD_ID || config.GUILD_ID)) {
    const envGuildId = (process.env.GUILD_ID || config.GUILD_ID || '').trim();
    if (envGuildId) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, envGuildId), {
          body: commands
        });
        deployedGuildCount++;
        Logger.info(`[DeployCommands] ✅ Đã đăng ký tức thì vào Guild từ ENV: ${envGuildId}`);
      } catch (err) {
        Logger.error(`[DeployCommands] Lỗi khi đăng ký Guild ENV ${envGuildId}: ${err.message}`);
      }
    }
  }

  // 3. Deploy to Global (ensures future guilds and full global scope)
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands
    });
    Logger.info(`[DeployCommands] ✅ Đã đăng ký Global thành công ${commands.length} Slash Commands! (Đã sync tức thì ${deployedGuildCount} server(s))`);
  } catch (error) {
    Logger.error(`[DeployCommands] Lỗi khi đăng ký Global Slash Commands: ${error.message}`);
  }

  return { success: true, count: commands.length, deployedGuildCount };
}

// If executed directly from CLI: node src/bot/deploy-commands.js
if (process.argv[1]?.endsWith('deploy-commands.js')) {
  deploySlashCommands();
}
