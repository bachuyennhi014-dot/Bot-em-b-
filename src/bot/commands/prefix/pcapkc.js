/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Guard } from '../../middleware/guard.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { formatKc, parseAmountToBigInt } from '../../utils/timeParser.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePcapkc(message, args = []) {
  try {
    // 1. Chỉ Admin mới được dùng lệnh này
    const isAllowed = await Guard.requireAdmin(message, '*Pcapkc');
    if (!isAllowed) return;

    // 2. Parser: Ưu tiên message.mentions.users.first() để lấy target user
    let targetUser = message.mentions?.users?.first() || null;
    const content = message.content || '';

    // Nếu chưa có targetUser từ mention, quét trong args tìm ID snowflake
    if (!targetUser && Array.isArray(args)) {
      for (const arg of args) {
        const cleaned = arg.replace(/[<@!>]/g, '').trim();
        if (/^\d{17,20}$/.test(cleaned)) {
          try {
            targetUser = await message.client.users.fetch(cleaned);
          } catch (_) {
            targetUser = { id: cleaned, tag: `User (${cleaned})`, username: `User (${cleaned})` };
          }
          break;
        }
      }
    }

    if (!targetUser) {
      // Tìm snowflake trong toàn bộ nội dung nếu args bị lệch
      const snowflakeMatch = content.match(/\b\d{17,20}\b/);
      if (snowflakeMatch) {
        const potentialId = snowflakeMatch[0];
        if (potentialId !== message.author.id && potentialId !== message.client?.user?.id) {
          try {
            targetUser = await message.client.users.fetch(potentialId);
          } catch (_) {
            targetUser = { id: potentialId, tag: `User (${potentialId})`, username: `User (${potentialId})` };
          }
        }
      }
    }

    if (!targetUser) {
      return await message.reply(
        '❌ Vui lòng tag người dùng hoặc nhập ID người dùng cần cấp kim cương.\n' +
        '👉 Cú pháp: `*Pcapkc @user <số KC>` (Ví dụ: `*Pcapkc @User 100k`, `*Pcapkc @User 10000000000`, `*Pcapkc @User 1b`).'
      );
    }

    // 3. Tìm số lượng kim cương
    let amount = null;

    // Thử tìm trong args trước
    if (Array.isArray(args) && args.length > 0) {
      for (const arg of args) {
        if (targetUser && (arg.includes(targetUser.id) || arg.startsWith('<@'))) continue;
        const parsed = parseAmountToBigInt(arg);
        if (parsed && parsed > 0n) {
          amount = parsed;
          break;
        }
      }
    }

    // Nếu chưa tìm thấy amount từ args, phân tích từ remaining text
    if (!amount) {
      let remaining = content
        .replace(/^[*!/a-zA-Z0-9_]*\s*p?capkc\s*/i, '')
        .replace(new RegExp(`<@!?${targetUser.id}>`, 'g'), '')
        .replace(targetUser.id, '')
        .replace(/<@!?\d+>/g, '')
        .trim();

      const amountMatch = remaining.match(/(\d+(?:[.,]\d+)?\s*[kmbt]?)/i);
      const rawAmount = amountMatch ? amountMatch[1] : remaining;
      amount = parseAmountToBigInt(rawAmount);
    }

    if (!amount || amount <= 0n) {
      return await message.reply(
        '❌ Số lượng kim cương không hợp lệ! Vui lòng nhập số nguyên dương.\n' +
        '👉 Ví dụ: `*Pcapkc @user 1000`, `*Pcapkc @user 500k`, `*Pcapkc @user 10m`, `*Pcapkc @user 1b`.'
      );
    }

    // 4. Hiển thị bảng xác nhận cấp kim cương cho Admin
    const embed = BotEmbeds.capkcConfirm({
      targetUser,
      amount,
      adminUser: message.author,
      guild: message.guild
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`capkc_confirm:${message.author.id}:${targetUser.id}:${amount.toString()}`)
        .setLabel('Có')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`capkc_cancel:${message.author.id}:${targetUser.id}`)
        .setLabel('Hủy')
        .setStyle(ButtonStyle.Danger)
    );

    return await message.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('[Pcapkc ERROR]', error);
    return await message.reply(
      `${EMOJIS.x} Đã xảy ra lỗi khi thực thi lệnh cấp kim cương: ${error.message || 'Lỗi không xác định'}`
    );
  }
}


