import express from "express";
import http from "http";
import { sequelize } from "./models/index.js";
import { initSocket } from "./config/socket.js";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";

dotenv.config();

// Routes
import productRoute from "./routes/Product.route.js";
import authRoute from "./routes/Auth.route.js";
import userRoute from "./routes/User.route.js";
import orderRoute from "./routes/Order.route.js";
import cartRoute from "./routes/Cart.route.js";
import addressRoute from "./routes/Address.route.js";
import tokenRoute from "./routes/Token.route.js";
import sfuelRoute from "./routes/SFuel.route.js";
import ratingRoute from "./routes/Rating.route.js";
import notificationRoute from "./routes/Notification.route.js";
import walletRoute from "./routes/Wallet.route.js";
import flagRoute from "./routes/Flag.route.js";

const app = express();
const server = http.createServer(app);

/* =========================
   1. HIDE EXPRESS
========================= */
app.disable('x-powered-by');

/* =========================
   2. HELMET
========================= */
app.use(helmet());

/* =========================
   3. CORS
========================= */
app.use(cors({
  origin: ["https://agritrust.shop", "https://www.agritrust.shop", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

/* =========================
   4. BODY PARSER - Limit size
========================= */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* =========================
   5. RATE LIMITING
========================= */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts.' }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

/* =========================
   6. HTTP PARAMETER POLLUTION
========================= */
app.use(hpp());

/* =========================
   7. SQL INJECTION PROTECTION
   — Sequelize ay may built-in
     parameterized queries.
   — Huwag gumamit ng raw queries
     na may string concatenation.
   
   MALI:
   db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)
   
   TAMA (Sequelize):
   User.findOne({ where: { id: req.params.id } })
   
   Kung kailangan ng raw query:
   db.query('SELECT * FROM users WHERE id = ?', {
     replacements: [req.params.id],
     type: QueryTypes.SELECT
   })
========================= */

/* =========================
   8. ROUTES
========================= */
app.use("/api/ratings", ratingRoute);
app.use("/api/flags", flagRoute);
app.use("/api/wallet", walletRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/addresses", addressRoute);
app.use("/api/sfuel", sfuelRoute);
app.use("/api/tokens", tokenRoute);
app.use("/api/products", productRoute);
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/orders", orderRoute);
app.use("/api/carts", cartRoute);

/* =========================
   9. 404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* =========================
   10. GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (process.env.NODE_ENV === 'production') {
    return res.status(err.status || 500).json({
      error: 'Something went wrong.'
    });
  }

  return res.status(err.status || 500).json({
    error: err.message
  });
});

/* =========================
   11. SOCKET
========================= */
initSocket(server);

/* =========================
   12. START SERVER
========================= */
sequelize.sync().then(() => {
  server.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT || 3001}`);
  });
});