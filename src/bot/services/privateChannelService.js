/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';

export class PrivateChannelService {
  /**
   * Create a private Discord channel for the house buyer
   */
  static async createChannel({ guild, ownerId, channelName, orderId, clientUserId }) {
    try {
      const sanitizedName = channelName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 32);

      const channel = await guild.channels.create({
        name: `🏠-${sanitizedName}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          // 1. Hide from everyone
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          // 2. Allow buyer
          {
            id: ownerId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks
            ]
          },
          // 3. Allow Bot
          {
            id: clientUserId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ]
      });

      // Save to database
      const now = Date.now();
      await dbManager.run(
        `INSERT INTO private_channels (channel_id, guild_id, owner_id, channel_name, order_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [channel.id, guild.id, ownerId, channel.name, orderId, now]
      );

      await Logger.logAction({
        userId: ownerId,
        action: 'PRIVATE_CHANNEL_CREATED',
        orderId,
        guildId: guild.id,
        metadata: { channelId: channel.id, channelName: channel.name }
      });

      return { success: true, channel };
    } catch (err) {
      Logger.error(`Failed to create private channel for ${ownerId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
