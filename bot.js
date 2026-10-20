/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { startBot, botSupervisor } from './src/bot/index.js';

console.log('[Bot Process] Khởi động Discord Bot tiến trình liên tục 24/7...');

startBot().catch((err) => {
  console.error('[Bot Startup Error]:', err.message);
  console.log('[Bot Supervisor] Tiến trình vẫn được duy trì, supervisor sẽ tự động kết nối lại.');
});

// Keep process alive indefinitely
setInterval(() => {
  // heartbeat loop
}, 60000);
