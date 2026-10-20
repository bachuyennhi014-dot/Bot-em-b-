/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function parseDuration(durationStr) {
  if (!durationStr) return null;
  const cleaned = durationStr.trim().toLowerCase();

  if (cleaned === 'vv' || cleaned === 'vinhvien' || cleaned === 'perm') {
    return {
      ms: null,
      isPermanent: true,
      label: 'Vĩnh viễn'
    };
  }

  const match = cleaned.match(/^(\d+)([sph])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (isNaN(value) || value <= 0) return null;

  switch (unit) {
    case 's':
      return {
        ms: value * 1000,
        isPermanent: false,
        label: `${value} giây`
      };
    case 'p':
      return {
        ms: value * 60 * 1000,
        isPermanent: false,
        label: `${value} phút`
      };
    case 'h':
      return {
        ms: value * 60 * 60 * 1000,
        isPermanent: false,
        label: `${value} giờ`
      };
    default:
      return null;
  }
}

export function formatKc(amount) {
  if (amount === null || amount === undefined) return '0';
  try {
    const raw = String(amount).trim();
    if (raw.includes('e+') || raw.includes('E+')) {
      const b = BigInt(Math.floor(Number(raw)));
      return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    const intPart = raw.split('.')[0].replace(/[^0-9-]/g, '');
    if (!intPart || intPart === '-') return '0';
    const b = BigInt(intPart);
    return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } catch (_) {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN');
  }
}

/**
 * Parse input string into a safe positive BigInt.
 * Supports:
 * - Direct integers: 1000, 10000000000
 * - Shorthand: 1k (1,000), 10m (10,000,000), 1b (1,000,000,000), 1t (1,000,000,000,000)
 * - Decimals with shorthand: 1.5b (1,500,000,000), 2.5m (2,500,000)
 * - Formatted numbers: 10.000.000.000, 10,000,000,000
 */
export function parseAmountToBigInt(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase().replace(/[,_]/g, '');

  // If formatted like 10.000.000.000 (Vietnamese dots), remove dots if multiple dots or dot between 3 digits
  const dotCount = (str.match(/\./g) || []).length;
  let normalizedStr = str;
  if (dotCount > 1 || /\.\d{3}/.test(str)) {
    // If it's a Vietnamese thousand separator, strip dots
    normalizedStr = str.replace(/\./g, '');
  }

  const match = normalizedStr.match(/^(\d+(?:\.\d+)?)\s*([kmbt])?$/i);
  if (!match) return null;

  const baseStr = match[1];
  const unit = (match[2] || '').toLowerCase();

  const multipliers = {
    k: 1_000n,
    m: 1_000_000n,
    b: 1_000_000_000n,
    t: 1_000_000_000_000n
  };

  if (!unit) {
    try {
      const intPart = baseStr.split('.')[0];
      const b = BigInt(intPart);
      return b > 0n ? b : null;
    } catch (_) {
      return null;
    }
  }

  const mult = multipliers[unit];
  if (!mult) return null;

  if (baseStr.includes('.')) {
    const [intPart, decPart] = baseStr.split('.');
    const decDigits = decPart.length;
    let factor = 1n;
    for (let i = 0; i < decDigits; i++) factor *= 10n;
    const totalInt = BigInt(intPart + decPart);
    const result = (totalInt * mult) / factor;
    return result > 0n ? result : null;
  } else {
    const result = BigInt(baseStr) * mult;
    return result > 0n ? result : null;
  }
}

/**
 * Parse amount shorthand such as 100k, 5m, 1b or plain numbers
 * k = 1.000, m = 1.000.000, b = 1.000.000.000
 */
export function parseAmountShorthand(input) {
  const big = parseAmountToBigInt(input);
  if (!big) return null;
  if (big <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(big);
  }
  return Number(Number.MAX_SAFE_INTEGER);
}
