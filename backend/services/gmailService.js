import { createGmailClient } from "./googleService.js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// =====================================================
// DECODE GMAIL BODY
// =====================================================

function decodeBase64(data) {
  if (!data) return "";

  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf-8");
}


// =====================================================
// CLEAN HTML
// =====================================================

function cleanHtml(html) {
  if (!html) return "";

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}


// =====================================================
// FIND EMAIL BODY
// =====================================================

function findBody(payload) {
  if (!payload) return "";

  if (
    payload.mimeType === "text/plain" &&
    payload.body?.data
  ) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {

    // Plain text
    for (const part of payload.parts) {
      if (
        part.mimeType === "text/plain" &&
        part.body?.data
      ) {
        return decodeBase64(part.body.data);
      }
    }

    // HTML
    for (const part of payload.parts) {
      if (
        part.mimeType === "text/html" &&
        part.body?.data
      ) {
        return cleanHtml(
          decodeBase64(part.body.data)
        );
      }
    }

    // Nested parts
    for (const part of payload.parts) {
      const result = findBody(part);

      if (result) {
        return result;
      }
    }
  }

  if (
    payload.mimeType === "text/html" &&
    payload.body?.data
  ) {
    return cleanHtml(
      decodeBase64(payload.body.data)
    );
  }

  return "";
}


// =====================================================
// GET GMAIL HEADER
// =====================================================

function getHeader(headers, name) {
  const header = headers?.find(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase()
  );

  return header?.value || "";
}


// =====================================================
// ML SPAM PREDICTION
// =====================================================

async function predictSpam(subject, body) {
  try {
    const emailText = `${subject || ""} ${body || ""}`;

    const scriptPath = path.join(
      __dirname,
      "../ml/predict.py"
    );

    const { stdout, stderr } = await execFileAsync(
      "python",
      [scriptPath, emailText]
    );

    console.log("PYTHON STDOUT:", stdout);
    console.log("PYTHON STDERR:", stderr);

    const result = JSON.parse(stdout.trim());

    console.log("ML RESULT:", result);

    return {
      spam: result.spam,
      spamScore: result.spamScore
    };

  } catch (error) {
    console.error("Spam prediction error:", error);

    return {
      spam: false,
      spamScore: 0
    };
  }
}
// =====================================================
// GET GMAIL MESSAGES
// =====================================================

export async function getGmailMessages(
  tokens,
  folder = "Inbox",
  search = ""
) {
  const gmail = createGmailClient(tokens);

  let query = "";

  if (folder === "Inbox") {
    query = "in:inbox";
  } else if (folder === "Starred") {
    query = "is:starred";
  } else if (folder === "Sent") {
    query = "in:sent";
  } else if (folder === "Spam") {
    query = "in:spam";
  } else if (folder === "Archive") {
    query =
      "-in:inbox -in:sent -in:spam -in:trash";
  }

  if (search && search.trim()) {
    query += ` ${search.trim()}`;
  }

  const listResponse =
    await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20
    });

  const messages =
    listResponse.data.messages || [];
    console.log("GMAIL FOLDER:", folder);
console.log("GMAIL QUERY:", query);
console.log("GMAIL MESSAGE COUNT:", messages.length);
console.log("GMAIL MESSAGE IDS:", messages);

  const emailList = await Promise.all(
    messages.map(async (message) => {

      const response =
        await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full"
        });
      
      const data = response.data;

      const headers =
        data.payload?.headers || [];

      const sender =
        getHeader(headers, "From");

      const subject =
        getHeader(headers, "Subject");

      const date =
        getHeader(headers, "Date");

      const body =
        findBody(data.payload);

      // =================================================
      // ML SPAM DETECTION
      // =================================================

      const spamAnalysis =
        await predictSpam(
          subject,
          body
        );

      const labelIds =
        data.labelIds || [];

      const isRead =
        !labelIds.includes("UNREAD");

      const isStarred =
        labelIds.includes("STARRED");

      let category = "General";

      if (labelIds.includes("IMPORTANT")) {
        category = "Important";
      }

      if (labelIds.includes("SPAM")) {
        category = "Spam";
      }

      let folderName = folder;

      if (labelIds.includes("SENT")) {
        folderName = "Sent";
      } else if (
        labelIds.includes("SPAM")
      ) {
        folderName = "Spam";
      } else if (
        labelIds.includes("INBOX")
      ) {
        folderName = "Inbox";
      } else if (
        !labelIds.includes("INBOX") &&
        !labelIds.includes("SENT") &&
        !labelIds.includes("SPAM") &&
        !labelIds.includes("TRASH")
      ) {
        folderName = "Archive";
      }

      return {
        id: data.id,
        threadId: data.threadId,

        sender,
        subject: subject || "(No Subject)",
        body,
        date,

        isRead,
        isStarred,

        folder: folderName,

        category: spamAnalysis.spam
          ? "Spam"
          : category,

        priority: "Normal",
        sentiment: "Neutral",

        spam: spamAnalysis.spam,
        spamScore: spamAnalysis.spamScore
      };
    })
  );
  console.log("FINAL EMAIL LIST COUNT:", emailList.length);

return emailList;

 
}


// =====================================================
// AI EMAIL OVERVIEW
// =====================================================

export async function generateEmailOverview(
  subject,
  body
) {
  try {
    const response =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        messages: [
          {
            role: "system",
            content:
              "Summarize emails clearly and briefly. Give the main purpose, important details, and any required action. Do not add information that is not present in the email."
          },
          {
            role: "user",
            content: `Subject: ${subject || ""}

Email:
${body || ""}`
          }
        ],

        temperature: 0.3
      });

    return response
      .choices[0]
      .message
      .content;

  } catch (error) {
    console.error(
      "AI Overview generation error:",
      error
    );

    throw error;
  }
}
// =====================================================
// STAR / UNSTAR EMAIL
// =====================================================

export async function toggleStar(
  tokens,
  messageId,
  starred
) {
  const gmail = createGmailClient(tokens);

  if (starred) {
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: ["STARRED"]
      }
    });
  } else {
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["STARRED"]
      }
    });
  }

  return {
    success: true,
    starred
  };
}


// =====================================================
// ARCHIVE EMAIL
// =====================================================

export async function archiveMessage(
  tokens,
  messageId
) {
  const gmail = createGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["INBOX"]
    }
  });

  return {
    success: true,
    message: "Email archived successfully."
  };
}


// =====================================================
// MOVE EMAIL TO INBOX
// =====================================================

export async function moveToInbox(
  tokens,
  messageId
) {
  const gmail = createGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: ["INBOX"]
    }
  });

  return {
    success: true,
    message: "Email moved to inbox."
  };
}


// =====================================================
// TRASH EMAIL
// =====================================================

export async function trashMessage(
  tokens,
  messageId
) {
  const gmail = createGmailClient(tokens);

  await gmail.users.messages.trash({
    userId: "me",
    id: messageId
  });

  return {
    success: true,
    message: "Email moved to trash."
  };
}


// =====================================================
// COUNT GMAIL MESSAGES
// =====================================================

async function countGmailMessages(
  gmail,
  query
) {
  let total = 0;
  let pageToken = undefined;

  do {
    const response =
      await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 500,
        pageToken
      });

    const messages =
      response.data.messages || [];

    total += messages.length;

    pageToken =
      response.data.nextPageToken;

  } while (pageToken);

  return total;
}


// =====================================================
// GMAIL DASHBOARD STATS
// =====================================================

export async function getGmailDashboardStats(
  tokens
) {
  const gmail = createGmailClient(tokens);

  const [
    totalEmails,
    unread,
    important,
    spam
  ] = await Promise.all([
    countGmailMessages(
      gmail,
      "in:anywhere"
    ),

    countGmailMessages(
      gmail,
      "in:anywhere is:unread"
    ),

    countGmailMessages(
      gmail,
      " is:starred"
    ),

    countGmailMessages(
      gmail,
      "in:spam"
    )
  ]);

  return {
    totalEmails,
    unread,
    important,
    spam
  };
}
export async function markAsRead(
  tokens,
  messageId
) {
  const gmail = createGmailClient(tokens);

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"]
    }
  });

  return {
    success: true,
    message: "Email marked as read."
  };
}
export async function sendGmailMessage(tokens, to, subject, body) {
  const gmail = createGmailClient(tokens);

  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "",
    body
  ];

  const rawMessage = emailLines.join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage
    }
  });

  return {
    success: true,
    message: "Email sent successfully.",
    id: response.data.id
  };
}