/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';
import { getRandomGachaImage } from '../commands/prefix/pgacha.js';

const gachaCooldowns = new Map();
import { config } from '../config.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { OrderService } from '../services/orderService.js';
import { EconomyService } from '../services/economyService.js';
import { ConfigService } from '../services/configService.js';
import { RoleConfigService } from '../services/roleConfigService.js';
import { ModService } from '../services/modService.js';
import { PrivateChannelService } from '../services/privateChannelService.js';
import { ElectionService } from '../services/electionService.js';
import { CompanyService } from '../services/companyService.js';
import { formatKc } from '../utils/timeParser.js';
import { dbManager } from '../database/db.js';
import { EMOJIS, EMOJI_IDS, getVipPaymentDecoration } from '../config/emojis.js';

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guild = interaction.guild;

  // Gacha spin button
  if (customId === 'gacha_spin') {
    const now = Date.now();
    const lastSpin = gachaCooldowns.get(userId) || 0;
    if (now - lastSpin < 800) {
      return interaction.reply({
        content: '⏳ Đang quay, chờ một chút...',
        flags: 64
      }).catch(() => {});
    }
    gachaCooldowns.set(userId, now);

    try {
      const selectedImage = getRandomGachaImage();

      const resultEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('🎉 KẾT QUẢ GACHA!')
        .setDescription(`🎰 Người quay: **${interaction.user.tag}**\n\nChúc mừng bạn đã quay được ảnh mới!\nMuốn quay tiếp thì bấm nút bên dưới.`)
        .setImage(selectedImage)
        .setFooter({ text: 'Hệ thống Gacha ngẫu nhiên • Tỷ lệ đồng đều' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('gacha_spin')
          .setLabel('🎰 QUAY NÀO!')
          .setStyle(ButtonStyle.Primary)
      );

      return await interaction.update({
        embeds: [resultEmbed],
        components: [row]
      });
    } catch (err) {
      console.error('[GACHA] Error handling spin button:', err);
      return interaction.reply({
        content: '❌ Đã xảy ra lỗi khi quay Gacha, vui lòng thử lại!',
        flags: 64
      }).catch(() => {});
    }
  }

  // 1. Categories
  if (customId.startsWith('cat_food:')) {
    const ownerId = customId.split(':')[1];
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể thao tác trên menu của người khác.', flags: 64 });
    }

    const embed = BotEmbeds.foodMenu(guild);
    const rows = [];
    const row = new ActionRowBuilder();

    config.FOOD_ITEMS.forEach((item, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`select_item:${item.id}:food:${userId}`)
          .setLabel(item.name)
          .setEmoji(idx % 2 === 0 ? EMOJI_IDS.cinnamorollIceCream : EMOJI_IDS.hellokitty1)
          .setStyle(ButtonStyle.Secondary)
      );
    });
    rows.push(row);

    return interaction.reply({ embeds: [embed], components: rows, flags: 64 });
  }

  if (customId.startsWith('cat_drink:')) {
    const ownerId = customId.split(':')[1];
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: `${EMOJIS.x} Bạn không thể thao tác trên menu của người khác.`, flags: 64 });
    }

    const embed = BotEmbeds.drinksMenu(guild);
    const row = new ActionRowBuilder();

    config.DRINK_ITEMS.forEach((item, idx) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`select_item:${item.id}:drink:${userId}`)
          .setLabel(item.name)
          .setEmoji(idx % 2 === 0 ? EMOJI_IDS.bongbongxanh : EMOJI_IDS.douceurPink035)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  }

  if (customId.startsWith('cat_topup:')) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_topup:${userId}`)
      .setTitle('💳 NẠP THẺ VÀO VÍ KIM CƯƠNG');

    const amountInput = new TextInputBuilder()
      .setCustomId('topup_amount')
      .setLabel('Nhập số lượng kim cương (kc) muốn nạp')
      .setPlaceholder('Ví dụ: 100000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(10);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
    return interaction.showModal(modal);
  }

  if (customId.startsWith('cat_cart:')) {
    const ownerId = customId.split(':')[1];
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: `${EMOJIS.x} Bạn không thể xem giỏ hàng của người khác.`, flags: 64 });
    }

    const { items, total } = await OrderService.getCart(userId, guild.id);
    const embed = BotEmbeds.cartView(items, total, guild);

    const row = new ActionRowBuilder();
    if (items.length > 0) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`checkout_cart_money:${userId}`)
          .setLabel('Thanh toán bằng tiền')
          .setEmoji(EMOJI_IDS.sparkle10)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`checkout_cart_card:${userId}`)
          .setLabel('Thanh toán bằng thẻ')
          .setEmoji(EMOJI_IDS.pinkCreditCard)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`clear_cart:${userId}`)
          .setLabel('Xóa giỏ')
          .setEmoji(EMOJI_IDS.x)
          .setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    } else {
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
  }

  if (customId.startsWith('cat_house:')) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_house:${userId}`)
      .setTitle('🏠 MUA NHÀ - TẠO KÊNH RIÊNG TƯ');

    const channelNameInput = new TextInputBuilder()
      .setCustomId('house_channel_name')
      .setLabel('Nhập tên phòng riêng của bạn')
      .setPlaceholder('Ví dụ: phong-cua-toi')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(30);

    modal.addComponents(new ActionRowBuilder().addComponents(channelNameInput));
    return interaction.showModal(modal);
  }

  // 2. Select Item -> Open Quantity Modal
  if (customId.startsWith('select_item:')) {
    const [, itemId, type, ownerId] = customId.split(':');
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể thao tác trên menu của người khác.', flags: 64 });
    }

    const allItems = [...config.FOOD_ITEMS, ...config.DRINK_ITEMS];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) {
      return interaction.reply({ content: '❌ Món không tồn tại.', flags: 64 });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_qty:${item.id}:${userId}`)
      .setTitle(`Số lượng: ${item.name.slice(0, 30)}`);

    const qtyInput = new TextInputBuilder()
      .setCustomId('qty_value')
      .setLabel('Nhập số lượng (1 → 999)')
      .setPlaceholder('1')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(3);

    modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));
    return interaction.showModal(modal);
  }

  // 3. Item Action: Add to Cart
  if (customId.startsWith('btn_add_cart:')) {
    const [, itemId, qtyStr, ownerId] = customId.split(':');
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể thao tác trên giỏ hàng của người khác.', flags: 64 });
    }

    const allItems = [...config.FOOD_ITEMS, ...config.DRINK_ITEMS];
    const item = allItems.find((i) => i.id === itemId);
    const quantity = parseInt(qtyStr, 10);

    if (!item || isNaN(quantity) || quantity <= 0) {
      return interaction.reply({ content: '❌ Dữ liệu không hợp lệ.', flags: 64 });
    }

    await OrderService.addToCart({
      userId,
      guildId: guild.id,
      item,
      quantity
    });

    return interaction.reply({
      content: `✅ Đã thêm **${quantity}x ${item.name}** vào giỏ hàng của bạn! Dùng \`*Poder\` > **4️⃣ Giỏ hàng** để xem.`,
      flags: 64
    });
  }

  // 4. Item Action: Direct Order (Thanh toán bằng tiền)
  if (customId.startsWith('btn_pay_money:')) {
    const [, itemId, qtyStr, ownerId] = customId.split(':');
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể thao tác trên order của người khác.', flags: 64 });
    }

    const allItems = [...config.FOOD_ITEMS, ...config.DRINK_ITEMS];
    const item = allItems.find((i) => i.id === itemId);
    const quantity = parseInt(qtyStr, 10);

    if (!item || isNaN(quantity) || quantity <= 0) {
      return interaction.reply({ content: '❌ Dữ liệu không hợp lệ.', flags: 64 });
    }

    const total = item.price * quantity;

    // Check staff receive order channel setup
    const cfg = await ConfigService.getServerConfig(guild.id);
    if (!cfg || !cfg.receive_order_channel_id) {
      return interaction.reply({
        content: '❌ Quản trị viên chưa thiết lập kênh nhận đơn (`/setupnhandon`). Không thể gửi đơn hàng.',
        flags: 64
      });
    }

    const receiveChannel = guild.channels.cache.get(cfg.receive_order_channel_id) ||
      await guild.channels.fetch(cfg.receive_order_channel_id).catch(() => null);
    if (!receiveChannel) {
      return interaction.reply({
        content: '❌ Kênh nhận đơn không tồn tại hoặc bot thiếu quyền truy cập.',
        flags: 64
      });
    }

    // Create Order with status PENDING_ACCEPTANCE (DOES NOT deduct money yet)
    const { orderId } = await OrderService.createOrder({
      guildId: guild.id,
      userId,
      items: [{ id: item.id, name: item.name, quantity, price: item.price }],
      totalAmount: total,
      orderType: 'FOOD_DRINK'
    });

    // Send order embed to Receive Order Channel
    const staffEmbed = BotEmbeds.staffNewOrder({
      orderId,
      buyerTag: interaction.user.tag,
      buyerId: userId,
      items: [{ item_name: item.name, quantity, price: item.price }],
      total,
      orderType: 'FOOD_DRINK'
    });

    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_reject:${orderId}`)
        .setLabel('Từ chối nhận đơn')
        .setEmoji(EMOJI_IDS.x)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`staff_accept:${orderId}`)
        .setLabel('Nhận đơn')
        .setEmoji(EMOJI_IDS.check)
        .setStyle(ButtonStyle.Success)
    );

    await receiveChannel.send({
      content: cfg.staff_role_id ? `<@&${cfg.staff_role_id}> Có đơn hàng mới!` : 'Có đơn hàng mới!',
      embeds: [staffEmbed],
      components: [staffRow]
    });

    return interaction.reply({
      content: `✅ Đã tạo đơn hàng **${orderId}** thành công! Đơn hàng đang được gửi đến nhân viên tiếp nhận. Khi nhân viên duyệt, bạn sẽ nhận được thông báo thanh toán.`,
      flags: 64
    });
  }

  // 5. Item Action: Thanh toán bằng thẻ (Card payment)
  if (customId.startsWith('btn_pay_card:')) {
    const vipDecor = getVipPaymentDecoration();
    return interaction.reply({
      content:
        `${vipDecor}\n` +
        `${EMOJIS.pinkCreditCard} **Thanh toán bằng thẻ VIP:** Tính năng cổng thẻ trực tuyến đang ở chế độ PENDING. Bạn có thể sử dụng phương thức **Thanh toán bằng tiền** (kim cương ví cá nhân).`,
      flags: 64
    });
  }

  // 5b. Action: Xác nhận nạp thẻ bằng thẻ
  if (customId.startsWith('pay_topup_card:')) {
    const topupId = customId.split(':')[1];
    const topupEmbed = BotEmbeds.topupCardSuccess({
      topupId,
      amount: 100000,
      guild
    });
    return interaction.reply({
      embeds: [topupEmbed],
      flags: 64
    });
  }

  // 6. Item Action: Cancel
  if (customId.startsWith('btn_cancel:')) {
    return interaction.reply({ content: '❌ Đã hủy thao tác.', flags: 64 });
  }

  // 7. Clear Cart
  if (customId.startsWith('clear_cart:')) {
    const ownerId = customId.split(':')[1];
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể xóa giỏ hàng của người khác.', flags: 64 });
    }
    await OrderService.clearCart(userId, guild.id);
    return interaction.reply({ content: '🗑️ Đã xóa toàn bộ giỏ hàng của bạn.', flags: 64 });
  }

  // 8. Checkout Whole Cart (Thanh toán bằng tiền)
  if (customId.startsWith('checkout_cart_money:')) {
    const ownerId = customId.split(':')[1];
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không thể thanh toán giỏ hàng của người khác.', flags: 64 });
    }

    const { items, total } = await OrderService.getCart(userId, guild.id);
    if (!items || items.length === 0) {
      return interaction.reply({ content: '❌ Giỏ hàng của bạn đang trống.', flags: 64 });
    }

    const cfg = await ConfigService.getServerConfig(guild.id);
    if (!cfg || !cfg.receive_order_channel_id) {
      return interaction.reply({
        content: '❌ Quản trị viên chưa thiết lập kênh nhận đơn (`/setupnhandon`).',
        flags: 64
      });
    }

    const receiveChannel = guild.channels.cache.get(cfg.receive_order_channel_id) ||
      await guild.channels.fetch(cfg.receive_order_channel_id).catch(() => null);
    if (!receiveChannel) {
      return interaction.reply({ content: '❌ Kênh nhận đơn không tồn tại hoặc bot thiếu quyền truy cập.', flags: 64 });
    }

    const { orderId } = await OrderService.createOrder({
      guildId: guild.id,
      userId,
      items,
      totalAmount: total,
      orderType: 'FOOD_DRINK'
    });

    // Clear cart upon submitting order
    await OrderService.clearCart(userId, guild.id);

    const staffEmbed = BotEmbeds.staffNewOrder({
      orderId,
      buyerTag: interaction.user.tag,
      buyerId: userId,
      items,
      total,
      orderType: 'FOOD_DRINK'
    });

    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_reject:${orderId}`)
        .setLabel('Từ chối nhận đơn')
        .setEmoji(EMOJI_IDS.x)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`staff_accept:${orderId}`)
        .setLabel('Nhận đơn')
        .setEmoji(EMOJI_IDS.check)
        .setStyle(ButtonStyle.Success)
    );

    await receiveChannel.send({
      content: cfg.staff_role_id ? `<@&${cfg.staff_role_id}> Có đơn hàng mới từ giỏ!` : 'Có đơn hàng mới!',
      embeds: [staffEmbed],
      components: [staffRow]
    });

    return interaction.reply({
      content: `✅ Đã gửi toàn bộ đơn hàng trong giỏ (\`${orderId}\`, tổng: **${formatKc(total)} kc**) tới kênh tiếp nhận!`,
      flags: 64
    });
  }

  // 9. Staff Action: Accept Order
  if (customId.startsWith('staff_accept:')) {
    const orderId = customId.split(':')[1];
    const cfg = await ConfigService.getServerConfig(guild.id);

    // Verify staff role
    if (cfg && cfg.staff_role_id) {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(cfg.staff_role_id)) {
        return interaction.reply({
          content: `❌ Chỉ nhân viên có role <@&${cfg.staff_role_id}> mới được quyền nhận đơn này.`,
          flags: 64
        });
      }
    }

    const result = await OrderService.acceptOrder(orderId, userId);
    if (!result.success) {
      return interaction.reply({
        content: `❌ Không thể nhận đơn (${result.reason || 'Đã được xử lý trước đó'}).`,
        flags: 64
      });
    }

    const order = await OrderService.getOrder(orderId);

    // Disable buttons on staff message
    await interaction.update({
      content: `✅ **Đơn hàng \`${orderId}\` đã được nhận bởi <@${userId}>.**`,
      components: []
    });

    // Notify Customer with Bill & Payment Button
    try {
      const buyer = await interaction.client.users.fetch(order.user_id);
      if (buyer) {
        const billEmbed = BotEmbeds.customerBill({
          orderId: order.id,
          staffTag: interaction.user.tag,
          items: order.items || [],
          total: order.total_amount,
          orderType: order.order_type,
          channelName: order.channel_name
        });

        const payRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`pay_order:${order.id}`)
            .setLabel('Thanh toán')
            .setEmoji(EMOJI_IDS.vuongMien)
            .setStyle(ButtonStyle.Success)
        );

        // Send bill in buyer DM or Order channel
        let targetChan = null;
        if (cfg && cfg.order_channel_id) {
          targetChan = guild.channels.cache.get(cfg.order_channel_id);
        }

        if (targetChan) {
          await targetChan.send({
            content: `<@${order.user_id}> Đơn hàng của bạn đã được nhân viên tiếp nhận!`,
            embeds: [billEmbed],
            components: [payRow]
          });
        } else {
          await buyer.send({ embeds: [billEmbed], components: [payRow] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error notifying customer:', err);
    }
    return;
  }

  // 10. Staff Action: Reject Order
  if (customId.startsWith('staff_reject:')) {
    const orderId = customId.split(':')[1];
    const cfg = await ConfigService.getServerConfig(guild.id);

    // Verify staff role
    if (cfg && cfg.staff_role_id) {
      const member = interaction.member;
      if (!member || !member.roles.cache.has(cfg.staff_role_id)) {
        return interaction.reply({
          content: `❌ Chỉ nhân viên có role <@&${cfg.staff_role_id}> mới được quyền từ chối đơn.`,
          flags: 64
        });
      }
    }

    const result = await OrderService.rejectOrder(orderId, userId);
    if (!result.success) {
      return interaction.reply({
        content: `❌ Không thể từ chối đơn (${result.reason || 'Đã được xử lý'}).`,
        flags: 64
      });
    }

    const order = await OrderService.getOrder(orderId);

    await interaction.update({
      content: `❌ **Đơn hàng \`${orderId}\` đã bị từ chối bởi <@${userId}>.**`,
      components: []
    });

    // Notify customer
    try {
      const buyer = await interaction.client.users.fetch(order.user_id);
      if (buyer) {
        await buyer.send(`❌ Đơn hàng **\`${orderId}\`** của bạn đã bị từ chối bởi nhân viên. Không có khoản tiền nào bị trừ.`).catch(() => {});
      }
    } catch (_) {}
    return;
  }

  // 11. Customer Payment Action (ATOMIC, ANTI-DOUBLE-PAYMENT)
  if (customId.startsWith('pay_order:')) {
    const orderId = customId.split(':')[1];

    // Execute atomic payment in transaction
    const payment = await EconomyService.payOrder({
      orderId,
      buyerId: userId,
      guildId: guild ? guild.id : 'DM'
    });

    if (!payment.success) {
      return interaction.reply({
        content: payment.message,
        flags: 64
      });
    }

    // Success response
    let houseCreatedName = null;

    // Handle Buy House if orderType is BUY_HOUSE
    if (payment.order.order_type === 'BUY_HOUSE' && guild) {
      const houseResult = await PrivateChannelService.createChannel({
        guild,
        ownerId: userId,
        channelName: payment.order.channel_name || 'phong-rieng',
        orderId,
        clientUserId: interaction.client.user.id
      });

      if (houseResult.success) {
        houseCreatedName = houseResult.channel.name;
      }
    }

    const successEmbed = BotEmbeds.paymentSuccess({
      orderId,
      amount: payment.paidAmount,
      txId: payment.txId,
      orderType: payment.order.order_type,
      channelName: houseCreatedName || payment.order.channel_name,
      guild
    });

    // Disable pay button on the bill and show VIP payment success embed
    try {
      await interaction.update({
        embeds: [successEmbed],
        components: []
      });
    } catch (_) {
      await interaction.reply({ embeds: [successEmbed], flags: 64 });
    }

    return;
  }

  // 12. Server Check Pagination (*Pchecksv)
  if (customId.startsWith('svpage:')) {
    const [, pageStr, ownerId] = customId.split(':');
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Bạn không có quyền chuyển trang này.', flags: 64 });
    }

    const page = parseInt(pageStr, 10);
    const guilds = Array.from(interaction.client.guilds.cache.values());
    const totalPages = guilds.length;

    if (page < 0 || page >= totalPages) return;

    const currentGuild = guilds[page];
    const botMember = currentGuild.members.me;
    const isBotAdmin = botMember ? botMember.permissions.has(PermissionFlagsBits.Administrator) : false;

    const embed = BotEmbeds.serverCheckPage({
      page: page + 1,
      totalPages,
      guild: currentGuild,
      isBotAdmin,
      memberCount: currentGuild.memberCount,
      ownerTag: currentGuild.ownerId,
      joinedAt: botMember ? botMember.joinedAt : null
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`svpage:${page - 1}:${ownerId}`)
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`svpage:${page + 1}:${ownerId}`)
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1)
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  // 13. Election System Buttons
  if (customId.startsWith('election_reg_')) {
    const electionId = customId.replace('election_reg_', '');
    try {
      await ElectionService.registerCandidate({
        electionId,
        userId,
        userTag: interaction.user.tag,
        member: interaction.member
      });

      return interaction.reply({
        content: `🎉 Chúc mừng bạn đã đăng ký tranh cử Mod thành công trong đợt bầu cử \`${electionId}\`! Hãy kêu gọi các thành viên bình chọn cho bạn.`,
        flags: 64
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
    }
  }

  if (customId.startsWith('election_vote_')) {
    const electionId = customId.replace('election_vote_', '');
    const candidates = await ElectionService.getCandidates(electionId);

    if (!candidates || candidates.length === 0) {
      return interaction.reply({
        content: 'ℹ️ Hiện tại chưa có ứng viên nào đăng ký tham gia đợt tranh cử này.',
        flags: 64
      });
    }

    const rows = [];
    let currentRow = new ActionRowBuilder();

    candidates.forEach((cand, idx) => {
      if (currentRow.components.length === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`eleccast:${electionId}:${cand.id}`)
          .setLabel(`${idx + 1}. ${cand.user_tag.slice(0, 15)} (${cand.votes_count} phiếu)`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    return interaction.reply({
      content: '🗳️ **CHỌN ỨNG VIÊN BẠN MUỐN BỎ PHIẾU BÊN DƯỚI:**\n*(Mỗi thành viên chỉ được bỏ 1 phiếu duy nhất và không thể tự bầu cho chính mình)*',
      components: rows,
      flags: 64
    });
  }

  if (customId.startsWith('eleccast:')) {
    const [, electionId, candidateIdStr] = customId.split(':');
    const candidateId = parseInt(candidateIdStr, 10);

    try {
      const res = await ElectionService.vote({
        electionId,
        voterId: userId,
        candidateId
      });

      return interaction.update({
        content: `✅ Bạn đã bỏ phiếu thành công cho ứng viên **${res.candidateName}**! Tổng số phiếu hiện tại: **${res.newVotes}**`,
        components: []
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
    }
  }

  if (customId.startsWith('election_close_')) {
    const electionId = customId.replace('election_close_', '');
    if (userId !== config.BOT_ADMIN_ID) {
      return interaction.reply({
        content: '❌ Chỉ Admin tối cao mới có quyền đóng đợt tranh cử và công bố kết quả!',
        flags: 64
      });
    }

    try {
      const res = await ElectionService.closeElection({
        electionId,
        guild,
        adminId: userId
      });

      let winnerText = 'Không có ứng viên tham gia.';
      if (res.winner) {
        winnerText = `👑 Người chiến thắng: <@${res.winner.user_id}> (${res.winner.user_tag}) với **${res.winner.votes_count} phiếu bầu**!\nĐã tự động cấp role **Mod thực tập (MTT)**!`;
      }

      await interaction.channel.send({
        content: `@everyone 📢 **KẾT QUẢ ĐẠI HỘI TRANH CỬ MOD (\`${electionId}\`):**\n\n${winnerText}`
      });

      return interaction.reply({
        content: `✅ Đã đóng đợt tranh cử và công bố kết quả thành công!`,
        flags: 64
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
    }
  }

  // 12. Help Navigation Buttons
  if (customId === 'help_view_game') {
    const embed = BotEmbeds.helpGameSection(guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_view_admin')
        .setLabel('Lệnh Admin & Mod 🔒')
        .setEmoji(EMOJI_IDS.vuongMien)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('help_view_home')
        .setLabel('Trang Chủ')
        .setEmoji(EMOJI_IDS.rabbit12)
        .setStyle(ButtonStyle.Secondary)
    );
    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (customId === 'help_view_admin') {
    const isBotAdmin = ModService.isAdmin(userId) || userId === config.BOT_ADMIN_ID || userId === '1402913586853974156';
    const isMod = await ModService.isMod(userId, guild);

    if (!isBotAdmin && !isMod) {
      return interaction.reply({
        content: `${EMOJIS.x} **Từ chối quyền:** Nút lệnh Admin đã bị khóa 🔒!\nChỉ **Admin** (1402913586853974156) hoặc **Mod** có role Mod được thiết lập mới có thể mở và xem danh mục lệnh quản trị này.`,
        flags: 64
      });
    }

    const embed = BotEmbeds.helpAdminSection(guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_view_game')
        .setLabel('Lệnh Chơi Game')
        .setEmoji(EMOJI_IDS.sparkle10)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('help_view_home')
        .setLabel('Trang Chủ')
        .setEmoji(EMOJI_IDS.rabbit12)
        .setStyle(ButtonStyle.Secondary)
    );
    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (customId === 'help_view_home') {
    const embed = BotEmbeds.helpMenu(guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('help_view_game')
        .setLabel('Lệnh Chơi Game')
        .setEmoji(EMOJI_IDS.sparkle10)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('help_view_admin')
        .setLabel('Lệnh Admin & Mod 🔒')
        .setEmoji(EMOJI_IDS.vuongMien)
        .setStyle(ButtonStyle.Primary)
    );
    return interaction.update({ embeds: [embed], components: [row] });
  }

  // 13. Join Company via Button (*Pcty)
  if (customId.startsWith('btn_join_cty:')) {
    const companyIdStr = customId.split(':')[1];
    const companyId = parseInt(companyIdStr, 10);

    try {
      const company = await CompanyService.getCompanyById(companyId);
      if (!company) {
        return interaction.reply({ content: '❌ Công ty này không còn tồn tại.', flags: 64 });
      }

      await CompanyService.joinCompany({
        userId,
        companyName: company.name,
        guild
      });

      return interaction.reply({
        content: `🎉 Chúc mừng bạn đã gia nhập thành công **${company.name}**! Phí gia nhập: **${formatKc(company.entry_fee)} kc**. Bạn đã được cấp chức vụ **Nhân viên thực tập (NVTT)**!`,
        flags: 64
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
    }
  }

  // 14. Claim Phat Loc Giveaway
  if (customId.startsWith('claim_phatloc:')) {
    const giveawayId = customId.split(':')[1];

    try {
      const res = await EconomyService.claimPhatloc({
        giveawayId,
        claimerId: userId
      });

      // Update original message to show claimed
      await interaction.update({
        content: `${EMOJIS.sparkle10} Chúc mừng <@${userId}> đã nhanh tay nhận được gói phát lộc **+${formatKc(res.amount)} KC** từ <@${res.creatorId}>!`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('phatloc_done')
              .setLabel(`Đã được nhận bởi @${interaction.user.username}`)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          )
        ]
      });

      return interaction.followUp({
        content: `${EMOJIS.check} Bạn đã nhận thành công **+${formatKc(res.amount)} KC** vào ví! Chúc bạn may mắn.`,
        flags: 64
      });
    } catch (err) {
      return interaction.reply({ content: `${EMOJIS.x} ${err.message}`, flags: 64 });
    }
  }

  // 15. View Company Select Menu (*Pcty)
  if (customId === 'btn_open_company_select') {
    const companies = await CompanyService.listCompanies();
    if (!companies || companies.length === 0) {
      return interaction.reply({
        content: '❌ Hiện tại chưa có công ty nào đang hoạt động.',
        flags: 64
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_company_to_join')
      .setPlaceholder('🏢 Chọn một công ty để xem và nộp đơn...')
      .addOptions(
        companies.slice(0, 25).map((c) => ({
          label: `🏢 ${c.name}`.slice(0, 100),
          description: `Phí: ${formatKc(c.entry_fee)} kc • Lương: ${formatKc(c.work_salary_min)}-${formatKc(c.work_salary_max)} kc • Lương ngày: +${formatKc(c.daily_salary)} kc`.slice(0, 100),
          value: `c_${c.id}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.reply({
      content: '🏢 **DANH SÁCH CÔNG TY ĐANG HOẠT ĐỘNG**\nVui lòng chọn công ty bạn muốn xin vào làm việc:',
      components: [row],
      flags: 64
    });
  }

  // 16. Confirm Apply to Company
  if (customId.startsWith('btn_confirm_apply_cty:')) {
    const companyIdStr = customId.split(':')[1];
    const companyId = parseInt(companyIdStr, 10);

    try {
      const company = await CompanyService.getCompanyById(companyId);
      if (!company) {
        return interaction.reply({ content: '❌ Công ty này không còn hoạt động hoặc không tồn tại.', flags: 64 });
      }

      // Check if user is already in a company
      const activeMember = await CompanyService.getActiveMember(userId);
      if (activeMember) {
        return interaction.reply({
          content: '❌ Bạn đang thuộc một công ty khác.',
          flags: 64
        });
      }

      // Check if user already has a pending application
      const pending = await CompanyService.getPendingApplication(userId);
      if (pending) {
        return interaction.reply({
          content: `❌ Bạn đang có đơn xin vào công ty "${pending.company_name}" đang chờ duyệt! Vui lòng chờ kết quả trước khi nộp đơn khác.`,
          flags: 64
        });
      }

      // Check review channel setup
      const reviewChannelId = await RoleConfigService.getCompanyReviewChannel(guild.id);
      if (!reviewChannelId) {
        return interaction.reply({
          content: '❌ Server chưa thiết lập kênh duyệt đơn công ty! Admin vui lòng dùng lệnh `/setupcty #kênh` để cài đặt.',
          flags: 64
        });
      }

      const reviewChannel = guild.channels.cache.get(reviewChannelId) ||
        await guild.channels.fetch(reviewChannelId).catch(() => null);
      if (!reviewChannel) {
        return interaction.reply({
          content: '❌ Không tìm thấy kênh duyệt đơn đã cài đặt! Admin vui lòng dùng lệnh `/setupcty #kênh` để cài đặt lại.',
          flags: 64
        });
      }

      // Check balance
      const balance = await EconomyService.getWallet(userId);
      if (balance < company.entry_fee) {
        return interaction.reply({
          content: '❌ Bạn không đủ KC để xin vào công ty.',
          flags: 64
        });
      }

      // Apply to company
      const result = await CompanyService.applyToCompany({
        guildId: guild.id,
        userId,
        companyId
      });

      // Gather profile stats
      const stats = await EconomyService.getUserProfileStats(userId, guild.id);

      // Create Review Embed
      const reviewEmbed = BotEmbeds.companyApplicationReviewEmbed({
        appId: result.applicationId,
        applicantId: userId,
        applicantTag: interaction.user.tag,
        companyName: company.name,
        entryFee: company.entry_fee,
        currentBalance: stats.currentBalance,
        totalEarned: stats.totalEarned,
        totalSpent: stats.totalSpent,
        privateChannelName: stats.privateChannelName,
        currentJob: stats.currentJob,
        workCount: stats.workCount,
        checkinDays: stats.checkinDays,
        checkinStreak: stats.checkinStreak,
        status: 'PENDING',
        createdAt: Date.now()
      });

      const reviewRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_app_approve:${result.applicationId}`)
          .setLabel('DUYỆT ĐƠN')
          .setEmoji(EMOJI_IDS.check)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`btn_app_reject:${result.applicationId}`)
          .setLabel('TỪ CHỐI')
          .setEmoji(EMOJI_IDS.x)
          .setStyle(ButtonStyle.Danger)
      );

      // Tag 2 role duyệt đơn là role Chủ tịch và role Thư kí (KHÔNG tag người gửi đơn)
      const roleCfg = await RoleConfigService.getRoleConfig(guild.id);
      const roleMentions = [];
      if (roleCfg?.role_ct) roleMentions.push(`<@&${roleCfg.role_ct}>`);
      if (roleCfg?.role_tk) roleMentions.push(`<@&${roleCfg.role_tk}>`);
      const mentionText = roleMentions.length > 0 ? roleMentions.join(' ') : '';

      await reviewChannel.send({
        content: `📋 **CÓ ĐƠN XIN VÀO CÔNG TY MỚI!** ${mentionText}\nNgười xin: **${interaction.user.tag}** (\`${userId}\`) | Công ty: **${company.name}**`,
        embeds: [reviewEmbed],
        components: [reviewRow]
      });

      return interaction.update({
        content: `✅ **NỘP ĐƠN THÀNH CÔNG!**\nĐơn xin vào **${company.name}** của bạn đã được gửi đến kênh xét duyệt. Phí xin vào (**${formatKc(company.entry_fee)} kc**) đã được tạm khóa trong ví và sẽ hoàn lại nếu đơn bị từ chối.`,
        embeds: [],
        components: []
      });
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
    }
  }

  // 17. Cancel Apply to Company
  if (customId === 'btn_cancel_apply_cty') {
    return interaction.update({
      content: '❌ Đã hủy nộp đơn xin vào công ty.',
      embeds: [],
      components: []
    });
  }

  // 18. Approve or Reject Company Application
  if (customId.startsWith('btn_app_approve:') || customId.startsWith('btn_app_reject:')) {
    const isApprove = customId.startsWith('btn_app_approve:');
    const appId = customId.split(':')[1];

    // Check permission: Thư kí (/setuproletk) or Chủ tịch (/setuprolect) or Bot Admin
    const roleConfig = await RoleConfigService.getRoleConfig(guild.id);
    const member = interaction.member;
    const hasRoleTk = roleConfig?.role_tk && member?.roles?.cache?.has(roleConfig.role_tk);
    const hasRoleCt = roleConfig?.role_ct && member?.roles?.cache?.has(roleConfig.role_ct);
    const isAdmin = userId === config.BOT_ADMIN_ID;

    if (!hasRoleTk && !hasRoleCt && !isAdmin) {
      return interaction.reply({
        content: '❌ Bạn không có quyền duyệt đơn xin vào công ty.',
        flags: 64
      });
    }

    try {
      if (isApprove) {
        const app = await CompanyService.approveApplication({
          appId,
          reviewerId: userId,
          guild,
          client: interaction.client
        });

        const stats = await EconomyService.getUserProfileStats(app.user_id, guild.id);
        const updatedEmbed = BotEmbeds.companyApplicationReviewEmbed({
          appId: app.application_id,
          applicantId: app.user_id,
          applicantTag: `<@${app.user_id}>`,
          companyName: app.company_name,
          entryFee: app.fee,
          currentBalance: stats.currentBalance,
          totalEarned: stats.totalEarned,
          totalSpent: stats.totalSpent,
          privateChannelName: stats.privateChannelName,
          currentJob: stats.currentJob,
          workCount: stats.workCount,
          checkinDays: stats.checkinDays,
          checkinStreak: stats.checkinStreak,
          status: 'APPROVED',
          processedBy: userId,
          processedAt: Date.now(),
          createdAt: app.created_at
        });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_app_done_app:${appId}`)
            .setLabel('ĐÃ DUYỆT')
            .setEmoji(EMOJI_IDS.check)
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`btn_app_rej_dis:${appId}`)
            .setLabel('TỪ CHỐI')
            .setEmoji(EMOJI_IDS.x)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        return await interaction.update({
          content: `✅ **HỒ SƠ ĐÃ ĐƯỢC DUYỆT BỞI <@${userId}>**`,
          embeds: [updatedEmbed],
          components: [disabledRow]
        });
      } else {
        const app = await CompanyService.rejectApplication({
          appId,
          reviewerId: userId,
          client: interaction.client
        });

        const stats = await EconomyService.getUserProfileStats(app.user_id, guild.id);
        const updatedEmbed = BotEmbeds.companyApplicationReviewEmbed({
          appId: app.application_id,
          applicantId: app.user_id,
          applicantTag: `<@${app.user_id}>`,
          companyName: app.company_name,
          entryFee: app.fee,
          currentBalance: stats.currentBalance,
          totalEarned: stats.totalEarned,
          totalSpent: stats.totalSpent,
          privateChannelName: stats.privateChannelName,
          currentJob: stats.currentJob,
          workCount: stats.workCount,
          checkinDays: stats.checkinDays,
          checkinStreak: stats.checkinStreak,
          status: 'REJECTED',
          processedBy: userId,
          processedAt: Date.now(),
          createdAt: app.created_at
        });

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_app_app_dis:${appId}`)
            .setLabel('DUYỆT ĐƠN')
            .setEmoji(EMOJI_IDS.check)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`btn_app_done_rej:${appId}`)
            .setLabel('ĐÃ TỪ CHỐI')
            .setEmoji(EMOJI_IDS.x)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        return await interaction.update({
          content: `❌ **HỒ SƠ ĐÃ BỊ TỪ CHỐI BỞI <@${userId}> (Đã hoàn lại phí)**`,
          embeds: [updatedEmbed],
          components: [disabledRow]
        });
      }
    } catch (err) {
      return interaction.reply({
        content: `❌ ${err.message}`,
        flags: 64
      });
    }
  }

  // 19. Withdraw Bot Fund (*Plondatebe)
  if (customId === 'btn_withdraw_fund') {
    const isAdmin = userId === config.BOT_ADMIN_ID || ModService.isAdmin(userId);
    const isMod = await ModService.isMod(userId, guild);

    if (!isAdmin && !isMod) {
      return interaction.reply({
        content: '❌ **Từ chối quyền:** Chỉ Admin và Mod mới có quyền rút tiền từ Lợn Đất của Em Bé!',
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_withdraw_fund')
      .setTitle('🐷 RÚT TIỀN TỪ LỢN ĐẤT EM BÉ');

    const amountInput = new TextInputBuilder()
      .setCustomId('withdraw_amount')
      .setLabel('Số kim cương muốn rút')
      .setPlaceholder('Ví dụ: 100k, 1m, 500000')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(20);

    const reasonInput = new TextInputBuilder()
      .setCustomId('withdraw_reason')
      .setLabel('Lý do rút tiền')
      .setPlaceholder('Ví dụ: Chi tiêu sự kiện, phát thưởng...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(100);

    modal.addComponents(
      new ActionRowBuilder().addComponents(amountInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }

  // 20. Confirm/Cancel Cap KC (*Pcapkc)
  if (customId.startsWith('capkc_confirm:')) {
    const parts = customId.split(':');
    const adminId = parts[1];
    const targetId = parts[2];
    const amountStr = parts[3];

    const isBotAdmin = ModService.isAdmin(userId) || userId === config.BOT_ADMIN_ID || userId === '1402913586853974156';
    if (userId !== adminId && !isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.x} Bạn không có quyền thao tác trên bảng xác nhận này (chỉ dành cho Admin <@${adminId}>).`,
        flags: 64
      });
    }

    try {
      const amount = BigInt(amountStr);

      await EconomyService.addWallet(
        targetId,
        amount,
        `ADMIN_GRANT_BY_${userId}`
      );

      dbManager.saveToDisk();

      const verifiedBalance = await EconomyService.getWallet(targetId);

      const embed = BotEmbeds.success(
        'CẤP KIM CƯƠNG THÀNH CÔNG',
        `Admin <@${userId}> đã cấp **+${formatKc(amount)} kc** cho <@${targetId}>!\n\n` +
        `• **Số dư ví hiện tại của người nhận:** **${formatKc(verifiedBalance)} kc**\n` +
        `*(Kim cương đã được cộng trực tiếp vào ví người nhận và lưu vĩnh viễn trên database)*`,
        guild
      );

      return await interaction.update({
        embeds: [embed],
        components: []
      });
    } catch (err) {
      return interaction.reply({
        content: `${EMOJIS.x} Đã xảy ra lỗi khi thực hiện cấp kim cương: ${err.message}`,
        flags: 64
      });
    }
  }

  if (customId.startsWith('capkc_cancel:')) {
    const parts = customId.split(':');
    const adminId = parts[1];
    const targetId = parts[2];

    const isBotAdmin = ModService.isAdmin(userId) || userId === config.BOT_ADMIN_ID || userId === '1402913586853974156';
    if (userId !== adminId && !isBotAdmin) {
      return interaction.reply({
        content: `${EMOJIS.x} Bạn không có quyền thao tác trên bảng xác nhận này.`,
        flags: 64
      });
    }

    const embed = BotEmbeds.error(
      'ĐÃ HỦY CẤP KIM CƯƠNG',
      `Admin <@${userId}> đã hủy bỏ yêu cầu cấp kim cương cho <@${targetId}>.`,
      guild
    );

    return await interaction.update({
      embeds: [embed],
      components: []
    });
  }
}


