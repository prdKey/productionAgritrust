import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME     || "agritrust",
  process.env.DB_USER     || "agritrust_user",
  process.env.DB_PASSWORD || "@Agritrust2026.",
  {
    host:    process.env.DB_HOST || "agritrust.shop",
    port:    process.env.DB_PORT || 3306,   // ← dagdag
    dialect: "mysql",
  }
);

export default sequelize;