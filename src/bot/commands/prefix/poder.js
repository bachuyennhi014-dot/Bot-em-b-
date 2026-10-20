/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ConfigService } from '../../services/configService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePoder(message) {
  const guild = message.guild;
  if (!guild) {
    return message.reply('❌ Lệnh này chỉ sử dụng được trong server.');
  }

  // 1. Check order channel & 3-strike rule
  const channelCheck = await ConfigService.checkOrderChannel(guild.id, message.channel.id, message.author.id);
  if (!channelCheck.allowed) {
    return message.reply(channelCheck.message);
  }

  const cfg = channelCheck.config;

  // 2. Check customer role
  if (cfg.customer_role_id) {
    const member = message.member;
    const hasCustomerRole = member && member.roles.cache.has(cfg.customer_role_id);
    if (!hasCustomerRole) {
      return message.reply(`❌ Bạn cần có role <@&${cfg.customer_role_id}> mới được phép đặt hàng.`);
    }
  }

  // 3. Build Main Interactive Menu
  const embed = BotEmbeds.orderMainMenu(
    message.author.displayName || message.author.username,
    guild
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cat_food:${message.author.id}`)
      .setLabel('Đồ ăn')
      .setEmoji('1552252083309387827')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`cat_drink:${message.author.id}`)
      .setLabel('Nước uống')
      .setEmoji('1552252086723551303')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`cat_topup:${message.author.id}`)
      .setLabel('Nạp thẻ')
      .setEmoji('1552252089936248923')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cat_cart:${message.author.id}`)
      .setLabel('Giỏ hàng')
      .setEmoji('1552252092654297168')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`cat_house:${message.author.id}`)
      .setLabel('Mua nhà 🔓')
      .setEmoji('1552252098282913833')
      .setStyle(ButtonStyle.Danger)
  );

  await message.reply({
    embeds: [embed],
    components: [row]
  });
}
