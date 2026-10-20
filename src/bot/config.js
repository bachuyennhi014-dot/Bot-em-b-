/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Hardcoded Admin ID as required by specification
  BOT_ADMIN_ID: '1402913586853974156',
  ADMIN_IDS: ['1402913586853974156'],
  
  // Prefix
  PREFIX: process.env.PREFIX || '*P',
  
  // Bot Token & Client ID
  TOKEN: process.env.DISCORD_TOKEN || '',
  CLIENT_ID: process.env.CLIENT_ID || '',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  SQLITE_PATH: process.env.SQLITE_PATH || './data/bot.sqlite',
  
  // Default house (private channel) price in kim cuong (kc)
  DEFAULT_HOUSE_PRICE: parseInt(process.env.DEFAULT_HOUSE_PRICE || '200000', 10),
  
  // Food Menu
  FOOD_ITEMS: [
    { id: 'croissant', name: '🥐 Bánh sừng bò', price: 10000, emoji: '🥐' },
    { id: 'chocolate_cake', name: '🍫 Bánh socola', price: 20000, emoji: '🍫' },
    { id: 'cheese_cake', name: '🍰 Bánh kem cheses', price: 50000, emoji: '🍰' },
    { id: 'cheese', name: '🧀 Phô mai', price: 5000, emoji: '🧀' }
  ],
  
  // Drinks Menu
  DRINK_ITEMS: [
    { id: 'milk_tea', name: '🧋 Trà sữa', price: 15000, emoji: '🧋' },
    { id: 'lemon_tea', name: '🍋 Trà chanh', price: 10000, emoji: '🍋' },
    { id: 'matcha_latte', name: '🍵 Matcha latte', price: 20000, emoji: '🍵' },
    { id: 'peach_tea', name: '🍑 Trà đào', price: 15000, emoji: '🍑' },
    { id: 'mineral_water', name: '💧 Nước lọc', price: 1000, emoji: '💧' }
  ],

  // Currency label
  CURRENCY: 'kc',
  CURRENCY_NAME: 'kim cương',
  CURRENCY_ICON: '💎',

  // Bot Fund Title
  BOT_FUND_NAME: '🐷 Lợn đất của em bé'
};
