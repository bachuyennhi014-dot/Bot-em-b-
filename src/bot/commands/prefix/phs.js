/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EconomyService } from '../../services/economyService.js';
import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';
import { EMOJIS } from '../../config/emojis.js';

export async function handlePhs(message) {
  try {
    const summary = await EconomyService.getUserProfileSummary(message.author.id);
    const careerStats = await CompanyService.getMemberCareerStats(message.author.id);

    summary.companyName = careerStats.hasCompany ? careerStats.companyName : 'Chưa gia nhập';
    summary.rank = careerStats.hasCompany ? `${careerStats.rankTitle} (${careerStats.currentRank})` : 'Thành viên';

    const embed = BotEmbeds.profileEmbed(summary, message.author.tag || message.author.username, message.guild);
    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`${EMOJIS.x} ${err.message}`);
  }
}

// Backwards compatibility alias
export const handleMhs = handlePhs;
