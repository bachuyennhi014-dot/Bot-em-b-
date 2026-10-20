/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { config } from '../config.js';
import { Guard } from '../middleware/guard.js';
import { handlePoder } from './prefix/poder.js';
import { handlePmute } from './prefix/pmute.js';
import { handlePunmute } from './prefix/punmute.js';
import { handlePlondatebe } from './prefix/plondatebe.js';
import { handlePaddmod } from './prefix/paddmod.js';
import { handlePchecksv } from './prefix/pchecksv.js';
import { handlePhelp } from './prefix/phelp.js';
import { handlePcapkc } from './prefix/pcapkc.js';
import { handlePtochuctranhcumod } from './prefix/ptochuctranhcumod.js';
import { handlePtaocty } from './prefix/ptaocty.js';
import { handlePbocty } from './prefix/pbocty.js';
import { handlePduoivc } from './prefix/pduoivc.js';
import { handlePvaocty } from './prefix/pvaocty.js';
import { handlePlam } from './prefix/plam.js';
import { handlePcty } from './prefix/pcty.js';
import { handlePlmvc } from './prefix/plmvc.js';
import { handlePcheckvc } from './prefix/pcheckvc.js';
import { handlePdd } from './prefix/pdd.js';
import { handlePlixi } from './prefix/plixi.js';
import { handlePgive } from './prefix/pgive.js';
import { handlePphatloc } from './prefix/pphatloc.js';
import { handlePhs, handleMhs } from './prefix/phs.js';
import { handlePvi, handleMvi } from './prefix/pvi.js';
import { handlePtatbot } from './prefix/ptatbot.js';
import { handlePbatbot } from './prefix/pbatbot.js';
import { handlePodersetup } from './prefix/podersetup.js';
import { handlePsetupnhandon } from './prefix/psetupnhandon.js';
import { handlePsetupthongbao } from './prefix/psetupthongbao.js';
import { handlePsetupcty } from './prefix/psetupcty.js';
import { handlePsetuprole } from './prefix/psetuprole.js';
import { handlePchecksetup } from './prefix/pchecksetup.js';
import { handlePgacha } from './prefix/pgacha.js';
import { Logger } from '../utils/logger.js';

export async function handleMessage(message) {
  // Ignore bot messages
  if (message.author.bot) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();

  // Check direct shortcuts (*phs, *pvi and backwards compatible *mhs, *mvi)
  if (lower.startsWith('*phs') || lower.startsWith('*mhs')) {
    const isMuted = await Guard.isMutedAndBlock(message);
    if (isMuted) return;
    return await handlePhs(message);
  }

  if (lower.startsWith('*pvi') || lower.startsWith('*mvi')) {
    const isMuted = await Guard.isMutedAndBlock(message);
    if (isMuted) return;
    return await handlePvi(message);
  }

  // Direct shortcut for *capkc without P
  if (lower.startsWith('*capkc')) {
    const isMuted = await Guard.isMutedAndBlock(message);
    if (isMuted) return;
    const withoutStar = content.slice(1).trim();
    const args = withoutStar.split(/\s+/);
    args.shift();
    return await handlePcapkc(message, args);
  }

  const prefix = config.PREFIX; // *P
  const prefixLower = prefix.toLowerCase();

  // Check prefix (case-insensitive check for *p or *P)
  if (!lower.startsWith(prefixLower)) return;

  try {
    // 1. GLOBAL MUTE CHECK FOR ALL PREFIX COMMANDS
    const isMuted = await Guard.isMutedAndBlock(message);
    if (isMuted) return;

    // Parse command
    const withoutPrefix = content.slice(prefix.length).trim();
    const args = withoutPrefix.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    switch (commandName) {
      case 'help':
      case 'trogiup':
      case 'commands':
        await handlePhelp(message);
        break;

      case 'oder':
      case 'order':
        await handlePoder(message);
        break;

      case 'cty':
      case 'danhsachcty':
      case 'dscty':
        await handlePcty(message);
        break;

      case 'lmvc':
      case 'lamvc':
      case 'workvc':
        await handlePlmvc(message, args);
        break;

      case 'checkvc':
      case 'xemvc':
      case 'thongtinvc':
        await handlePcheckvc(message);
        break;

      case 'dd':
      case 'diemdanh':
      case 'checkin':
        await handlePdd(message);
        break;

      case 'lixi':
      case 'li-xi':
        await handlePlixi(message, args);
        break;

      case 'give':
      case 'chuyenkc':
      case 'tang':
        await handlePgive(message, args);
        break;

      case 'phatloc':
      case 'phat-loc':
        await handlePphatloc(message, args);
        break;

      case 'gacha':
      case 'pgacha':
        await handlePgacha(message);
        break;

      case 'hs':
      case 'phs':
      case 'mhs':
      case 'profile':
      case 'hoso':
        await handlePhs(message);
        break;

      case 'vi':
      case 'pvi':
      case 'mvi':
      case 'wallet':
        await handlePvi(message);
        break;

      case 'mute':
        await handlePmute(message, args);
        break;

      case 'unmute':
        await handlePunmute(message, args);
        break;

      case 'londatebe':
        await handlePlondatebe(message);
        break;

      case 'addmod':
        await handlePaddmod(message, args);
        break;

      case 'checksv':
      case 'servers':
        await handlePchecksv(message);
        break;

      case 'capkc':
      case 'pcapkc':
      case 'givekc':
        await handlePcapkc(message, args);
        break;

      case 'tochuctranhcumod':
      case 'tranhcumod':
        await handlePtochuctranhcumod(message);
        break;

      case 'taocty':
      case 'taocongty':
        await handlePtaocty(message, args);
        break;

      case 'bocty':
      case 'giaithecty':
        await handlePbocty(message, args);
        break;

      case 'duoivc':
      case 'duoinv':
        await handlePduoivc(message, args);
        break;

      case 'vaocty':
      case 'xinlam':
      case 'joincty':
        await handlePvaocty(message, args);
        break;

      case 'lam':
      case 'lamviec':
      case 'work':
        await handlePlam(message, args);
        break;

      case 'tatbot':
      case 'stopbot':
      case 'dungbot':
        await handlePtatbot(message);
        break;

      case 'batbot':
      case 'startbot':
      case 'chaybot':
        await handlePbatbot(message);
        break;

      case 'odersetup':
      case 'setupoder':
      case 'setuporder':
      case 'ordersetup':
        await handlePodersetup(message, args);
        break;

      case 'setupnhandon':
      case 'nhandonsetup':
        await handlePsetupnhandon(message, args);
        break;

      case 'setupthongbao':
      case 'thongbaosetup':
        await handlePsetupthongbao(message, args);
        break;

      case 'setupcty':
      case 'ctysetup':
        await handlePsetupcty(message, args);
        break;

      case 'setuprole':
        await handlePsetuprole(message, args);
        break;

      case 'setuprolemod':
        await handlePsetuprole(message, args, 'mod');
        break;

      case 'setuprolemtt':
        await handlePsetuprole(message, args, 'mtt');
        break;

      case 'setuproletranhcumod':
      case 'setuproletranhcu':
        await handlePsetuprole(message, args, 'tranhcumod');
        break;

      case 'setuprolenv':
        await handlePsetuprole(message, args, 'nv');
        break;

      case 'setuprolenvtt':
        await handlePsetuprole(message, args, 'nvtt');
        break;

      case 'setuproletp':
        await handlePsetuprole(message, args, 'tp');
        break;

      case 'setuprolect':
        await handlePsetuprole(message, args, 'ct');
        break;

      case 'setuproletk':
        await handlePsetuprole(message, args, 'tk');
        break;

      case 'checksetup':
      case 'setup':
      case 'caidat':
      case 'viewsetup':
        await handlePchecksetup(message);
        break;

      default:
        // Unknown command with *P prefix - do not crash
        break;
    }
  } catch (error) {
    Logger.error(`Error executing prefix command for message "${message.content}": ${error.message}`, error);
    await message.reply('❌ Đã xảy ra lỗi khi thực thi lệnh. Vui lòng thử lại sau.').catch(() => {});
  }
}
