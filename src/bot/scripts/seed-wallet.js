/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { EconomyService } from '../services/economyService.js';
import { config } from '../config.js';

async function main() {
  await dbManager.init();

  const userId = process.argv[2] || config.BOT_ADMIN_ID;
  const amount = parseInt(process.argv[3] || '500000', 10);

  console.log(`[Seed] Nạp ${amount.toLocaleString('vi-VN')} kc vào ví user: ${userId}...`);
  await EconomyService.addWallet(userId, amount, 'ADMIN_MANUAL_SEED');

  const balance = await EconomyService.getWallet(userId);
  console.log(`[Seed] Hoàn tất! Số dư hiện tại của ví ${userId}: ${balance.toLocaleString('vi-VN')} kc.`);

  const fund = await EconomyService.getBotFund();
  console.log(`[Seed] Trạng thái quỹ "${config.BOT_FUND_NAME}": ${fund.balance.toLocaleString('vi-VN')} kc.`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Lỗi:', err);
  process.exit(1);
});
