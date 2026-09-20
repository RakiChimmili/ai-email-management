import express from "express";
import { google } from "googleapis";

import {
  getGoogleAuthUrl,
  getGoogleTokens
} from "../services/googleService.js";

const router = express.Router();

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:5173";

// Start Google Login
router.get("/google", (req, res) => {
  const authUrl = getGoogleAuthUrl();
  res.redirect(authUrl);
});

// Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    const tokens = await getGoogleTokens(code);

    req.session.googleTokens = tokens;

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth,
      version: "v2"
    });

    const { data } = await oauth2.userinfo.get();

    req.session.user = {
      id: data.id,
      name: data.name,
      email: data.email,
      picture: data.picture
    };

    // Redirect to frontend
    res.redirect(frontendUrl);

  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).send("Google login failed.");
  }
});

// Get logged-in Google account
router.get("/user", async (req, res) => {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        loggedIn: false
      });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials(req.session.googleTokens);

    const oauth2 = google.oauth2({
      auth,
      version: "v2"
    });

    const { data } = await oauth2.userinfo.get();

    res.json({
      loggedIn: true,
      name: data.name,
      email: data.email,
      picture: data.picture
    });

  } catch (error) {
    console.error("User info error:", error);

    res.status(500).json({
      message: "Failed to get Google account information"
    });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout failed"
      });
    }

    res.json({
      message: "Logged out successfully"
    });
  });
});

export default router;