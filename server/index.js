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

//Routes
import productRoute from "./routes/Product.route.js"
import authRoute from "./routes/Auth.route.js"
import userRoute from "./routes/User.route.js"
import orderRoute from "./routes/Order.route.js"
import cartRoute from "./routes/Cart.route.js"
import addressRoute from "./routes/Address.route.js"
import tokenRoute from "./routes/Token.route.js";
import sfuelRoute from "./routes/SFuel.route.js";
import ratingRoute from "./routes/Rating.route.js"
import notificationRoute from "./routes/Notification.route.js"
import walletRoute from "./routes/Wallet.route.js"
import flagRoute from "./routes/Flag.route.js"

const app = express();
const server = http.createServer(app);

// 1. Security Headers
app.use(helmet({
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
}));

// 2. Hide Express fingerprint
app.disable("x-powered-by");

// 3. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts." },
});

app.use(globalLimiter);

// 4. CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://agritrust.shop",
  ],
  credentials: true,
}));

// 5. Body Parser with size limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Prevent Parameter Pollution
app.use(hpp());

// Routes
app.use("/api/ratings", ratingRoute)
app.use("/api/flags", flagRoute)
app.use("/api/wallet", walletRoute)
app.use("/api/notifications", notificationRoute)
app.use("/api/addresses", addressRoute)
app.use("/api/sfuel", sfuelRoute);
app.use("/api/tokens", tokenRoute);
app.use("/api/products", productRoute)
app.use("/api/auth", authLimiter, authRoute)  // stricter limit on auth
app.use("/api/users", userRoute)
app.use("/api/orders", orderRoute)
app.use("/api/carts", cartRoute)

initSocket(server);

// Sync database & start server
sequelize.sync().then(() => {
  server.listen(3001, () => {
    console.log("Server running on port 3001");
  });
});