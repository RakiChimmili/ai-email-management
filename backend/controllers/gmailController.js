import {
  getGmailMessages,
  toggleStar,
  archiveMessage,
  moveToInbox,
  trashMessage,
  getGmailDashboardStats,
  markAsRead,
  sendGmailMessage
} from "../services/gmailService.js";
import { createGmailClient } from "../services/googleService.js";
import {
  generateEmailOverview,
  generateEmailDraft
} from "../services/aiService.js";

export async function generateGmailDraft(req, res) {
  try {
    const { prompt, tone } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        message: "A description of the email is required."
      });
    }

    const draft = await generateEmailDraft(prompt.trim(), tone);

    res.json(draft);
  } catch (error) {
    console.error("AI email writer error:", error);

    let message = "AI provider request failed.";

    if (error?.message === "OPENAI_API_KEY is not configured.") {
      message = "AI service is not configured on the backend.";
    } else if (error?.status === 401) {
      message = "The backend OpenAI API key is invalid.";
    } else if (error?.status === 429) {
      message = "The AI service quota has been exceeded.";
    }

    res.status(500).json({
      message,
      code: error?.code || "AI_PROVIDER_ERROR"
    });
  }
}

export async function sendGmailMessageController(req, res) {
   console.log("SEND CONTROLLER REACHED");
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        message: "To, subject and body are required."
      });
    }

    const result = await sendGmailMessage(
      req.session.googleTokens,
      to,
      subject,
      body
    );

    res.json(result);

  } catch (error) {
    console.error("Send email error:", error);

    res.status(500).json({
      message: "Failed to send email."
    });
  }
}
export async function markGmailAsRead(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;

    const result = await markAsRead(
      req.session.googleTokens,
      id
    );

    res.json(result);

  } catch (error) {
    console.error("Mark as read error:", error);

    res.status(500).json({
      message: "Failed to mark email as read."
    });
  }
}

export async function getGmailMessagesController(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const folder = req.query.folder || "Inbox";
    const search = req.query.search || "";

    const allowedFolders = [
      "Inbox",
      "Starred",
      "Sent",
      "Archive",
      "Spam"
    ];

    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({
        message: "Invalid Gmail folder."
      });
    }

   const emails = await getGmailMessages(
  req.session.googleTokens,
  folder,
  search
);

    res.json(emails);
  } catch (error) {
    console.error("Gmail API error:", error);

    res.status(500).json({
      message: "Failed to fetch Gmail messages."
    });
  }
}

export async function getGmailEmailOverview(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;

    const gmail = createGmailClient(
      req.session.googleTokens
    );

    const response = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full"
    });

    const data = response.data;

    const headers = data.payload?.headers || [];

    const subject =
      headers.find(
        (header) =>
          header.name.toLowerCase() === "subject"
      )?.value || "(No Subject)";

    const body =
      data.snippet || "(No message content)";

    const overview = await generateEmailOverview(
      subject,
      body
    );

    res.json({
      overview
    });
  } catch (error) {
    console.error("Gmail AI Overview error:", error);

    res.status(500).json({
      message: "Failed to generate AI overview.",
      code: error?.code || "AI_PROVIDER_ERROR"
    });
  }
}
export async function toggleStarController(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;
    const { starred } = req.body;

    const result = await toggleStar(
      req.session.googleTokens,
      id,
      starred
    );

    res.json(result);
  } catch (error) {
    console.error("Toggle star error:", error);

    res.status(500).json({
      message: "Failed to update star status."
    });
  }
}

export async function archiveGmailMessage(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;

    const result = await archiveMessage(
      req.session.googleTokens,
      id
    );

    res.json(result);
  } catch (error) {
    console.error("Archive error:", error);

    res.status(500).json({
      message: "Failed to archive email."
    });
  }
}

export async function moveGmailToInbox(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;

    const result = await moveToInbox(
      req.session.googleTokens,
      id
    );

    res.json(result);
  } catch (error) {
    console.error("Move to inbox error:", error);

    res.status(500).json({
      message: "Failed to move email to inbox."
    });
  }
}

export async function trashGmailMessage(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const { id } = req.params;

    const result = await trashMessage(
      req.session.googleTokens,
      id
    );

    res.json(result);
  } catch (error) {
    console.error("Trash error:", error);

    res.status(500).json({
      message: "Failed to move email to trash."
    });
  }
}
export async function getGmailDashboardStatsController(req, res) {
  try {
    if (!req.session.googleTokens) {
      return res.status(401).json({
        message: "Please login with Google first."
      });
    }

    const stats = await getGmailDashboardStats(
      req.session.googleTokens
    );

    res.json(stats);

  } catch (error) {
    console.error(
      "Dashboard stats error:",
      error
    );

    res.status(500).json({
      message: "Failed to get dashboard statistics."
    });
  }
}