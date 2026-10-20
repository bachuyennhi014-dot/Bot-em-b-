/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';
import { BotEmbeds } from '../utils/embedBuilder.js';
import { EconomyService } from '../services/economyService.js';
import { OrderService } from '../services/orderService.js';
import { ConfigService } from '../services/configService.js';
import { ModService } from '../services/modService.js';
import { formatKc, parseAmountToBigInt } from '../utils/timeParser.js';
import { EMOJIS, EMOJI_IDS, getVipPaymentDecoration } from '../config/emojis.js';

export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guild = interaction.guild;

  // 1. Quantity Modal
  if (customId.startsWith('modal_qty:')) {
    const [, itemId, ownerId] = customId.split(':');
    if (ownerId && ownerId !== userId) {
      return interaction.reply({ content: '❌ Thao tác không hợp lệ.', flags: 64 });
    }

    const rawQty = interaction.fields.getTextInputValue('qty_value').trim();
    const qty = parseInt(rawQty, 10);

    // Validate 1 -> 999 (No 0, negative, letters, or >999)
    if (!/^\d+$/.test(rawQty) || isNaN(qty) || qty <= 0 || qty > 999) {
      return interaction.reply({
        content: '❌ **Số lượng không hợp lệ!**\nVui lòng chỉ nhập số nguyên từ **1 đến 999** (không nhập chữ, số 0 hoặc số âm).',
        flags: 64
      });
    }

    const allItems = [...config.FOOD_ITEMS, ...config.DRINK_ITEMS];
    const item = allItems.find((i) => i.id === itemId);
    if (!item) {
      return interaction.reply({ content: '❌ Món không tồn tại.', flags: 64 });
    }

    const total = item.price * qty;
    const embed = BotEmbeds.itemPreview({
      itemName: item.name,
      price: item.price,
      quantity: qty,
      total
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_pay_money:${item.id}:${qty}:${userId}`)
        .setLabel('Thanh toán bằng tiền')
        .setEmoji(EMOJI_IDS.sparkle10)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`btn_pay_card:${item.id}:${qty}:${userId}`)
        .setLabel('Thanh toán bằng thẻ')
        .setEmoji(EMOJI_IDS.pinkCreditCard)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`btn_add_cart:${item.id}:${qty}:${userId}`)
        .setLabel('Thêm vào giỏ hàng')
        .setEmoji(EMOJI_IDS.ribbon3)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`btn_cancel:${userId}`)
        .setLabel('Hủy')
        .setEmoji(EMOJI_IDS.x)
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: 64
    });
  }

  // 2. Topup Modal
  if (customId.startsWith('modal_topup:')) {
    const rawAmount = interaction.fields.getTextInputValue('topup_amount').trim();
    const amount = parseInt(rawAmount, 10);

    if (!/^\d+$/.test(rawAmount) || isNaN(amount) || amount <= 0) {
      return interaction.reply({
        content: `${EMOJIS.x} Số kim cương nạp không hợp lệ! Vui lòng chỉ nhập số nguyên dương.`,
        flags: 64
      });
    }

    // Create TOPUP_PENDING record - NOT automatically credited
    const topup = await EconomyService.createTopupPending({
      userId,
      amount
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pay_topup_card:${topup.topupId}`)
        .setLabel('Thanh toán bằng thẻ')
        .setEmoji(EMOJI_IDS.pinkCreditCard)
        .setStyle(ButtonStyle.Primary)
    );

    const vipDecor = getVipPaymentDecoration();
    return interaction.reply({
      content:
        `${vipDecor}\n` +
        `${EMOJIS.pinkCreditCard} **YÊU CẦU NẠP THẺ ĐÃ ĐƯỢC TẠO**\n` +
        `• Mã giao dịch: \`${topup.topupId}\`\n` +
        `• Số kim cương yêu cầu: **${formatKc(amount)} kc**\n` +
        `• Trạng thái: **${topup.status}** (Chờ thanh toán qua cổng thẻ)\n\n` +
        `*Bấm nút bên dưới để xác nhận thanh toán thẻ.*`,
      components: [row],
      flags: 64
    });
  }

  // 3. Buy House (Private Channel) Modal
  if (customId.startsWith('modal_house:')) {
    const channelNameRaw = interaction.fields.getTextInputValue('house_channel_name').trim();
    const sanitizedName = channelNameRaw
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);

    if (!sanitizedName || sanitizedName.length < 3) {
      return interaction.reply({
        content: '❌ Tên kênh không hợp lệ (tối thiểu 3 ký tự, chỉ gồm chữ cái thường, số, dấu gạch ngang).',
        flags: 64
      });
    }

    if (!guild) {
      return interaction.reply({ content: '❌ Lệnh chỉ áp dụng trong server.', flags: 64 });
    }

    const cfg = await ConfigService.getServerConfig(guild.id);
    if (!cfg || !cfg.receive_order_channel_id) {
      return interaction.reply({
        content: '❌ Quản trị viên chưa thiết lập kênh nhận đơn (`/setupnhandon`). Không thể gửi yêu cầu mua nhà.',
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

    const price = cfg.house_price || config.DEFAULT_HOUSE_PRICE;

    // Create Order with status PENDING_ACCEPTANCE
    const { orderId } = await OrderService.createOrder({
      guildId: guild.id,
      userId,
      items: [{ id: 'house_channel', name: `🏠 Mua nhà (Kênh riêng: #${sanitizedName})`, quantity: 1, price }],
      totalAmount: price,
      orderType: 'BUY_HOUSE',
      channelName: sanitizedName
    });

    const staffEmbed = BotEmbeds.staffNewOrder({
      orderId,
      buyerTag: interaction.user.tag,
      buyerId: userId,
      items: [],
      total: price,
      orderType: 'BUY_HOUSE',
      channelName: sanitizedName,
      guild: interaction.guild
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
      content: cfg.staff_role_id ? `<@&${cfg.staff_role_id}> Có yêu cầu mua nhà mới!` : 'Có yêu cầu mua nhà mới!',
      embeds: [staffEmbed],
      components: [staffRow]
    });

    return interaction.reply({
      content:
        `${EMOJIS.sparkle10} **YÊU CẦU MUA NHÀ ĐÃ ĐƯỢC GỬI!**\n` +
        `• Mã đơn: \`${orderId}\`\n` +
        `• Tên phòng dự kiến: \`#${sanitizedName}\`\n` +
        `• Giá: **${formatKc(price)} kc**\n` +
        `Yêu cầu đang chờ nhân viên duyệt. Sau khi duyệt, bạn sẽ nhận được thông báo để thanh toán. Kênh riêng sẽ được bot tự động tạo sau khi thanh toán thành công!`,
      flags: 64
    });
  }

  // 4. Bot Fund Withdrawal Modal (*Plondatebe)
  if (customId === 'modal_withdraw_fund') {
    const isAdmin = userId === config.BOT_ADMIN_ID || ModService.isAdmin(userId);
    const isMod = await ModService.isMod(userId, guild);

    if (!isAdmin && !isMod) {
      return interaction.reply({
        content: `${EMOJIS.x} Bạn không có quyền thực hiện thao tác rút tiền từ Quỹ Lợn Đất.`,
        flags: 64
      });
    }

    const rawAmount = interaction.fields.getTextInputValue('withdraw_amount').trim();
    const reason = interaction.fields.getTextInputValue('withdraw_reason')?.trim() || 'Rút quỹ Lợn Đất bởi Admin/Mod';

    const parsed = parseAmountToBigInt(rawAmount);
    if (!parsed || parsed <= 0n) {
      return interaction.reply({
        content: `${EMOJIS.x} Số tiền rút không hợp lệ! Vui lòng nhập số hợp lệ (ví dụ: \`100k\`, \`1m\`, \`500000\`).`,
        flags: 64
      });
    }

    try {
      const result = await EconomyService.withdrawBotFund({
        userId,
        amount: parsed,
        reason
      });

      return interaction.reply({
        content:
          `${EMOJIS.vuongMien} **RÚT TIỀN TỪ LỢN ĐẤT EM BÉ THÀNH CÔNG!**\n\n` +
          `• Người thực hiện: <@${userId}>\n` +
          `• Số kim cương đã rút: **${formatKc(result.withdrawnAmount)} kc**\n` +
          `• Lý do: *${reason}*\n` +
          `• Mã giao dịch: \`${result.txId}\`\n` +
          `• Số dư quỹ Lợn Đất còn lại: **${formatKc(result.remainingFund)} kc**\n` +
          `• Số dư ví của bạn hiện tại: **${formatKc(result.newUserBalance)} kc**`,
        flags: 64
      });
    } catch (err) {
      return interaction.reply({
        content: `${EMOJIS.x} ${err.message}`,
        flags: 64
      });
    }
  }
}
