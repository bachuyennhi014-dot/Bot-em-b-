/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType
} from 'discord.js';
import dotenv from 'dotenv';
import { config } from '../config.js';
import { dbManager } from '../database/db.js';
import { handleMessage } from '../commands/messageHandler.js';
import { handleInteraction } from '../interactions/index.js';
import { deploySlashCommands } from '../deploy-commands.js';
import { DailySalaryService } from './dailySalaryService.js';
import { Logger } from '../utils/logger.js';

export class BotSupervisor {
  constructor() {
    this.client = null;
    this.status = 'INITIALIZING'; // 'INITIALIZING' | 'ONLINE' | 'CONNECTING' | 'RECONNECTING' | 'WAITING_FOR_TOKEN' | 'STOPPED_BY_ADMIN'
    this.startedAt = null;
    this.stoppedByAdmin = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.healthInterval = null;
    this.isConnecting = false;
    this.lastError = null;

    // Prevent any unhandled process termination
    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('[Supervisor] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      Logger.error('[Supervisor] Uncaught Exception caught (process preserved):', error);
    });
  }

  getToken() {
    // Reload dotenv if needed without throwing
    try {
      dotenv.config();
    } catch (_) {}
    return (process.env.DISCORD_TOKEN || config.TOKEN || '').trim();
  }

  async start() {
    this.stoppedByAdmin = false;
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }

    // Ensure database is initialized and auto-save is running
    await dbManager.init();
    dbManager.startAutoSave(15000);

    // Start background health & auto-reconnect watchdog (every 10s)
    this.healthInterval = setInterval(() => {
      this.checkHealth();
    }, 10000);

    return await this.connect();
  }

  async connect() {
    if (this.stoppedByAdmin) {
      this.status = 'STOPPED_BY_ADMIN';
      Logger.info('[Supervisor] Bot đang ở trạng thái dừng bởi Admin tối cao.');
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    const token = this.getToken();
    if (!token || token.length < 10) {
      this.status = 'WAITING_FOR_TOKEN';
      this.isConnecting = false;
      Logger.warn('[Supervisor] Chưa tìm thấy DISCORD_TOKEN hợp lệ. Bot đang chờ cấu hình token để tự động kết nối...');
      return;
    }

    this.status = this.reconnectAttempts === 0 ? 'CONNECTING' : 'RECONNECTING';

    try {
      if (this.client) {
        try {
          this.client.removeAllListeners();
          this.client.destroy();
        } catch (_) {}
      }

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers
        ],
        partials: [Partials.Channel, Partials.Message]
      });

      this.setupEventListeners();

      Logger.info(`[Supervisor] Đang kết nối tới Discord Gateway (Lần thử #${this.reconnectAttempts + 1})...`);
      await this.client.login(token);

      this.status = 'ONLINE';
      this.startedAt = Date.now();
      this.reconnectAttempts = 0;
      this.lastError = null;
      Logger.info(`[Supervisor] ✅ Bot đã online và hoạt động liên tục 24/7 dưới tên: ${this.client.user?.tag}`);
    } catch (err) {
      this.lastError = err.message;
      Logger.error(`[Supervisor] Lỗi khi kết nối Discord: ${err.message}`);
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  setupEventListeners() {
    if (!this.client) return;

    this.client.once(Events.ClientReady, async (readyClient) => {
      this.status = 'ONLINE';
      this.startedAt = Date.now();
      this.reconnectAttempts = 0;
      this.lastError = null;

      Logger.info(`[ClientReady] Bot "${readyClient.user.tag}" đã sẵn sàng trên ${readyClient.guilds.cache.size} server(s).`);

      readyClient.user.setActivity({
        name: `${config.PREFIX}oder | ${config.BOT_FUND_NAME}`,
        type: ActivityType.Playing
      });

      // Automatically deploy slash commands to ALL guilds bot is in (instant) + globally
      try {
        Logger.info(`[ClientReady] Đang tự động đăng ký và đồng bộ Slash Commands (/setupthongbao, /odersetup...) lên Discord...`);
        await deploySlashCommands({ client: readyClient, token: this.getToken() });
      } catch (e) {
        Logger.warn(`[Supervisor] deploySlashCommands warning: ${e.message}`);
      }

      // Start daily salary scheduler
      DailySalaryService.startScheduler(readyClient);
    });

    this.client.on(Events.GuildCreate, async (guild) => {
      Logger.info(`[GuildCreate] Bot đã tham gia server mới: "${guild.name}" (${guild.id}). Đang tự động deploy Slash Commands...`);
      try {
        await deploySlashCommands({ client: this.client, guildId: guild.id, token: this.getToken() });
      } catch (err) {
        Logger.error(`[GuildCreate Error]: ${err.message}`);
      }
    });

    this.client.on(Events.MessageCreate, async (message) => {
      try {
        await handleMessage(message);
      } catch (err) {
        Logger.error(`[MessageCreate Error]: ${err.message}`);
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      try {
        await handleInteraction(interaction);
      } catch (err) {
        Logger.error(`[InteractionCreate Error]: ${err.message}`);
      }
    });

    this.client.on(Events.ShardDisconnect, (event, shardId) => {
      Logger.warn(`[Gateway] Shard ${shardId} disconnected (${event.code}). Auto-recovering...`);
      if (!this.stoppedByAdmin) {
        this.scheduleReconnect();
      }
    });

    this.client.on(Events.ShardReconnecting, (shardId) => {
      this.status = 'RECONNECTING';
      Logger.info(`[Gateway] Shard ${shardId} đang tự động kết nối lại...`);
    });

    this.client.on(Events.ShardResume, (shardId, replayedEvents) => {
      this.status = 'ONLINE';
      Logger.info(`[Gateway] Shard ${shardId} đã phục hồi phiên kết nối thành công (${replayedEvents} events)!`);
    });

    this.client.on(Events.Error, (error) => {
      Logger.error(`[Discord Client Error]: ${error.message}`);
      if (!this.stoppedByAdmin && (!this.client || !this.client.isReady())) {
        this.scheduleReconnect();
      }
    });
  }

  scheduleReconnect() {
    if (this.stoppedByAdmin) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectAttempts++;
    // Exponential backoff: 3s, 5s, 10s, 15s, max 30s (NEVER STOPS RETRYING)
    const delay = Math.min(30000, 2000 + this.reconnectAttempts * 3000);
    Logger.info(`[Supervisor] Sẽ tự động kết nối lại sau ${Math.round(delay / 1000)} giây (Lần #${this.reconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  checkHealth() {
    // 1. Flush database if needed
    dbManager.saveToDisk();

    // 2. If stopped by admin, do not auto-reconnect
    if (this.stoppedByAdmin) return;

    // 3. If client not ready and not connecting, attempt connection
    const token = this.getToken();
    if (token && (!this.client || !this.client.isReady()) && !this.isConnecting) {
      Logger.info('[Watchdog] Phát hiện kết nối cần phục hồi, đang kích hoạt kết nối lại...');
      this.connect();
    }
  }

  // Only Admin (1402913586853974156) is allowed to manually stop the bot
  async stopBot(adminId) {
    if (adminId !== config.BOT_ADMIN_ID) {
      throw new Error('Chỉ có Admin tối cao mới có quyền tắt bot!');
    }

    this.stoppedByAdmin = true;
    this.status = 'STOPPED_BY_ADMIN';
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      try {
        this.client.destroy();
      } catch (_) {}
    }

    dbManager.saveToDisk();
    Logger.info(`[Supervisor] 🛑 Bot đã được tắt thủ công bởi Admin (${adminId}).`);
    return true;
  }

  // Admin or auto-boot start
  async startBot(adminId) {
    if (adminId && adminId !== config.BOT_ADMIN_ID) {
      throw new Error('Chỉ có Admin tối cao mới có quyền bật lại bot!');
    }

    this.stoppedByAdmin = false;
    this.reconnectAttempts = 0;
    Logger.info(`[Supervisor] ▶️ Kích hoạt khởi động bot theo yêu cầu.`);
    return await this.connect();
  }

  async deployCommands(guildId = null) {
    return await deploySlashCommands({ client: this.client, guildId, token: this.getToken() });
  }

  getUptime() {
    if (!this.startedAt || this.status !== 'ONLINE') return 0;
    return Date.now() - this.startedAt;
  }

  async getStatusSummary() {
    const token = this.getToken();
    const isConfigured = !!(token && token.length > 10);
    const uptimeMs = this.getUptime();

    let totalUsers = 0;
    let totalOrders = 0;
    let botFund = 0;

    try {
      const uRow = await dbManager.get('SELECT COUNT(*) as c FROM users;');
      totalUsers = uRow ? uRow.c : 0;
      const oRow = await dbManager.get('SELECT COUNT(*) as c FROM orders;');
      totalOrders = oRow ? oRow.c : 0;
      const fRow = await dbManager.get('SELECT balance FROM bot_fund WHERE id = 1;');
      botFund = fRow ? fRow.balance : 0;
    } catch (_) {}

    return {
      status: this.status,
      isConfigured,
      botTag: this.client?.user?.tag || null,
      botId: this.client?.user?.id || null,
      guildsCount: this.client?.guilds?.cache?.size || 0,
      ping: this.client?.ws?.ping || 0,
      uptimeMs,
      uptimeFormatted: this.formatUptime(uptimeMs),
      stoppedByAdmin: this.stoppedByAdmin,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      adminId: config.BOT_ADMIN_ID,
      totalUsers,
      totalOrders,
      botFund,
      guilds: this.client?.guilds?.cache?.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        icon: g.iconURL()
      })) || []
    };
  }

  formatUptime(ms) {
    if (!ms || ms <= 0) return '0 giây';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    parts.push(`${seconds} giây`);
    return parts.join(' ');
  }
}

export const botSupervisor = new BotSupervisor();
