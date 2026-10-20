/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompanyService } from '../../services/companyService.js';
import { BotEmbeds } from '../../utils/embedBuilder.js';

export async function handlePcheckvc(message) {
  try {
    const stats = await CompanyService.getMemberCareerStats(message.author.id);
    const embed = BotEmbeds.careerCheckEmbed(stats, message.author.tag || message.author.username);
    return await message.reply({ embeds: [embed] });
  } catch (err) {
    return await message.reply(`❌ ${err.message}`);
  }
}
