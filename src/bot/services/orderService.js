/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { dbManager } from '../database/db.js';
import { Logger } from '../utils/logger.js';
import { EconomyService } from './economyService.js';

export class OrderService {
  /**
   * Cart Operations (Stored persistently in database)
   */
  static async addToCart({ userId, guildId, item, quantity }) {
    await EconomyService.ensureUser(userId);
    const existing = await dbManager.get(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND guild_id = ? AND item_id = ?;',
      [userId, guildId, item.id]
    );

    const now = Date.now();
    let newQty = quantity;

    if (existing) {
      newQty = Math.min(999, existing.quantity + quantity);
      await dbManager.run(
        'UPDATE cart_items SET quantity = ?, price = ?, updated_at = ? WHERE id = ?;',
        [newQty, item.price, now, existing.id]
      );
    } else {
      await dbManager.run(
        `INSERT INTO cart_items (user_id, guild_id, item_id, item_name, quantity, price, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [userId, guildId, item.id, item.name, Math.min(999, quantity), item.price, now]
      );
    }

    await Logger.logAction({
      userId,
      action: 'CART_ADDED',
      guildId,
      metadata: { item_id: item.id, item_name: item.name, quantity: newQty }
    });

    return { success: true, quantity: newQty };
  }

  static async getCart(userId, guildId) {
    const items = await dbManager.all(
      'SELECT * FROM cart_items WHERE user_id = ? AND guild_id = ?;',
      [userId, guildId]
    );

    const total = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    return { items, total };
  }

  static async clearCart(userId, guildId) {
    await dbManager.run(
      'DELETE FROM cart_items WHERE user_id = ? AND guild_id = ?;',
      [userId, guildId]
    );
    await Logger.logAction({
      userId,
      action: 'CART_CLEARED',
      guildId
    });
  }

  static async removeFromCart(userId, guildId, itemId) {
    await dbManager.run(
      'DELETE FROM cart_items WHERE user_id = ? AND guild_id = ? AND item_id = ?;',
      [userId, guildId, itemId]
    );
    await Logger.logAction({
      userId,
      action: 'CART_REMOVED',
      guildId,
      metadata: { item_id: itemId }
    });
  }

  /**
   * Order Lifecycle Operations
   */
  static async createOrder({ guildId, userId, items, totalAmount, orderType = 'FOOD_DRINK', channelName = null }) {
    await EconomyService.ensureUser(userId);
    const orderId = `ORDER-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const now = Date.now();

    await dbManager.transaction(async (db) => {
      await db.run(
        `INSERT INTO orders (id, guild_id, user_id, total_amount, status, staff_id, order_type, channel_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'PENDING_ACCEPTANCE', NULL, ?, ?, ?, ?);`,
        [orderId, guildId, userId, totalAmount, orderType, channelName, now, now]
      );

      for (const it of items) {
        await db.run(
          `INSERT INTO order_items (order_id, item_id, item_name, quantity, price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [orderId, it.id || it.item_id, it.name || it.item_name, it.quantity, it.price, it.quantity * it.price]
        );
      }
    });

    await Logger.logAction({
      userId,
      action: 'ORDER_CREATED',
      amount: totalAmount,
      orderId,
      guildId,
      metadata: { orderType, itemCount: items.length }
    });

    return { orderId, totalAmount, status: 'PENDING_ACCEPTANCE' };
  }

  static async getOrder(orderId) {
    const order = await dbManager.get('SELECT * FROM orders WHERE id = ?;', [orderId]);
    if (!order) return null;

    const items = await dbManager.all('SELECT * FROM order_items WHERE order_id = ?;', [orderId]);
    return { ...order, items };
  }

  static async acceptOrder(orderId, staffId) {
    const order = await dbManager.get('SELECT * FROM orders WHERE id = ?;', [orderId]);
    if (!order) return { success: false, reason: 'NOT_FOUND' };
    if (order.status !== 'PENDING_ACCEPTANCE') {
      return { success: false, reason: 'INVALID_STATUS', currentStatus: order.status };
    }

    const now = Date.now();
    await dbManager.run(
      'UPDATE orders SET status = "ACCEPTED", staff_id = ?, updated_at = ? WHERE id = ?;',
      [staffId, now, orderId]
    );

    await Logger.logAction({
      userId: staffId,
      action: 'ORDER_ACCEPTED',
      orderId,
      guildId: order.guild_id
    });

    return { success: true };
  }

  static async rejectOrder(orderId, staffId) {
    const order = await dbManager.get('SELECT * FROM orders WHERE id = ?;', [orderId]);
    if (!order) return { success: false, reason: 'NOT_FOUND' };
    if (order.status !== 'PENDING_ACCEPTANCE') {
      return { success: false, reason: 'INVALID_STATUS', currentStatus: order.status };
    }

    const now = Date.now();
    await dbManager.run(
      'UPDATE orders SET status = "REJECTED", staff_id = ?, updated_at = ? WHERE id = ?;',
      [staffId, now, orderId]
    );

    await Logger.logAction({
      userId: staffId,
      action: 'ORDER_REJECTED',
      orderId,
      guildId: order.guild_id
    });

    return { success: true };
  }
}
