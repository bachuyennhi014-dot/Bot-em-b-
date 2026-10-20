/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder } from 'discord.js';
import { formatKc } from './timeParser.js';
import { config } from '../config.js';
import {
  EMOJIS,
  decorateTitle,
  getBottomDivider,
  getVipPaymentDecoration
} from '../config/emojis.js';

const EMBED_COLOR = 0xf7c0e3; // User requested #f7c0e3

function applyFooter(embed, guild) {
  return embed.setFooter({
    text: 'Ngọc Anh Nhã|helena19_05',
    iconURL: guild?.iconURL?.({ dynamic: true }) || undefined
  });
}

export class BotEmbeds {
  static success(title, description, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle(`${EMOJIS.check} ${title}`, 0))
      .setDescription(`${description}\n\n${getBottomDivider(0)}`);

    return applyFooter(embed, guild);
  }

  static error(title, description, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle(`${EMOJIS.x} ${title}`, 3))
      .setDescription(`${description}\n\n${getBottomDivider(1)}`);

    return applyFooter(embed, guild);
  }

  static orderMainMenu(userName, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('HỆ THỐNG ĐẶT HÀNG & DỊCH VỤ', 1))
      .setDescription(
        `Xin chào **${userName}**! ${EMOJIS.pinkHeartAniP2U}\nHãy chọn danh mục bạn muốn trải nghiệm bên dưới:\n\n` +
        `${EMOJIS.num1} **Đồ ăn** ➔ Các loại bánh ngọt, phô mai tươi ngon\n` +
        `${EMOJIS.num2} **Nước uống** ➔ Trà sữa, matcha, trà đào, nước giải khát\n` +
        `${EMOJIS.num3} **Nạp thẻ** ➔ Yêu cầu nạp kim cương vào ví cá nhân\n` +
        `${EMOJIS.num4} **Giỏ hàng** ➔ Xem và quản lý các món đang chọn\n` +
        `${EMOJIS.num5} **Mua nhà** ➔ Mua kênh riêng tư độc quyền cho bạn trên Discord\n\n` +
        getBottomDivider(0)
      );

    return applyFooter(embed, guild);
  }

  static foodMenu(guild) {
    const list = config.FOOD_ITEMS.map(
      (item, idx) => `**${idx + 1}.** ${item.name} ➔ **${formatKc(item.price)} kc**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('THỰC ĐƠN ĐỒ ĂN', 2))
      .setDescription(
        `Chọn món bạn muốn order từ danh sách bên dưới:\n\n${list}\n\n*Bấm vào nút chọn món tương ứng để nhập số lượng (1 - 999).*\n\n` +
        getBottomDivider(1)
      );

    return applyFooter(embed, guild);
  }

  static drinksMenu(guild) {
    const list = config.DRINK_ITEMS.map(
      (item, idx) => `**${idx + 1}.** ${item.name} ➔ **${formatKc(item.price)} kc**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('THỰC ĐƠN NƯỚC UỐNG', 3))
      .setDescription(
        `Chọn đồ uống bạn muốn order từ danh sách bên dưới:\n\n${list}\n\n*Bấm vào nút chọn món tương ứng để nhập số lượng (1 - 999).*\n\n` +
        getBottomDivider(2)
      );

    return applyFooter(embed, guild);
  }

  static itemPreview({ itemName, price, quantity, total, guild }) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('CHI TIẾT MÓN ĐÃ CHỌN', 4))
      .setDescription(`Kiểm tra lại thông tin đơn hàng của bạn trước khi tiếp tục:\n\n${getBottomDivider(3)}`)
      .addFields(
        { name: 'Tên món', value: `${itemName}`, inline: true },
        { name: 'Đơn giá', value: `${formatKc(price)} kc`, inline: true },
        { name: 'Số lượng', value: `${quantity}`, inline: true },
        { name: 'Thành tiền', value: `**${formatKc(total)} kc**`, inline: false }
      );

    return applyFooter(embed, guild);
  }

  static cartView(items, total, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('GIỎ HÀNG CỦA BẠN', 0));

    if (!items || items.length === 0) {
      embed.setDescription(
        `Giỏ hàng của bạn đang trống! Hãy chọn món từ thực đơn để thêm vào giỏ.\n\n${getBottomDivider(0)}`
      );
      return applyFooter(embed, guild);
    }

    const itemsText = items.map((it, idx) =>
      `**${idx + 1}.** ${it.item_name} × **${it.quantity}** = **${formatKc(it.quantity * it.price)} kc**`
    ).join('\n');

    embed
      .setDescription(
        `Các món trong giỏ hàng hiện tại:\n\n${itemsText}\n\n${getBottomDivider(0)}`
      )
      .addFields(
        { name: 'Tổng cộng', value: `**${formatKc(total)} kc**`, inline: false }
      );

    return applyFooter(embed, guild);
  }

  static staffNewOrder({ orderId, buyerTag, buyerId, items, total, orderType, channelName, guild }) {
    const itemsDescription =
      items.map((it) => `• ${it.item_name} × ${it.quantity} (${formatKc(it.price * it.quantity)} kc)`).join('\n') ||
      (orderType === 'BUY_HOUSE' ? `• Mua kênh riêng Discord: #${channelName}` : 'N/A');

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('ĐƠN HÀNG MỚI CẦN DUYỆT', 1))
      .setDescription(`Có đơn hàng mới đang chờ xử lý từ khách hàng:\n\n${getBottomDivider(1)}`)
      .addFields(
        { name: 'Mã đơn', value: `\`${orderId}\``, inline: true },
        { name: 'Khách hàng', value: `<@${buyerId}> (${buyerTag})`, inline: true },
        { name: 'Loại đơn', value: orderType === 'BUY_HOUSE' ? 'Mua nhà (Kênh riêng)' : 'Đồ ăn / Nước uống', inline: true },
        { name: 'Danh sách món', value: itemsDescription, inline: false },
        { name: 'Tổng thanh toán', value: `**${formatKc(total)} kc**`, inline: true },
        { name: 'Thời gian gửi', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      );

    return applyFooter(embed, guild);
  }

  static customerBill({ orderId, staffTag, items, total, orderType, channelName, guild }) {
    const itemsDescription =
      items.map((it) => `• ${it.item_name} × ${it.quantity} = **${formatKc(it.price * it.quantity)} kc**`).join('\n') ||
      (orderType === 'BUY_HOUSE' ? `• Mua kênh riêng Discord: #${channelName}` : 'N/A');

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('ĐƠN HÀNG ĐÃ ĐƯỢC TIẾP NHẬN', 2))
      .setDescription(
        `Nhân viên đã duyệt đơn hàng của bạn. Vui lòng bấm nút **Thanh toán** bên dưới để hoàn tất.\n\n` +
        getBottomDivider(2)
      )
      .addFields(
        { name: 'Mã đơn', value: `\`${orderId}\``, inline: true },
        { name: 'Nhân viên nhận đơn', value: staffTag || 'Nhân viên', inline: true },
        { name: 'Sản phẩm', value: itemsDescription, inline: false },
        { name: 'Tổng thanh toán', value: `**${formatKc(total)} kc**`, inline: false }
      );

    return applyFooter(embed, guild);
  }

  static paymentSuccess({ orderId, amount, txId, orderType, channelName, guild }) {
    const vipDecor = getVipPaymentDecoration();
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(`${EMOJIS.vip} ${EMOJIS.pinkCreditCard} THANH TOÁN THÀNH CÔNG ${EMOJIS.sao7Mau} ${EMOJIS.vuongMien}`)
      .setDescription(
        `${vipDecor}\n` +
        `**Cảm ơn bạn đã ủng hộ hệ thống! Giao dịch đã được ghi nhận.**\n\n` +
        `• **Mã giao dịch:** \`${txId}\`\n` +
        `• **Mã đơn hàng:** \`${orderId}\`\n` +
        `• **Số tiền thanh toán:** **${formatKc(amount)} kc**\n` +
        `• **Quỹ ghi nhận:** **${config.BOT_FUND_NAME}**\n` +
        (orderType === 'BUY_HOUSE' ? `• **Kênh riêng:** #${channelName || 'phong-rieng'}\n` : '') +
        `\n${getBottomDivider(0)}`
      );

    return applyFooter(embed, guild);
  }

  static topupCardSuccess({ topupId, amount, guild }) {
    const vipDecor = getVipPaymentDecoration();
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(`${EMOJIS.vip} ${EMOJIS.pinkCreditCard} NẠP THẺ THÀNH CÔNG ${EMOJIS.sao7Mau} ${EMOJIS.vuongMien}`)
      .setDescription(
        `${vipDecor}\n` +
        `**Yêu cầu nạp thẻ của bạn đã hoàn tất!**\n\n` +
        `• **Mã giao dịch:** \`${topupId}\`\n` +
        `• **Số kim cương nạp:** **${formatKc(amount)} kc**\n` +
        `• **Trạng thái:** ${EMOJIS.check} Thành công\n\n` +
        getBottomDivider(1)
      );

    return applyFooter(embed, guild);
  }

  static botFund({ balance, totalIncome, totalWithdrawn, transactionCount, guild }) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('Lợn đất của em bé', 3))
      .setDescription(
        `Quỹ chung của BOT được tích luỹ từ các đơn hàng thành công của người chơi.\n\n` +
        getBottomDivider(3)
      )
      .addFields(
        { name: 'Số dư quỹ hiện tại', value: `**${formatKc(balance)} kc**`, inline: false },
        { name: 'Tổng tiền đã thu', value: `**${formatKc(totalIncome)} kc**`, inline: true },
        { name: 'Tổng tiền đã rút', value: `**${formatKc(totalWithdrawn)} kc**`, inline: true },
        { name: 'Số giao dịch ghi nhận', value: `${transactionCount || 0}`, inline: true }
      );

    return applyFooter(embed, guild);
  }

  static serverCheckPage({ page, totalPages, guild, isBotAdmin, memberCount, ownerTag, joinedAt }) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('BOT SERVER LIST', 4))
      .setDescription(`Trang **${page} / ${totalPages}**\n\n${getBottomDivider(0)}`)
      .addFields(
        { name: 'Tên Server', value: `**${guild.name}**`, inline: false },
        { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
        { name: 'Thành viên', value: `${memberCount}`, inline: true },
        { name: 'Chủ server ID', value: `${guild.ownerId || 'N/A'}`, inline: true },
        { name: 'Trạng thái Bot', value: 'Online', inline: true },
        { name: 'Quyền Admin', value: isBotAdmin ? `${EMOJIS.check} Có (Administrator)` : `${EMOJIS.x} Không`, inline: true },
        { name: 'Loại server', value: guild.features?.includes('COMMUNITY') ? 'Community Public' : 'Private Server', inline: true },
        { name: 'Bot tham gia', value: joinedAt ? `<t:${Math.floor(new Date(joinedAt).getTime() / 1000)}:F>` : 'N/A', inline: false }
      );

    return applyFooter(embed, guild);
  }

  static helpMenu(guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('BẢNG HƯỚNG DẪN LỆNH DISCORD BOT', 5))
      .setDescription(
        `Chào mừng bạn đến với hệ thống Bot Game & Kinh Tế Server!\n` +
        `Tiền tố lệnh: \`${config.PREFIX}\` • Quỹ Bot: **${config.BOT_FUND_NAME}**\n` +
        `*Bấm nút bên dưới để xem [Lệnh chơi game] hoặc [Lệnh Admin] (bị khóa, chỉ Admin/Mod mới có thể mở và xem)!*\n\n` +
        getBottomDivider(1)
      )
      .addFields(
        {
          name: `${EMOJIS.num1} LỆNH CHƠI GAME & KINH TẾ (THÀNH VIÊN)`,
          value:
            `• \`${config.PREFIX}help\` : Hiển thị bảng hướng dẫn này.\n` +
            `• \`${config.PREFIX}oder\` : Mở menu đặt món & mua kênh riêng.\n` +
            `• \`${config.PREFIX}cty\` : Xem danh sách công ty & bấm nút xin vào.\n` +
            `• \`${config.PREFIX}vaocty <tên>\` : Gia nhập công ty (Role NVTT).\n` +
            `• \`${config.PREFIX}lmvc\` : Làm việc nhận lương (Cooldown 5s/lần).\n` +
            `• \`${config.PREFIX}checkvc\` : Xem hồ sơ công việc, chức vụ & tiến độ thăng chức.\n` +
            `• \`${config.PREFIX}dd\` : Điểm danh nhận thưởng KC mỗi ngày 1 lần.\n` +
            `• \`${config.PREFIX}lixi <số KC>\` : Lì xì kim cương (Tối đa 10M kc, hỗ trợ 100k, 5m, 1b).\n` +
            `• \`${config.PREFIX}give @user <số KC>\` : Chuyển kim cương cho thành viên khác.\n` +
            `• \`${config.PREFIX}phatloc <số KC>\` : Phát lộc cho người bấm nút nhanh nhất (Tối đa 1M).\n` +
            `• \`${config.PREFIX}gacha\` : Mở hệ thống Gacha quay ảnh.\n` +
            `• \`*Phs\` : Xem hồ sơ cá nhân toàn diện (KC, công ty, điểm danh, đơn hàng...).\n` +
            `• \`*Pvi\` : Thống kê biến động số dư ví (đã chi, kiếm hôm nay, đã tặng, đã nhận).`,
          inline: false
        },
        {
          name: `${EMOJIS.num2} LỆNH DÀNH CHO ADMIN & MOD (QUẢN TRỊ & BẢO MẬT) [ĐÃ KHÓA]`,
          value:
            `• Danh mục này chứa các lệnh quản trị nhạy cảm (xử phạt, cấp kim cương, quỹ bot, bầu cử Mod, thiết lập server...).\n` +
            `• **Quyền truy cập:** Nút lệnh Admin đã bị khóa bảo mật. Chỉ **Admin** hoặc **Mod** mới có thể bấm nút **[Lệnh Admin & Mod 🔒]** bên dưới để mở xem chi tiết!`,
          inline: false
        }
      );

    return applyFooter(embed, guild);
  }

  static helpGameSection(guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('LỆNH CHƠI GAME & KINH TẾ (THÀNH VIÊN)', 6))
      .setDescription(
        `Dưới đây là các lệnh dành cho người chơi và thành viên server:\nTiền tệ: **Kim Cương (KC)**\n\n` +
        getBottomDivider(2)
      )
      .addFields(
        {
          name: `${EMOJIS.sparkle10} Hệ Thống Công Ty & Thăng Chức`,
          value:
            `• \`${config.PREFIX}cty\` : Xem danh sách công ty kèm nút [Xem danh sách công ty].\n` +
            `• \`${config.PREFIX}vaocty <tên>\` : Gia nhập công ty (Một người chỉ ở 1 công ty).\n` +
            `• \`${config.PREFIX}lmvc\` : Làm việc nhận lương ngẫu nhiên (Cooldown 5 giây/lần).\n` +
            `• \`${config.PREFIX}checkvc\` : Xem chức vụ, tổng KC kiếm, KC hôm nay và tiến độ thăng chức.\n` +
            `*(Mốc thăng chức: NVTT: 20 -> NV: 40 -> TP: 50 -> TK: 60 -> CT: 150 (Đủ ĐK Tranh cử Mod) + Thưởng 100k KC)*`,
          inline: false
        },
        {
          name: `${EMOJIS.ribbon3} Điểm Danh & Tương Tác Tiền Tệ`,
          value:
            `• \`${config.PREFIX}dd\` : Điểm danh hàng ngày nhận thưởng KC (reset lúc 00:00).\n` +
            `• \`${config.PREFIX}lixi <số KC>\` : Lì xì vào kênh chat (Tối đa 10M, ví dụ: 100k, 5m, 1b).\n` +
            `• \`${config.PREFIX}give @user <số KC>\` : Chuyển KC trực tiếp cho người chơi khác.\n` +
            `• \`${config.PREFIX}phatloc <số KC>\` : Tạo túi phát lộc (Tối đa 1M) cho 1 người nhanh tay nhất.`,
          inline: false
        },
        {
          name: `${EMOJIS.kuromi8} Hồ Sơ & Ví Cá Nhân`,
          value:
            `• \`*Phs\` : Xem toàn bộ thông tin bản thân (KC, công ty, chức vụ, điểm danh, đơn hàng, kênh riêng, trạng thái mute).\n` +
            `• \`*Pvi\` : Xem chi tiết biến động ví (KC hiện có, đã chi, kiếm hôm nay, đã tặng, đã nhận).`,
          inline: false
        },
        {
          name: `${EMOJIS.hellokitty1} Mua Sắm & Kênh Riêng`,
          value:
            `• \`${config.PREFIX}oder\` : Mở menu gọi món ăn, nước uống và mua nhà (kênh Discord riêng tư).`,
          inline: false
        },
        {
          name: `🎰 Hệ Thống Gacha Quay Ảnh`,
          value:
            `• \`${config.PREFIX}gacha\` : Mở hệ thống Gacha quay ảnh ngẫu nhiên (Bấm nút [🎰 QUAY NÀO!] để nhận ảnh).`,
          inline: false
        }
      );

    return applyFooter(embed, guild);
  }

  static helpAdminSection(guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('LỆNH DÀNH CHO ADMIN & MOD', 0))
      .setDescription(
        `Bảng lệnh kiểm duyệt, bảo mật, thiết lập server và quản lý kinh tế:\n\n` +
        getBottomDivider(3)
      )
      .addFields(
        {
          name: `${EMOJIS.vuongMien} Quyền Hạn Mod & Admin`,
          value:
            `• \`${config.PREFIX}mute @user <thời gian>\` : Khóa quyền dùng bot (Ví dụ: \`10s\`, \`10p\`, \`2h\`, \`vv\`).\n` +
            `• \`${config.PREFIX}unmute @user\` : Gỡ lệnh khóa bot cho thành viên.\n` +
            `• \`${config.PREFIX}londatebe\` : Xem quỹ **${config.BOT_FUND_NAME}**.\n` +
            `• \`${config.PREFIX}addmod @user\` : Thêm Mod vào danh sách *(Chỉ Admin tối cao)*.`,
          inline: false
        },
        {
          name: `${EMOJIS.sao7Mau} Quản Trị Công Ty, Tranh Cử & Tiền Tệ (Chỉ Admin)`,
          value:
            `• \`${config.PREFIX}capkc @user <số kc>\` : Cấp KC không giới hạn cho người chơi.\n` +
            `• \`${config.PREFIX}tochuctranhcumod\` : Phát động bầu cử Mod có gắn thẻ @everyone tại kênh thông báo.\n` +
            `• \`${config.PREFIX}taocty <tên> <phí> <lương> <lương ngày>\` : Mở công ty mới.\n` +
            `• \`${config.PREFIX}bocty <tên>\` : Giải thể công ty (Đền bù 100M KC chia đều nhân viên).\n` +
            `• \`${config.PREFIX}duoivc @user <tên>\` : Sa thải nhân viên khỏi công ty.\n` +
            `• \`${config.PREFIX}checksv\` : Danh sách server bot kèm phân trang.`,
          inline: false
        },
        {
          name: `${EMOJIS.sparkle10} Slash Commands Cấu Hình Server`,
          value:
            `• \`/setupthongbao #kênh\` : Kênh thông báo chính thức.\n` +
            `• \`/odersetup #kênh @role\` : Thiết lập kênh order.\n` +
            `• \`/setupnhandon #kênh @role\` : Thiết lập kênh nhận đơn.\n` +
            `• \`/setupcty #kênh\` : Thiết lập kênh tiếp nhận hồ sơ xin việc.\n` +
            `• \`/setuprolemod\`, \`/setuprolemtt\`, \`/setuproletranhcumod\` : Role Mod & Tranh cử.\n` +
            `• \`/setuprolenv\`, \`/setuprolenvtt\`, \`/setuproletp\`, \`/setuprolect\`, \`/setuproletk\` : Role chức vụ công ty.`,
          inline: false
        },
        {
          name: `${EMOJIS.x} Chế Tài Xử Phạt Vi Phạm`,
          value:
            '• Người dùng không có quyền cố ý dùng lệnh Admin/Mod sẽ bị hệ thống **TỰ ĐỘNG MUTE BOT 10 PHÚT**.\n' +
            '• Dùng lệnh `*Poder` sai kênh thiết lập 3 lần sẽ bị phạt Mute bot 10 phút.',
          inline: false
        }
      );

    return applyFooter(embed, guild);
  }

  static companyListEmbed(companies, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('DANH SÁCH THÔNG TIN CÔNG TY', 1))
      .setDescription(
        `Tham gia công ty để đi làm nhận lương và thăng tiến chức vụ!\n` +
        `*Mỗi người chơi chỉ được làm việc tại 1 công ty duy nhất.*\n\n` +
        getBottomDivider(0)
      );

    if (!companies || companies.length === 0) {
      embed.setDescription(`Hiện tại chưa có công ty nào đang hoạt động.\n\n${getBottomDivider(0)}`);
      return applyFooter(embed, guild);
    }

    companies.forEach((c) => {
      embed.addFields({
        name: `${c.name}`,
        value:
          `• **Phí xin vào:** ${formatKc(c.entry_fee)} kc\n` +
          `• **Số nhân viên:** ${c.memberCount || 0} người\n` +
          `• **Lương mỗi ca:** ${formatKc(c.work_salary_min)} – ${formatKc(c.work_salary_max)} kc\n` +
          `• **Lương ngày:** +${formatKc(c.daily_salary)} kc/ngày\n` +
          `• **Chỉ tiêu:** Không giới hạn`,
        inline: false
      });
    });

    return applyFooter(embed, guild);
  }

  static companyApplyConfirmEmbed(company, memberCount, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('XIN VÀO CÔNG TY', 2))
      .setDescription(
        `**Tên công ty:** ${company.name}\n` +
        `• **Phí xin vào:** **${formatKc(company.entry_fee)} kc**\n` +
        `• **Lương mỗi ca:** **${formatKc(company.work_salary_min)} – ${formatKc(company.work_salary_max)} kc**\n` +
        `• **Lương ngày:** **+${formatKc(company.daily_salary)} kc/ngày**\n` +
        `• **Nhân viên hiện tại:** **${memberCount || 0} người**\n\n` +
        `*Bạn có muốn nộp đơn xin vào công ty này không?*\n` +
        `*(Phí gia nhập sẽ tạm khóa ngay khi xác nhận và được hoàn lại 100% nếu bị từ chối)*\n\n` +
        getBottomDivider(1)
      );

    return applyFooter(embed, guild);
  }

  static companyApplicationReviewEmbed({
    appId,
    applicantId,
    applicantTag,
    companyName,
    entryFee,
    currentBalance,
    totalEarned,
    totalSpent,
    privateChannelName,
    currentJob,
    workCount,
    checkinDays,
    checkinStreak,
    status = 'PENDING',
    processedBy = null,
    processedAt = null,
    createdAt = Date.now(),
    guild = null
  }) {
    let statusText = 'Đang chờ duyệt';

    if (status === 'APPROVED') {
      statusText = `${EMOJIS.check} ĐÃ DUYỆT`;
    } else if (status === 'REJECTED') {
      statusText = `${EMOJIS.x} ĐÃ TỪ CHỐI`;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('HỒ SƠ XIN VÀO CÔNG TY', 3))
      .setDescription(
        `• **Người xin:** ${applicantTag}\n` +
        `• **ID:** \`${applicantId}\`\n` +
        `• **Công ty xin vào:** **${companyName}**\n` +
        `• **KC hiện có:** **${formatKc(currentBalance)} kc**\n` +
        `• **KC đã kiếm:** **${formatKc(totalEarned)} kc**\n` +
        `• **KC đã chi:** **${formatKc(totalSpent)} kc**\n` +
        `• **Nhà / kênh riêng:** ${privateChannelName}\n` +
        `• **Công việc:** ${currentJob}\n` +
        `• **Số lần làm việc:** ${workCount} lần\n` +
        `• **Điểm danh:** ${checkinDays} ngày (Chuỗi: ${checkinStreak})\n` +
        `• **Phí xin vào:** **${formatKc(entryFee)} kc** *(Đã tạm khóa)*\n` +
        `• **Thời gian gửi:** <t:${Math.floor(createdAt / 1000)}:R>\n` +
        `• **Mã đơn:** \`${appId}\`\n\n` +
        `**Trạng thái:** ${statusText}\n\n` +
        getBottomDivider(2)
      );

    if (processedBy) {
      embed.addFields(
        { name: status === 'APPROVED' ? 'Người duyệt' : 'Người xử lý', value: `<@${processedBy}>`, inline: true },
        { name: 'Thời gian xử lý', value: processedAt ? `<t:${Math.floor(processedAt / 1000)}:F>` : 'Vừa xong', inline: true }
      );
    }

    return applyFooter(embed, guild);
  }

  static careerCheckEmbed(stats, userTag, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle(`HỒ SƠ CÔNG VIỆC — ${userTag}`, 4));

    if (!stats.hasCompany) {
      embed.setDescription(
        `${EMOJIS.x} Bạn hiện chưa tham gia công ty nào!\n` +
        `Hãy dùng lệnh \`${config.PREFIX}cty\` để xem danh sách và xin vào làm việc nhé.\n\n` +
        getBottomDivider(3)
      );
      return applyFooter(embed, guild);
    }

    const cdText = stats.cooldown.canWork
      ? `**Sẵn sàng làm việc ngay!**`
      : `Còn lại: **${Math.ceil(stats.cooldown.remainingMs / 60000)} phút** (<t:${Math.floor(stats.cooldown.nextAvailableAt / 1000)}:R>)`;

    const progressPercent = stats.targetWorkCount > 0
      ? Math.min(100, Math.floor((stats.currentWorkCount / stats.targetWorkCount) * 100))
      : 100;

    embed
      .setDescription(`Chi tiết lộ trình nghề nghiệp và tiến độ thăng tiến:\n\n${getBottomDivider(3)}`)
      .addFields(
        { name: 'Công ty', value: `**${stats.companyName}**`, inline: true },
        { name: 'Chức vụ hiện tại', value: `**${stats.rankTitle} (${stats.currentRank})**`, inline: true },
        { name: 'Trạng thái ca làm', value: cdText, inline: false },
        { name: 'KC kiếm hôm nay', value: `**${formatKc(stats.todayEarned)} kc**`, inline: true },
        { name: 'Tổng KC từ công việc', value: `**${formatKc(stats.totalEarned)} kc**`, inline: true },
        { name: 'Tổng số ca đã làm', value: `**${stats.totalWorkCount} ca**`, inline: true },
        {
          name: `Tiến độ thăng chức (${stats.nextRank})`,
          value: `**${stats.currentWorkCount} / ${stats.targetWorkCount}** ca làm (${progressPercent}%)\n` +
                 `*Mốc: TT: 20 | NV: 40 | TP: 50 | TK: 60 | CT: 150 (Đủ điều kiện tranh cử Mod)*`,
          inline: false
        }
      );

    return applyFooter(embed, guild);
  }

  static profileEmbed(summary, userTag, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle(`HỒ SƠ CÁ NHÂN — ${userTag}`, 5))
      .setDescription(`Mã định danh: \`${summary.userId}\`\n\n${getBottomDivider(0)}`)
      .addFields(
        { name: 'Số dư Ví', value: `**${formatKc(summary.balance)} kc**`, inline: true },
        { name: 'Công ty', value: summary.companyName || 'Chưa gia nhập', inline: true },
        { name: 'Chức vụ', value: summary.rank || 'Thành viên', inline: true },
        { name: 'Điểm danh', value: `Đã điểm danh **${summary.checkinCount}** ngày`, inline: true },
        { name: 'Lì xì', value: `Đã gửi **${formatKc(summary.lixiTotal)} kc**`, inline: true },
        { name: 'Phát lộc', value: `Đã tạo **${summary.phatlocCount}** gói`, inline: true },
        { name: 'Đơn hàng', value: `Đã tạo **${summary.ordersCount}** đơn`, inline: true },
        { name: 'Kênh riêng', value: summary.privateChannels.length > 0 ? summary.privateChannels.map(c => `#${c}`).join(', ') : 'Chưa có', inline: true },
        { name: 'Trạng thái Mute Bot', value: summary.isMuted ? `Đang bị khóa (${summary.muteExpiry})` : 'Bình thường', inline: true }
      );

    return applyFooter(embed, guild);
  }

  static walletStatsEmbed(stats, userTag, guild) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle(`CHI TIẾT VÍ TIỀN — ${userTag}`, 6))
      .setDescription(`Dữ liệu thống kê chuẩn xác từ lịch sử giao dịch:\n\n${getBottomDivider(1)}`)
      .addFields(
        { name: 'KC hiện có', value: `**${formatKc(stats.currentBalance)} kc**`, inline: false },
        { name: 'KC đã chi', value: `**${formatKc(stats.spent)} kc**`, inline: true },
        { name: 'KC kiếm hôm nay', value: `**${formatKc(stats.earnedToday)} kc**`, inline: true },
        { name: 'KC đã tặng', value: `**${formatKc(stats.given)} kc**`, inline: true },
        { name: 'KC đã nhận', value: `**${formatKc(stats.received)} kc**`, inline: true }
      );

    return applyFooter(embed, guild);
  }

  static phatlocEmbed({ giveawayId, creatorTag, creatorId, amount, guild }) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('PHÁT LỘC KIM CƯƠNG!', 0))
      .setDescription(
        `Người chơi <@${creatorId}> (${creatorTag}) vừa phát lộc may mắn!\n\n` +
        `• **Số tiền:** **+${formatKc(amount)} KC**\n` +
        `• **Thể lệ:** Chỉ **1 người duy nhất** bấm nút nhanh nhất sẽ nhận trọn số tiền này!\n\n` +
        `*Gói ID: \`${giveawayId}\`*\n\n` +
        getBottomDivider(2)
      );

    return applyFooter(embed, guild);
  }

  static capkcConfirm({ targetUser, amount, adminUser, guild }) {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(decorateTitle('XÁC NHẬN CẤP KIM CƯƠNG', 1))
      .setDescription(
        `Bạn có chắc chắn muốn cấp kim cương cho thành viên này không?\n\n` +
        `• **Người nhận:** <@${targetUser.id}> (\`${targetUser.tag || targetUser.username || targetUser.id}\`)\n` +
        `• **Số kim cương cấp:** **+${formatKc(amount)} kc**\n` +
        `• **Người thực hiện:** <@${adminUser.id}>\n\n` +
        `*Bấm nút **Có** bên dưới để chuyển kim cương vào ví người nhận.*\n\n` +
        getBottomDivider(1)
      );

    return applyFooter(embed, guild);
  }
}

