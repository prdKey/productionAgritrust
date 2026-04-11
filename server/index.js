import express from "express";
import http from "http";
import { sequelize } from "./models/index.js";
import { initSocket } from "./config/socket.js";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cookieParser from "cookie-parser";

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
   1. SECURITY HEADERS
========================= */
app.use(
  helmet({
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.disable("x-powered-by");

/* =========================
   2. CORS (IMPORTANT FIX)
========================= */
const corsOptions = {
  origin: ["http://localhost:5173", "https://agritrust.shop"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // IMPORTANT FOR PREFLIGHT

/* =========================
   3. BODY PARSER
========================= */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

/* =========================
   4. COOKIE + PARAMETER POLLUTION PROTECTION
========================= */
app.use(cookieParser());
app.use(hpp());

/* =========================
   5. RATE LIMITING (FIXED: skip OPTIONS)
========================= */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS", // 🔥 IMPORTANT FIX
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts." },
  skip: (req) => req.method === "OPTIONS",
});

app.use(globalLimiter);

/* =========================
   6. ROUTES
========================= */
app.use("/api/ratings", ratingRoute);
app.use("/api/flags", flagRoute);
app.use("/api/wallet", walletRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/addresses", addressRoute);
app.use("/api/sfuel", sfuelRoute);
app.use("/api/tokens", tokenRoute);
app.use("/api/products", productRoute);
app.use("/api/auth", authLimiter, authRoute);
app.use("/api/users", userRoute);
app.use("/api/orders", orderRoute);
app.use("/api/carts", cartRoute);

/* =========================
   7. SOCKET
========================= */
initSocket(server);

/* =========================
   8. START SERVER
========================= */
sequelize.sync().then(() => {
  server.listen(3001, () => {
    console.log("Server running on port 3001");
  });
});