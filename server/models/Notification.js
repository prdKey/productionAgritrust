// models/Notification.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("ORDER", "DELIVERY", "SUCCESS", "ALERT", "INFO"),
    allowNull: false,
    defaultValue: "INFO",
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // ── NEW: which role panel should see this notification ───────────────────
  // BUYER    → buyer/user panel lang
  // SELLER   → seller panel lang
  // LOGISTICS → logistics panel lang
  // null     → fallback (show sa lahat, para sa old data)
  recipientRole: {
    type: DataTypes.ENUM("BUYER", "SELLER", "LOGISTICS"),
    allowNull: true,
    defaultValue: null,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "Notifications",
  timestamps: true,
});

export default Notification;