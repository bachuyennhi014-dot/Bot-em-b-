/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { botSupervisor } from './services/botSupervisor.js';
import { Logger } from './utils/logger.js';

export async function startBot() {
  Logger.info('==================================================');
  Logger.info('🤖 KHỞI ĐỘNG DISCORD BOT 24/7 VỚI SUPERVISOR TỰ ĐỘNG');
  Logger.info('==================================================');

  await botSupervisor.start();
  return botSupervisor.client;
}

// Start if executed directly: node src/bot/index.js
if (process.argv[1]?.endsWith('index.js')) {
  startBot().catch((err) => {
    Logger.error('[Bot Index Error]:', err);
  });
}

export { botSupervisor };
