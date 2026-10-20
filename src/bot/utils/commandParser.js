/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class CommandParser {
  /**
   * Resolve a text channel from message mentions or argument (id, name, or mention)
   */
  static async resolveChannel(message, arg) {
    if (!message.guild) return null;

    // 1. Mentions
    const mentioned = message.mentions.channels.first();
    if (mentioned) return mentioned;

    if (!arg) return null;

    // 2. Mention format <#1234567890>
    const matchMention = arg.match(/^<#(\d+)>$/);
    const channelId = matchMention ? matchMention[1] : (arg.match(/^\d{16,21}$/) ? arg : null);

    if (channelId) {
      const ch = message.guild.channels.cache.get(channelId) || 
                 await message.guild.channels.fetch(channelId).catch(() => null);
      if (ch) return ch;
    }

    // 3. By channel name
    const cleanName = arg.replace(/^#/, '').toLowerCase();
    const byName = message.guild.channels.cache.find(
      (c) => c.name.toLowerCase() === cleanName
    );
    return byName || null;
  }

  /**
   * Resolve a role from message mentions or argument (id, name, or mention)
   */
  static async resolveRole(message, arg) {
    if (!message.guild) return null;

    // 1. Mentions
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;

    if (!arg) return null;

    // 2. Mention format <@&1234567890> or raw ID
    const matchMention = arg.match(/^<@&?(\d+)>$/);
    const roleId = matchMention ? matchMention[1] : (arg.match(/^\d{16,21}$/) ? arg : null);

    if (roleId) {
      const role = message.guild.roles.cache.get(roleId) ||
                   await message.guild.roles.fetch(roleId).catch(() => null);
      if (role) return role;
    }

    // 3. By role name
    const cleanName = arg.replace(/^@/, '').toLowerCase();
    const byName = message.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === cleanName
    );
    return byName || null;
  }
}
