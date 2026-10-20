/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { RoleConfigService } from './roleConfigService.js';
import { ModService } from './modService.js';
import { randomUUID } from 'crypto';

export class ElectionService {
  static async createElection({ guildId, title, channelId = null, messageId = null }) {
    const electionId = `ELEC-${randomUUID().slice(0, 8).toUpperCase()}`;
    const now = Date.now();

    await dbManager.run(
      'INSERT INTO elections (id, guild_id, title, status, channel_id, message_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [electionId, guildId, title, 'OPEN', channelId || null, messageId || null, now]
    );

    return electionId;
  }

  static async getActiveElection(guildId) {
    return await dbManager.get(
      'SELECT * FROM elections WHERE guild_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1;',
      [guildId, 'OPEN']
    );
  }

  static async getElectionById(id) {
    return await dbManager.get('SELECT * FROM elections WHERE id = ?;', [id]);
  }

  static async registerCandidate({ electionId, userId, userTag, member }) {
    const election = await this.getElectionById(electionId);
    if (!election || election.status !== 'OPEN') {
      throw new Error('Đợt tranh cử này không còn mở!');
    }

    // Check if user has role tranh cử mod
    const roleConfig = await RoleConfigService.getRoleConfig(member.guild.id);
    if (!roleConfig?.role_tranh_cu_mod || !member.roles.cache.has(roleConfig.role_tranh_cu_mod)) {
      throw new Error('❌ Bạn không có quyền tham gia tranh cử! Chỉ những người đạt cấp **Chủ tịch (150 ca làm)** và được cấp role Tranh cử Mod mới có thể ứng cử.');
    }

    const existing = await dbManager.get(
      'SELECT id FROM candidates WHERE election_id = ? AND user_id = ?;',
      [electionId, userId]
    );
    if (existing) {
      throw new Error('Bạn đã đăng ký tranh cử trong đợt này rồi!');
    }

    const now = Date.now();
    await dbManager.run(
      'INSERT INTO candidates (election_id, user_id, user_tag, votes_count, registered_at) VALUES (?, ?, ?, 0, ?);',
      [electionId, userId, userTag, now]
    );

    return true;
  }

  static async getCandidates(electionId) {
    return await dbManager.all(
      'SELECT * FROM candidates WHERE election_id = ? ORDER BY votes_count DESC, registered_at ASC;',
      [electionId]
    );
  }

  static async vote({ electionId, voterId, candidateId }) {
    const election = await this.getElectionById(electionId);
    if (!election || election.status !== 'OPEN') {
      throw new Error('Đợt tranh cử này đã kết thúc hoặc không tồn tại!');
    }

    const candidate = await dbManager.get(
      'SELECT * FROM candidates WHERE id = ? AND election_id = ?;',
      [candidateId, electionId]
    );
    if (!candidate) {
      throw new Error('Ứng viên không hợp lệ!');
    }

    if (candidate.user_id === voterId) {
      throw new Error('Bạn không thể tự bỏ phiếu cho chính mình!');
    }

    const hasVoted = await dbManager.get(
      'SELECT id FROM votes WHERE election_id = ? AND voter_id = ?;',
      [electionId, voterId]
    );
    if (hasVoted) {
      throw new Error('Bạn đã bỏ phiếu trong đợt tranh cử này rồi! Mỗi người chỉ được bầu 1 phiếu.');
    }

    const now = Date.now();
    await dbManager.run(
      'INSERT INTO votes (election_id, voter_id, candidate_id, voted_at) VALUES (?, ?, ?, ?);',
      [electionId, voterId, candidateId, now]
    );

    await dbManager.run(
      'UPDATE candidates SET votes_count = votes_count + 1 WHERE id = ?;',
      [candidateId]
    );

    return {
      candidateName: candidate.user_tag,
      newVotes: candidate.votes_count + 1
    };
  }

  static async closeElection({ electionId, guild, adminId }) {
    const election = await this.getElectionById(electionId);
    if (!election || election.status !== 'OPEN') {
      throw new Error('Đợt tranh cử này đã đóng trước đó!');
    }

    const candidates = await this.getCandidates(electionId);
    let winner = null;

    if (candidates && candidates.length > 0) {
      winner = candidates[0]; // Candidate with most votes
    }

    const now = Date.now();
    await dbManager.run(
      'UPDATE elections SET status = ?, winner_id = ?, closed_at = ? WHERE id = ?;',
      ['CLOSED', winner ? winner.user_id : null, now, electionId]
    );

    // If there is a winner, assign role Mod Thực Tập (role_mtt)
    if (winner && guild) {
      try {
        const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
        if (roleConfig?.role_mtt) {
          const winnerMember = await guild.members.fetch(winner.user_id).catch(() => null);
          if (winnerMember) {
            await winnerMember.roles.add(roleConfig.role_mtt).catch(() => {});
          }
        }
      } catch (e) {
        Logger.warn(`Failed to assign role_mtt to winner ${winner.user_id}: ${e.message}`);
      }
    }

    Logger.logAudit({
      userId: adminId,
      action: 'ELECTION_CLOSED',
      amount: 0,
      metadata: `Election: ${electionId}, Winner: ${winner ? winner.user_id : 'None'}`
    });

    return {
      election,
      winner,
      candidates
    };
  }
}
