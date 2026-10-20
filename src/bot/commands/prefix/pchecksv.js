/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { Guard } from '../../middleware/guard.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePchecksv(message) {
  // 1. Guard: STRICTLY Bot Admin (1402913586853974156) only
  const isAllowed = await Guard.requireStrictAdmin(message, '*Pchecksv');
  if (!isAllowed) return;

  const client = message.client;
  // Fetch real guilds from Discord API
  const guilds = Array.from(client.guilds.cache.values());

  if (guilds.length === 0) {
    return message.reply('Bot hiện tại chưa tham gia server nào.');
  }

  const page = 1;
  const totalPages = guilds.length;
  const currentGuild = guilds[0];

  // Check bot administrator permission in the guild
  const botMember = currentGuild.members.me;
  const isBotAdmin = botMember ? botMember.permissions.has(PermissionFlagsBits.Administrator) : false;

  const embed = BotEmbeds.serverCheckPage({
    page: 1,
    totalPages,
    guild: currentGuild,
    isBotAdmin,
    memberCount: currentGuild.memberCount,
    ownerTag: currentGuild.ownerId,
    joinedAt: botMember ? botMember.joinedAt : null
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`svpage:0:${message.author.id}`)
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`svpage:1:${message.author.id}`)
      .setEmoji('➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(totalPages <= 1)
  );

  await message.reply({
    embeds: [embed],
    components: [row]
  });
}
