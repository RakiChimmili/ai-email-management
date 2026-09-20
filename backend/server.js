import dotenv from "dotenv";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";

import authRoutes from "./routes/authRoutes.js";
import gmailRoutes from "./routes/gmailRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:5173";

// Required when deployed behind Render's proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: "https://ai-email-management-eight.vercel.app",
    credentials: true
  })
);
app.use(express.json());
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

await redisClient.connect();

const redisStore = new RedisStore({
  client: redisClient,
});

app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none"
    }
  })
);

app.get("/", (req, res) => {
  res.send("MailAI Backend is running!");
});

app.use("/auth", authRoutes);

app.use("/api/gmail", gmailRoutes);

app.listen(PORT, () => {
  console.log(`MailAI backend running on port ${PORT}`);
});