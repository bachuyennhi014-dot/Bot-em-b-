/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { startBot, botSupervisor } from './src/bot/index.js';

console.log('[Bot Process] Khởi động Discord Bot tiến trình liên tục 24/7...');

startBot().catch((err) => {
  console.error('[Bot Startup Error]:', err.message);
  console.log('[Bot Supervisor] Tiến trình vẫn được duy trì, supervisor sẽ tự động kết nối lại.');
});

// Render Web Service requires an open HTTP port to verify healthy deployment
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ONLINE',
    botStatus: botSupervisor?.status || 'RUNNING',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Web Server] HTTP health check server running on port ${PORT}`);
});

// Keep process alive indefinitely
setInterval(() => {
  // heartbeat loop
}, 60000);
