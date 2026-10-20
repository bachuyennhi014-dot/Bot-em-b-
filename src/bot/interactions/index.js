/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Guard } from '../middleware/guard.js';
import { handleButtonInteraction } from './buttonHandler.js';
import { handleModalSubmit } from './modalHandler.js';
import { handleSelectMenuInteraction } from './selectMenuHandler.js';
import * as odersetupCmd from '../commands/slash/odersetup.js';
import * as setupnhandonCmd from '../commands/slash/setupnhandon.js';
import * as setupthongbaoCmd from '../commands/slash/setupthongbao.js';
import * as setupctyCmd from '../commands/slash/setupcty.js';
import * as checksetupCmd from '../commands/slash/checksetup.js';
import {
  modCmd,
  mttCmd,
  tranhcuCmd,
  nvCmd,
  nvttCmd,
  tpCmd,
  ctCmd,
  tkCmd
} from '../commands/slash/roleCommands.js';
import { Logger } from '../utils/logger.js';

export async function handleInteraction(interaction) {
  try {
    // 1. GLOBAL MUTE CHECK (Buttons, Modals, Slash Commands, Select Menus)
    const isMuted = await Guard.isMutedAndBlock(interaction);
    if (isMuted) return;

    // 2. Slash Commands
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      if (commandName === 'odersetup') {
        return await odersetupCmd.execute(interaction);
      }
      if (commandName === 'setupnhandon') {
        return await setupnhandonCmd.execute(interaction);
      }
      if (commandName === 'setupthongbao') {
        return await setupthongbaoCmd.execute(interaction);
      }
      if (commandName === 'setupcty') {
        return await setupctyCmd.execute(interaction);
      }
      if (commandName === 'checksetup') {
        return await checksetupCmd.execute(interaction);
      }
      if (commandName === 'setuprolemod') {
        return await modCmd.execute(interaction);
      }
      if (commandName === 'setuprolemtt') {
        return await mttCmd.execute(interaction);
      }
      if (commandName === 'setuproletranhcumod') {
        return await tranhcuCmd.execute(interaction);
      }
      if (commandName === 'setuprolenv') {
        return await nvCmd.execute(interaction);
      }
      if (commandName === 'setuprolenvtt') {
        return await nvttCmd.execute(interaction);
      }
      if (commandName === 'setuproletp') {
        return await tpCmd.execute(interaction);
      }
      if (commandName === 'setuprolect') {
        return await ctCmd.execute(interaction);
      }
      if (commandName === 'setuproletk') {
        return await tkCmd.execute(interaction);
      }
    }

    // 3. Select Menus
    if (interaction.isAnySelectMenu()) {
      return await handleSelectMenuInteraction(interaction);
    }

    // 4. Buttons
    if (interaction.isButton()) {
      return await handleButtonInteraction(interaction);
    }

    // 5. Modals
    if (interaction.isModalSubmit()) {
      return await handleModalSubmit(interaction);
    }
  } catch (error) {
    Logger.error(`Error handling interaction ${interaction.id}: ${error.message}`, error);

    const errorMsg = '❌ Đã xảy ra lỗi khi xử lý tương tác. Vui lòng thử lại sau.';
    if (interaction.isRepliable && interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMsg, flags: 64 }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMsg, flags: 64 }).catch(() => {});
      }
    }
  }
}
