/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import { createServer as createViteServer } from 'vite';
import { botSupervisor } from './src/bot/services/botSupervisor.js';
import { dbManager } from './src/bot/database/db.js';
import { config } from './src/bot/config.js';
import { RoleConfigService } from './src/bot/services/roleConfigService.js';
import { ConfigService } from './src/bot/services/configService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Initialize Database & Auto-Boot Bot Supervisor immediately
  console.log('[Server] Khởi động hệ thống máy chủ 24/7 và Bot Supervisor...');
  try {
    await dbManager.init();
    // Auto-start bot on boot
    await botSupervisor.start();
  } catch (err: any) {
    console.error('[Server] Lỗi khi khởi động Database/Bot Supervisor:', err.message);
  }

  // 2. REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      botStatus: botSupervisor.status,
      botTag: botSupervisor.client?.user?.tag || null,
      timestamp: Date.now()
    });
  });

  app.get('/api/bot/status', async (req, res) => {
    try {
      const summary = await botSupervisor.getStatusSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin-only control endpoint (Strictly protected by Admin ID 1402913586853974156)
  app.post('/api/bot/action', async (req, res) => {
    const { action, adminId } = req.body;

    if (adminId !== config.BOT_ADMIN_ID) {
      return res.status(403).json({
        error: 'Chỉ có Admin tối cao duy nhất (ID: 1402913586853974156) mới có quyền điều khiển bot!'
      });
    }

    try {
      if (action === 'stop') {
        await botSupervisor.stopBot(adminId);
        return res.json({ success: true, message: 'Đã tạm dừng bot theo lệnh Admin.' });
      } else if (action === 'start') {
        await botSupervisor.startBot(adminId);
        return res.json({ success: true, message: 'Đã khởi động lại bot 24/7.' });
      } else if (action === 'sync') {
        await botSupervisor.deployCommands();
        return res.json({ success: true, message: 'Đã đồng bộ lại danh sách lệnh Slash Commands.' });
      } else {
        return res.status(400).json({ error: 'Hành động không hợp lệ' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bot/setup', async (req, res) => {
    try {
      let guildId = (req.query.guildId as string) || botSupervisor.client?.guilds?.cache?.first()?.id;
      if (!guildId) {
        const row = await dbManager.get('SELECT guild_id FROM server_configs LIMIT 1;');
        guildId = row?.guild_id;
      }

      if (!guildId) {
        return res.json({ guildId: null, configs: null });
      }

      const configs = await RoleConfigService.getAllConfigs(guildId);
      res.json({ guildId, configs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bot/setup', async (req, res) => {
    const {
      adminId,
      guildId,
      orderChannelId,
      customerRoleId,
      receiveOrderChannelId,
      staffRoleId,
      notificationChannelId,
      roles
    } = req.body;

    if (adminId !== config.BOT_ADMIN_ID) {
      return res.status(403).json({
        error: 'Chỉ Admin tối cao (ID: 1402913586853974156) mới có quyền lưu cấu hình!'
      });
    }

    if (!guildId) {
      return res.status(400).json({ error: 'Thiếu guildId' });
    }

    try {
      if (orderChannelId || customerRoleId) {
        await ConfigService.setOrderSetup(guildId, orderChannelId || '', customerRoleId || '');
      }
      if (receiveOrderChannelId || staffRoleId) {
        await ConfigService.setReceiveOrderSetup(guildId, receiveOrderChannelId || '', staffRoleId || '');
      }
      if (notificationChannelId) {
        await RoleConfigService.setNotificationChannel(guildId, notificationChannelId);
      }
      if (roles && typeof roles === 'object') {
        for (const [key, roleId] of Object.entries(roles)) {
          if (roleId) {
            await RoleConfigService.setRole(guildId, key, roleId as string);
          }
        }
      }
      dbManager.saveToDisk();
      const updated = await RoleConfigService.getAllConfigs(guildId);
      return res.json({
        success: true,
        configs: updated,
        message: 'Đã lưu cấu hình server thành công vào Database!'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Export Source Code ZIP
  app.get('/api/export/zip', (req, res) => {
    try {
      const zip = new AdmZip();
      const rootDir = process.cwd();
      const ignoreFolders = new Set(['node_modules', '.git', 'dist', '.aistudio', 'build', '.cache']);

      function addDirRecursive(currentDir: string, zipPath: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoreFolders.has(entry.name)) continue;
          const fullPath = path.join(currentDir, entry.name);
          const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            addDirRecursive(fullPath, entryZipPath);
          } else {
            zip.addLocalFile(fullPath, zipPath);
          }
        }
      }

      addDirRecursive(rootDir, '');
      const buffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="discord-bot-source.zip"');
      res.setHeader('Content-Length', buffer.length.toString());
      return res.end(buffer);
    } catch (err: any) {
      console.error('[Export ZIP Error]:', err);
      return res.status(500).json({ error: 'Không thể tạo file ZIP: ' + err.message });
    }
  });

  // 4. One-click Push to GitHub Repository
  app.post('/api/github/push', (req, res) => {
    const { repoUrl, token, branch = 'main', commitMessage = 'Cập nhật mã nguồn Discord Bot 24/7' } = req.body;
    if (!repoUrl || !token) {
      return res.status(400).json({
        error: 'Vui lòng nhập đầy đủ GitHub Repository URL và GitHub Personal Access Token!'
      });
    }

    try {
      let cleanUrl = repoUrl.trim();
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
      cleanUrl = cleanUrl.replace(/^git@github\.com:/, 'github.com/');
      if (cleanUrl.endsWith('.git')) {
        cleanUrl = cleanUrl.slice(0, -4);
      }
      const remoteWithAuth = `https://${encodeURIComponent(token.trim())}@${cleanUrl}.git`;
      const cwd = process.cwd();

      try {
        execSync('git config user.name "Discord Bot Developer"', { cwd });
        execSync('git config user.email "bot@discord.local"', { cwd });
      } catch (_) {}

      if (!fs.existsSync(path.join(cwd, '.git'))) {
        execSync('git init', { cwd });
      }

      try {
        execSync('git remote remove origin', { cwd });
      } catch (_) {}

      execSync(`git remote add origin "${remoteWithAuth}"`, { cwd });
      execSync('git add .', { cwd });

      try {
        execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd });
      } catch (_) {
        // No new changes to commit is okay
      }

      execSync(`git branch -M ${branch}`, { cwd });
      execSync(`git push -u origin ${branch} --force`, { cwd, encoding: 'utf-8', timeout: 45000 });

      // Clean remote URL to avoid saving token in local config
      try {
        execSync(`git remote set-url origin "https://${cleanUrl}.git"`, { cwd });
      } catch (_) {}

      return res.json({
        success: true,
        message: `Đã đẩy toàn bộ mã nguồn bot lên nhánh "${branch}" của GitHub thành công!`
      });
    } catch (err: any) {
      console.error('[GitHub Push Error]:', err);
      return res.status(500).json({
        error: `Không thể đẩy lên GitHub: ${err.stderr || err.message}`
      });
    }
  });

  // 3. Vite Middleware (Dev) vs Static Files (Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Web App & Bot Supervisor đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer();
