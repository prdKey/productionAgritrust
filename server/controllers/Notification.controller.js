// controllers/Notification.controller.js

import { Notification, User } from "../models/index.js";
import { Op } from "sequelize";

// ── createNotification ────────────────────────────────────────────────────────
// walletAddress  → wallet address ng recipient
// { type, title, message, orderId, recipientRole } → notification data
//
// recipientRole is REQUIRED so notifications are scoped to the correct panel:
//   "BUYER"     → buyer/user panel lang
//   "SELLER"    → seller panel lang
//   "LOGISTICS" → logistics panel lang
// ─────────────────────────────────────────────────────────────────────────────
export const createNotification = async (walletAddress, { type, title, message, orderId, recipientRole }) => {
  try {
    const user = await User.findOne({ where: { walletAddress } });
    if (!user) return;

    await Notification.create({
      userId:        user.id,
      type:          type    || "INFO",
      title,
      message,
      orderId:       orderId || null,
      recipientRole: recipientRole || null,
      read:          false,
    });
  } catch (err) {
    console.error("[createNotification] error:", err.message);
  }
};

// ── GET /api/notifications?role=BUYER|SELLER|LOGISTICS ───────────────────────
// I-filter by recipientRole para hindi mag-overlap ang notifications
// sa iba't ibang panel ng same user.
//
// Kung walang role query param → ibalik lahat (backward compat)
// Kung may role → ibalik lang yung matching recipientRole + null (old data)
// ─────────────────────────────────────────────────────────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.query.role?.toUpperCase() || null;

    const whereClause = { userId };

    if (role) {
      // Show notifications para sa specific role + null (old data without role tag)
      whereClause.recipientRole = { [Op.or]: [role, null] };
    }

    const notifications = await Notification.findAll({
      where:   whereClause,
      order:   [["createdAt", "DESC"]],
    });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      { where: { id: req.params.id, userId: req.user.id } }
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    const role = req.query.role?.toUpperCase() || null;
    const whereClause = { userId: req.user.id, read: false };
    if (role) whereClause.recipientRole = { [Op.or]: [role, null] };

    await Notification.update({ read: true }, { where: whereClause });
    res.json({ message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    await Notification.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/notifications/read ───────────────────────────────────────────
export const deleteAllRead = async (req, res) => {
  try {
    const role = req.query.role?.toUpperCase() || null;
    const whereClause = { userId: req.user.id, read: true };
    if (role) whereClause.recipientRole = { [Op.or]: [role, null] };

    await Notification.destroy({ where: whereClause });
    res.json({ message: "All read notifications deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};