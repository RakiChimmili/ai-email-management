import dotenv from "dotenv";
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
    origin: frontendUrl,
    credentials: true
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "lax"
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