/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Danh sách 5 ảnh Gacha - Thay đổi URL tại đây nếu cần
export const GACHA_IMAGES = [
  'https://cdn.discordapp.com/attachments/1545910389676572753/1552354975114465380/1d22fa01e0bcbd1941aa73ff8cb64f02.jpg?ex=6ab54ebb&is=6ab3fd3b&hm=892597543f67cf51e1f9ebd83f6a32fec9e28ac4ef9e99e68f325b0eab7055',
  'https://cdn.discordapp.com/attachments/1545910389676572753/1552354974317543504/bd9ab96bf19fc51d96f89249318da317.jpg?ex=6ab54ebb&is=6ab3fd3b&hm=ca895ecb7d73e1137459563004d4f9771536fd935c6c85fa9a36cbdcfb168e9a',
  'https://cdn.discordapp.com/attachments/1545910389676572753/1552354973696921771/e8563fe4654316b90292ce670aeafee6.jpg?ex=6ab54ebb&is=6ab3fd3b&hm=6b9669f657a94e339d38e1101fe08b9928f17c2c3df19e12e180cc6cd55c3e01',
  'https://cdn.discordapp.com/attachments/1545910389676572753/1552354972908126268/cb793bd718799ef4728b0ecbb5445938.jpg?ex=6ab54eba&is=6ab3fd3a&hm=4b334dd0c4db296e6c07dabbb2c1294e80fd6fa3e608e381932dc1d59d7e47a2',
  'https://cdn.discordapp.com/attachments/1545910389676572753/1552354971184529488/60cf1ae484cba3bfa3ac5b4c350c5e75.jpg?ex=6ab54eba&is=6ab3fd3b&hm=14680d2934397ec6911db41e014e06837534d1b19d4f4b7e39d2eb7873b15011'
];

// Hình ảnh hòm Gacha trang trí mặc định
export const GACHA_CHEST_IMAGE = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80';

export function getRandomGachaImage() {
  return GACHA_IMAGES[Math.floor(Math.random() * GACHA_IMAGES.length)];
}

export async function handlePgacha(message) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('🎁 HÒM QUAY GACHA')
      .setDescription('Bấm nút **[🎰 QUAY NÀO!]** bên dưới để mở hòm và nhận ảnh ngẫu nhiên!')
      .setImage(GACHA_CHEST_IMAGE)
      .setFooter({ text: 'Hệ thống Gacha ngẫu nhiên • Chúc bạn may mắn!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha_spin')
        .setLabel('🎰 QUAY NÀO!')
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });
  } catch (err) {
    console.error('[GACHA] Error sending gacha menu:', err);
    message.reply('❌ Không thể mở hòm Gacha lúc này, vui lòng thử lại!').catch(() => {});
  }
}
