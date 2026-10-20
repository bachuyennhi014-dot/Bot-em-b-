/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { EconomyService } from './economyService.js';
import { Logger } from '../utils/logger.js';
import { formatKc } from '../utils/timeParser.js';

export class DailySalaryService {
  static getTodayDateStr() {
    // Return YYYY-MM-DD in UTC+7 (Vietnam Time)
    const now = new Date();
    const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return utc7.toISOString().slice(0, 10);
  }

  static async checkAndPayDailySalaries(client) {
    const today = this.getTodayDateStr();
    
    // Get all active members in active companies
    const activeMembers = await dbManager.all(
      `SELECT cm.user_id, cm.company_id, c.name as company_name, c.daily_salary
       FROM company_members cm
       JOIN companies c ON cm.company_id = c.id
       WHERE cm.status = 'ACTIVE' AND c.status = 'ACTIVE';`
    );

    if (!activeMembers || activeMembers.length === 0) return 0;

    let paidCount = 0;
    const now = Date.now();

    for (const member of activeMembers) {
      try {
        // Check if already paid today
        const alreadyPaid = await dbManager.get(
          'SELECT id FROM salary_claims WHERE user_id = ? AND company_id = ? AND claim_date = ?;',
          [member.user_id, member.company_id, today]
        );

        if (alreadyPaid) continue;

        // Pay salary
        const salary = member.daily_salary || 2500;
        await EconomyService.addWalletBalance(member.user_id, salary, `DAILY_SALARY_${member.company_name}`);

        await dbManager.run(
          'INSERT INTO salary_claims (user_id, company_id, amount, claim_date, claimed_at) VALUES (?, ?, ?, ?, ?);',
          [member.user_id, member.company_id, salary, today, now]
        );

        paidCount++;

        // Send DM if client available
        if (client) {
          try {
            const user = await client.users.fetch(member.user_id).catch(() => null);
            if (user) {
              await user.send(
                `📬 **[LƯƠNG NGÀY]** Chúc mừng bạn đã nhận **+${formatKc(salary)} kc** lương ngày hôm nay (${today}) từ công ty **${member.company_name}**!\nTiền đã được cộng thẳng vào ví cá nhân của bạn.`
              ).catch(() => {});
            }
          } catch (e) {
            // User might have DMs disabled, ignore safely
          }
        }
      } catch (err) {
        Logger.error(`Failed to pay daily salary to user ${member.user_id}: ${err.message}`);
      }
    }

    if (paidCount > 0) {
      Logger.info(`[DailySalary] Đã tự động phát lương ngày ${today} cho ${paidCount} nhân viên công ty.`);
    }

    return paidCount;
  }

  static startScheduler(client) {
    // Run immediately once on start
    this.checkAndPayDailySalaries(client).catch(() => {});

    // Check every 10 minutes for midnight turnover
    setInterval(() => {
      this.checkAndPayDailySalaries(client).catch(err => {
        Logger.error(`Error in daily salary scheduler: ${err.message}`);
      });
    }, 10 * 60 * 1000);
  }
}
