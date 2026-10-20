/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { EconomyService } from './economyService.js';
import { RoleConfigService } from './roleConfigService.js';
import { formatKc } from '../utils/timeParser.js';
import { EMOJIS } from '../config/emojis.js';

export class CompanyService {
  static async getCompanyByName(name) {
    return await dbManager.get(
      'SELECT * FROM companies WHERE name = ? AND status != ?;',
      [name, 'DISBANDED']
    );
  }

  static async getAllActiveCompanies() {
    return await dbManager.all(
      'SELECT * FROM companies WHERE status = ? ORDER BY id ASC;',
      ['ACTIVE']
    );
  }

  static async listCompanies() {
    const companies = await dbManager.all(
      `SELECT c.*, COUNT(cm.id) as memberCount 
       FROM companies c 
       LEFT JOIN company_members cm ON c.id = cm.company_id AND cm.status = 'ACTIVE'
       WHERE c.status = 'ACTIVE'
       GROUP BY c.id
       ORDER BY c.id ASC;`
    );
    return companies || [];
  }

  static async getCompanyById(companyId) {
    return await dbManager.get(
      'SELECT * FROM companies WHERE id = ? AND status = ?;',
      [companyId, 'ACTIVE']
    );
  }

  static async getActiveMember(userId) {
    return await dbManager.get(
      `SELECT cm.*, c.name as company_name 
       FROM company_members cm 
       JOIN companies c ON cm.company_id = c.id 
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1;`,
      [userId]
    );
  }

  static async getPendingApplication(userId) {
    return await dbManager.get(
      `SELECT ca.*, c.name as company_name 
       FROM company_applications ca
       JOIN companies c ON ca.company_id = c.id
       WHERE ca.user_id = ? AND ca.status = 'PENDING' LIMIT 1;`,
      [userId]
    );
  }

  static async getApplicationById(appId) {
    return await dbManager.get(
      `SELECT ca.*, c.name as company_name, c.work_salary_min, c.work_salary_max, c.daily_salary 
       FROM company_applications ca 
       JOIN companies c ON ca.company_id = c.id 
       WHERE ca.application_id = ?;`,
      [appId]
    );
  }

  static async applyToCompany({ guildId, userId, companyId }) {
    const company = await this.getCompanyById(companyId);
    if (!company) {
      throw new Error('Công ty này hiện không hoạt động hoặc không tồn tại.');
    }

    const activeMember = await this.getActiveMember(userId);
    if (activeMember) {
      throw new Error(`Bạn đang thuộc công ty "${activeMember.company_name}". Không thể xin vào 2 công ty cùng lúc.`);
    }

    const pending = await this.getPendingApplication(userId);
    if (pending) {
      throw new Error(`Bạn đang có đơn xin vào "${pending.company_name}" đang chờ duyệt. Vui lòng chờ xử lý.`);
    }

    const reviewChannelId = await RoleConfigService.getCompanyReviewChannel(guildId);
    if (!reviewChannelId) {
      throw new Error('Server chưa thiết lập kênh duyệt đơn công ty! Admin vui lòng dùng lệnh `/setupcty #kênh` để cài đặt.');
    }

    const balance = await EconomyService.getWallet(userId);
    if (balance < company.entry_fee) {
      throw new Error(`Bạn không đủ KC để xin vào công ty. Phí xin vào là **${formatKc(company.entry_fee)} kc**, ví bạn chỉ có **${formatKc(balance)} kc**.`);
    }

    // Deduct entry fee immediately
    await EconomyService.deductWallet(userId, company.entry_fee, `COMPANY_APPLICATION_FEE_${company.name}`);

    const appId = `APP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();

    await dbManager.run(
      `INSERT INTO company_applications (application_id, guild_id, user_id, company_id, fee, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?);`,
      [appId, guildId, userId, companyId, company.entry_fee, now]
    );

    dbManager.saveToDisk();

    return {
      applicationId: appId,
      company,
      fee: company.entry_fee,
      reviewChannelId
    };
  }

  static async approveApplication({ appId, reviewerId, guild, client }) {
    const app = await this.getApplicationById(appId);
    if (!app) {
      throw new Error('Không tìm thấy đơn xin vào công ty này.');
    }

    if (app.status !== 'PENDING') {
      throw new Error(`Đơn này đã được xử lý trước đó (Trạng thái: ${app.status}).`);
    }

    const now = Date.now();

    // Atomic update status
    const updateRes = await dbManager.run(
      `UPDATE company_applications 
       SET status = 'APPROVED', processed_at = ?, processed_by = ? 
       WHERE application_id = ? AND status = 'PENDING';`,
      [now, reviewerId, appId]
    );

    if (!updateRes || updateRes.changes === 0) {
      throw new Error('Đơn này đã được xử lý bởi người khác trước đó.');
    }

    // Insert or update member record
    const prevRecord = await dbManager.get(
      'SELECT * FROM company_members WHERE user_id = ? AND company_id = ?;',
      [app.user_id, app.company_id]
    );

    if (prevRecord) {
      await dbManager.run(
        `UPDATE company_members 
         SET status = 'ACTIVE', role_rank = 'NVTT', position = 'Nhân viên thực tập', work_count = 0, joined_at = ? 
         WHERE id = ?;`,
        [now, prevRecord.id]
      );
    } else {
      await dbManager.run(
        `INSERT INTO company_members (user_id, company_id, guild_id, role_rank, position, work_count, joined_at, status)
         VALUES (?, ?, ?, 'NVTT', 'Nhân viên thực tập', 0, ?, 'ACTIVE');`,
        [app.user_id, app.company_id, app.guild_id || guild?.id || 'GLOBAL', now]
      );
    }

    dbManager.saveToDisk();

    // Assign role NVTT or NV if configured in guild
    if (guild) {
      try {
        const member = await guild.members.fetch(app.user_id).catch(() => null);
        if (member) {
          const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
          const roleToGive = roleConfig?.role_nvtt || roleConfig?.role_nv;
          if (roleToGive) {
            await member.roles.add(roleToGive).catch(() => {});
          }
        }
      } catch (err) {
        Logger.warn(`Could not assign role to member ${app.user_id}: ${err.message}`);
      }
    }

    // Send DM to player
    try {
      const user = await client.users.fetch(app.user_id).catch(() => null);
      if (user) {
        await user.send(
          `${EMOJIS.sparkle10} **CHÚC MỪNG!**\n\n` +
          `Bạn đã được duyệt vào công ty **${app.company_name}**!\n\n` +
          `• **Lương làm việc:** **${formatKc(app.work_salary_min)} – ${formatKc(app.work_salary_max)} kc**\n` +
          `• **Lương ngày:** **+${formatKc(app.daily_salary)} kc/ngày**\n\n` +
          `Hãy sử dụng lệnh \`*Plmvc\` để bắt đầu làm việc.`
        ).catch(() => {});
      }
    } catch (_) {}

    return app;
  }

  static async rejectApplication({ appId, reviewerId, client }) {
    const app = await this.getApplicationById(appId);
    if (!app) {
      throw new Error('Không tìm thấy đơn xin vào công ty này.');
    }

    if (app.status !== 'PENDING') {
      throw new Error(`Đơn này đã được xử lý trước đó (Trạng thái: ${app.status}).`);
    }

    const now = Date.now();

    // Atomic update status
    const updateRes = await dbManager.run(
      `UPDATE company_applications 
       SET status = 'REJECTED', processed_at = ?, processed_by = ? 
       WHERE application_id = ? AND status = 'PENDING';`,
      [now, reviewerId, appId]
    );

    if (!updateRes || updateRes.changes === 0) {
      throw new Error('Đơn này đã được xử lý bởi người khác trước đó.');
    }

    // Refund fee to user's wallet
    if (app.fee > 0) {
      await EconomyService.addWallet(app.user_id, app.fee, `REFUND_COMPANY_APPLICATION_FEE_${app.company_name}`);
    }

    dbManager.saveToDisk();

    // Send DM to player
    try {
      const user = await client.users.fetch(app.user_id).catch(() => null);
      if (user) {
        await user.send(
          `${EMOJIS.x} **ĐƠN XIN VÀO CÔNG TY**\n\n` +
          `Rất tiếc, đơn xin vào **${app.company_name}** của bạn đã không được duyệt.\n\n` +
          `Phí xin vào đã được hoàn lại 100% vào ví của bạn.`
        ).catch(() => {});
      }
    } catch (_) {}

    return app;
  }

  static async createCompany({ name, entryFee, workMin, workMax, dailySalary, guildId, createdBy }) {
    const existing = await this.getCompanyByName(name);
    if (existing) {
      throw new Error(`Công ty "${name}" đã tồn tại!`);
    }

    const now = Date.now();
    await dbManager.run(
      `INSERT INTO companies (name, entry_fee, work_salary_min, work_salary_max, daily_salary, work_cost, guild_id, created_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, 10000000, ?, ?, 'ACTIVE', ?);`,
      [name, entryFee, workMin, workMax, dailySalary, guildId || 'GLOBAL', createdBy, now]
    );

    Logger.logAudit({
      userId: createdBy,
      action: 'COMPANY_CREATED',
      amount: entryFee,
      metadata: `Company: ${name}`
    });

    return await this.getCompanyByName(name);
  }

  static async disbandCompany({ name, adminId, guild }) {
    const company = await this.getCompanyByName(name);
    if (!company) {
      throw new Error(`Không tìm thấy công ty "${name}"!`);
    }

    const DISBAND_COST = 100000000; // 100.000.000 KC

    // Find all active members
    const members = await dbManager.all(
      'SELECT * FROM company_members WHERE company_id = ? AND status = ?;',
      [company.id, 'ACTIVE']
    );

    // If members exist, divide compensation
    let payoutPerMember = 0;
    if (members.length > 0) {
      payoutPerMember = Math.floor(DISBAND_COST / members.length);
      for (const m of members) {
        await EconomyService.addWalletBalance(m.user_id, payoutPerMember, `DISBAND_COMPENSATION_${company.name}`);
        // Remove roles if guild available
        if (guild) {
          try {
            const member = await guild.members.fetch(m.user_id).catch(() => null);
            if (member) {
              const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
              if (roleConfig) {
                const rolesToRemove = [
                  roleConfig.role_nvtt,
                  roleConfig.role_nv,
                  roleConfig.role_tp,
                  roleConfig.role_tk,
                  roleConfig.role_ct
                ].filter(Boolean);
                await member.roles.remove(rolesToRemove).catch(() => {});
              }
            }
          } catch (e) {
            Logger.warn(`Could not remove roles for member ${m.user_id}: ${e.message}`);
          }
        }
      }
    }

    // Update company and members status
    await dbManager.run(
      'UPDATE companies SET status = ? WHERE id = ?;',
      ['DISBANDED', company.id]
    );
    await dbManager.run(
      'UPDATE company_members SET status = ? WHERE company_id = ?;',
      ['FIRED', company.id]
    );

    Logger.logAudit({
      userId: adminId,
      action: 'COMPANY_DISBANDED',
      amount: DISBAND_COST,
      metadata: `Company: ${name}, Members Compensated: ${members.length}, Payout Each: ${payoutPerMember}`
    });

    return {
      company,
      membersCount: members.length,
      payoutPerMember
    };
  }

  static async fireEmployee({ userId, companyName, adminId, guild }) {
    const company = await this.getCompanyByName(companyName);
    if (!company) {
      throw new Error(`Không tìm thấy công ty "${companyName}"!`);
    }

    const member = await dbManager.get(
      'SELECT * FROM company_members WHERE user_id = ? AND company_id = ? AND status = ?;',
      [userId, company.id, 'ACTIVE']
    );

    if (!member) {
      throw new Error(`Người dùng <@${userId}> không phải nhân viên hoạt động của công ty "${companyName}"!`);
    }

    await dbManager.run(
      'UPDATE company_members SET status = ? WHERE id = ?;',
      ['FIRED', member.id]
    );

    // Remove Discord roles
    if (guild) {
      try {
        const guildMember = await guild.members.fetch(userId).catch(() => null);
        if (guildMember) {
          const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
          if (roleConfig) {
            const rolesToRemove = [
              roleConfig.role_nvtt,
              roleConfig.role_nv,
              roleConfig.role_tp,
              roleConfig.role_tk,
              roleConfig.role_ct,
              roleConfig.role_tranh_cu_mod
            ].filter(Boolean);
            await guildMember.roles.remove(rolesToRemove).catch(() => {});
          }
        }
      } catch (e) {
        Logger.warn(`Could not remove roles for fired member ${userId}: ${e.message}`);
      }
    }

    Logger.logAudit({
      userId: adminId,
      action: 'EMPLOYEE_FIRED',
      amount: 0,
      metadata: `Target: ${userId}, Company: ${companyName}`
    });

    return { success: true };
  }

  static async joinCompany({ userId, companyName, guild }) {
    const company = await this.getCompanyByName(companyName);
    if (!company) {
      throw new Error(`Không tìm thấy công ty "${companyName}"!`);
    }

    // A person can only belong to 1 active company at a time
    const anyActive = await dbManager.get(
      'SELECT cm.*, c.name as company_name FROM company_members cm JOIN companies c ON cm.company_id = c.id WHERE cm.user_id = ? AND cm.status = ?;',
      [userId, 'ACTIVE']
    );

    if (anyActive) {
      if (anyActive.company_id === company.id) {
        throw new Error(`Bạn đã là nhân viên của công ty "${companyName}" rồi!`);
      } else {
        throw new Error(`Mỗi người chỉ được ở 1 công ty! Bạn hiện đang làm việc tại "${anyActive.company_name}".`);
      }
    }

    // Check entry fee in wallet
    const balance = await EconomyService.getWalletBalance(userId);
    if (balance < company.entry_fee) {
      throw new Error(`Bạn không đủ kim cương để vào công ty! Phí gia nhập là **${formatKc(company.entry_fee)} kc**, số dư hiện tại của bạn là **${formatKc(balance)} kc**.`);
    }

    // Deduct entry fee
    await EconomyService.removeWalletBalance(userId, company.entry_fee, `ENTRY_FEE_${company.name}`);

    // Insert or update member record
    const prevRecord = await dbManager.get(
      'SELECT * FROM company_members WHERE user_id = ? AND company_id = ?;',
      [userId, company.id]
    );

    const now = Date.now();
    if (prevRecord) {
      await dbManager.run(
        'UPDATE company_members SET status = ?, role_rank = ?, work_count = 0, joined_at = ? WHERE id = ?;',
        ['ACTIVE', 'NVTT', now, prevRecord.id]
      );
    } else {
      await dbManager.run(
        'INSERT INTO company_members (user_id, company_id, guild_id, role_rank, work_count, joined_at, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [userId, company.id, guild?.id || 'GLOBAL', 'NVTT', 0, now, 'ACTIVE']
      );
    }

    // Assign role NVTT if role is configured
    if (guild) {
      try {
        const guildMember = await guild.members.fetch(userId).catch(() => null);
        const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
        if (guildMember && roleConfig?.role_nvtt) {
          await guildMember.roles.add(roleConfig.role_nvtt).catch(() => {});
        }
      } catch (e) {
        Logger.warn(`Could not assign NVTT role to ${userId}: ${e.message}`);
      }
    }

    Logger.logAudit({
      userId,
      action: 'COMPANY_JOINED',
      amount: company.entry_fee,
      metadata: `Company: ${company.name}`
    });

    return {
      company,
      entryFee: company.entry_fee
    };
  }

  static async work({ userId, companyName, guild, checkCooldown = false }) {
    let company;
    if (companyName) {
      company = await this.getCompanyByName(companyName);
    } else {
      // Find the first active company member belongs to, or default
      const m = await dbManager.get(
        'SELECT c.* FROM company_members cm JOIN companies c ON cm.company_id = c.id WHERE cm.user_id = ? AND cm.status = ? LIMIT 1;',
        [userId, 'ACTIVE']
      );
      company = m;
    }

    if (!company) {
      throw new Error('Bạn chưa tham gia công ty nào! Hãy gõ `*Pvaocty <tên công ty>` để xin vào làm việc.');
    }

    const member = await dbManager.get(
      'SELECT * FROM company_members WHERE user_id = ? AND company_id = ? AND status = ?;',
      [userId, company.id, 'ACTIVE']
    );

    if (!member) {
      throw new Error(`Bạn không phải nhân viên đang làm việc tại "${company.name}"!`);
    }

    // Role check if guild provided: must have NVTT, NV, TP, TK, or CT
    const allowedRanks = ['NVTT', 'NV', 'TP', 'TK', 'CT', 'ELIGIBLE_MOD'];
    if (!allowedRanks.includes(member.role_rank)) {
      throw new Error('Chỉ người có role Nhân viên TT/Nhân viên/Trưởng phòng/Thư kí/Chủ tịch mới được làm việc!');
    }

    // Cooldown check (5 seconds)
    if (checkCooldown) {
      const cd = await this.getWorkCooldown(userId);
      if (!cd.canWork) {
        const remainingSeconds = Math.ceil(cd.remainingMs / 1000);
        throw new Error(`Bạn đang trong thời gian nghỉ ngơi giữa ca! Vui lòng quay lại sau **${remainingSeconds} giây** (<t:${Math.floor(cd.nextAvailableAt / 1000)}:R>).`);
      }
    }

    // Financial check: operational work cost is 10.000.000 KC
    const WORK_COST = company.work_cost || 10000000;
    // Calculate random salary between min and max
    const salary = Math.floor(Math.random() * (company.work_salary_max - company.work_salary_min + 1)) + company.work_salary_min;

    // Add salary to user's wallet
    await EconomyService.addWalletBalance(userId, salary, `WORK_SALARY_${company.name}`);

    // Update member's work count
    const newWorkCount = member.work_count + 1;
    await dbManager.run(
      'UPDATE company_members SET work_count = ? WHERE id = ?;',
      [newWorkCount, member.id]
    );

    // Save cooldown
    await this.setWorkCooldown(userId);

    const now = Date.now();
    await dbManager.run(
      'INSERT INTO work_logs (user_id, company_id, salary_earned, work_cost, timestamp) VALUES (?, ?, ?, ?, ?);',
      [userId, company.id, salary, WORK_COST, now]
    );

    // Promotion logic check:
    // NVTT: 20 lần làm -> NV
    // NV: 40 lần làm -> TP
    // TP: 50 lần làm -> TK
    // TK: 60 lần làm -> CT
    // CT: 150 lần làm -> Đủ điều kiện tranh cử Mod
    let promotionInfo = null;
    const currentRank = member.role_rank;

    const rankLadder = [
      { from: 'NVTT', to: 'NV', target: 20, name: 'Nhân viên', roleKey: 'role_nv', prevRoleKey: 'role_nvtt' },
      { from: 'NV', to: 'TP', target: 40, name: 'Trưởng phòng', roleKey: 'role_tp', prevRoleKey: 'role_nv' },
      { from: 'TP', to: 'TK', target: 50, name: 'Thư kí', roleKey: 'role_tk', prevRoleKey: 'role_tp' },
      { from: 'TK', to: 'CT', target: 60, name: 'Chủ tịch', roleKey: 'role_ct', prevRoleKey: 'role_tk' },
      { from: 'CT', to: 'ELIGIBLE_MOD', target: 150, name: 'Đủ điều kiện Tranh cử Mod', roleKey: 'role_tranh_cu_mod', prevRoleKey: null }
    ];

    const step = rankLadder.find(s => s.from === currentRank);
    if (step && newWorkCount >= step.target) {
      // Promoted!
      const BONUS = 100000; // 100.000 KC
      await EconomyService.addWalletBalance(userId, BONUS, `PROMOTION_BONUS_${step.to}`);

      await dbManager.run(
        'UPDATE company_members SET role_rank = ?, work_count = 0 WHERE id = ?;',
        [step.to, member.id]
      );

      await dbManager.run(
        'INSERT INTO promotions (user_id, company_id, from_rank, to_rank, bonus, timestamp) VALUES (?, ?, ?, ?, ?, ?);',
        [userId, company.id, step.from, step.to, BONUS, now]
      );

      promotionInfo = {
        from: step.from,
        to: step.to,
        toName: step.name,
        bonus: BONUS
      };

      // Update Discord roles if available
      if (guild) {
        try {
          const guildMember = await guild.members.fetch(userId).catch(() => null);
          const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
          if (guildMember && roleConfig) {
            if (step.prevRoleKey && roleConfig[step.prevRoleKey]) {
              await guildMember.roles.remove(roleConfig[step.prevRoleKey]).catch(() => {});
            }
            if (step.roleKey && roleConfig[step.roleKey]) {
              await guildMember.roles.add(roleConfig[step.roleKey]).catch(() => {});
            }
          }
        } catch (e) {
          Logger.warn(`Failed to update roles for promoted member ${userId}: ${e.message}`);
        }
      }

      Logger.logAudit({
        userId,
        action: 'PROMOTION_ACHIEVED',
        amount: BONUS,
        metadata: `From ${step.from} to ${step.to} in ${company.name}`
      });
    }

    return {
      company,
      salary,
      workCost: 10000000,
      workCount: newWorkCount,
      promotionInfo,
      currentRank: promotionInfo ? promotionInfo.to : currentRank
    };
  }

  static async getWorkCooldown(userId) {
    const record = await dbManager.get(
      'SELECT last_worked_at FROM work_cooldowns WHERE user_id = ?;',
      [userId]
    );
    if (!record) return { canWork: true, remainingMs: 0 };
    const COOLDOWN_MS = 5 * 1000; // 5 seconds
    const elapsed = Date.now() - record.last_worked_at;
    if (elapsed < COOLDOWN_MS) {
      return {
        canWork: false,
        remainingMs: COOLDOWN_MS - elapsed,
        nextAvailableAt: record.last_worked_at + COOLDOWN_MS
      };
    }
    return { canWork: true, remainingMs: 0 };
  }

  static async setWorkCooldown(userId) {
    const now = Date.now();
    const existing = await dbManager.get('SELECT user_id FROM work_cooldowns WHERE user_id = ?;', [userId]);
    if (existing) {
      await dbManager.run('UPDATE work_cooldowns SET last_worked_at = ? WHERE user_id = ?;', [now, userId]);
    } else {
      await dbManager.run('INSERT INTO work_cooldowns (user_id, last_worked_at) VALUES (?, ?);', [userId, now]);
    }
  }

  static async getMemberCareerStats(userId) {
    const member = await dbManager.get(
      `SELECT cm.*, c.name as company_name, c.work_salary_min, c.work_salary_max, c.daily_salary 
       FROM company_members cm 
       JOIN companies c ON cm.company_id = c.id 
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1;`,
      [userId]
    );

    // Total KC earned from work
    const totalEarnedRow = await dbManager.get(
      'SELECT COALESCE(SUM(salary_earned), 0) as total FROM work_logs WHERE user_id = ?;',
      [userId]
    );
    const totalEarned = totalEarnedRow ? totalEarnedRow.total : 0;

    // KC earned today (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEarnedRow = await dbManager.get(
      'SELECT COALESCE(SUM(salary_earned), 0) as today_total FROM work_logs WHERE user_id = ? AND timestamp >= ?;',
      [userId, todayStart]
    );
    const todayEarned = todayEarnedRow ? todayEarnedRow.today_total : 0;

    // Total work count across all work logs
    const totalWorkCountRow = await dbManager.get(
      'SELECT COUNT(*) as total_count FROM work_logs WHERE user_id = ?;',
      [userId]
    );
    const totalWorkLogs = totalWorkCountRow ? totalWorkCountRow.total_count : 0;

    // Cooldown
    const cooldown = await this.getWorkCooldown(userId);

    // Target for next rank
    // TT: 20
    // NV: 40
    // TP: 50
    // TK: 60
    // CT: 150
    const rankTargets = {
      'NVTT': { nextRank: 'NV', target: 20, name: 'Nhân viên thực tập' },
      'NV': { nextRank: 'TP', target: 40, name: 'Nhân viên chính thức' },
      'TP': { nextRank: 'TK', target: 50, name: 'Trưởng phòng' },
      'TK': { nextRank: 'CT', target: 60, name: 'Thư kí' },
      'CT': { nextRank: 'ELIGIBLE_MOD', target: 150, name: 'Chủ tịch' },
      'ELIGIBLE_MOD': { nextRank: 'MOD', target: 150, name: 'Đủ điều kiện Tranh cử Mod' }
    };

    const currentRank = member?.role_rank || 'CHƯA CÓ';
    const rankInfo = rankTargets[currentRank] || { nextRank: 'N/A', target: 0, name: 'Thành viên' };

    return {
      member,
      hasCompany: !!member,
      companyName: member ? member.company_name : 'Chưa gia nhập',
      currentRank,
      rankTitle: rankInfo.name,
      nextRank: rankInfo.nextRank,
      currentWorkCount: member ? member.work_count : 0,
      targetWorkCount: rankInfo.target,
      totalWorkCount: totalWorkLogs,
      totalEarned,
      todayEarned,
      cooldown
    };
  }
}
