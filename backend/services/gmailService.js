import { createGmailClient } from "./googleService.js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const enableSpamModel = process.env.ENABLE_SPAM_ML === "true";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;


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
function scoreSpamHeuristically(subject, body) {
  const text = `${subject || ""} ${body || ""}`.toLowerCase();
  const signals = [
    { pattern: /\b(win|winner|won|prize|lottery| jackpot)\b/, weight: 0.28 },
    { pattern: /\b(free|claim|cash bonus|reward|gift card)\b/, weight: 0.2 },
    { pattern: /\b(urgent|act now|limited time|expires today)\b/, weight: 0.16 },
    { pattern: /\b(click here|verify your account|confirm your identity)\b/, weight: 0.2 },
    { pattern: /\b(password|bitcoin|crypto investment|wire transfer)\b/, weight: 0.12 },
    { pattern: /\b(unsubscribe)\b/, weight: 0.04 }
  ];

  const score = Math.min(
    0.99,
    signals.reduce(
      (total, signal) => total + (signal.pattern.test(text) ? signal.weight : 0),
      0
    )
  );

  return {
    spam: score >= 0.55,
    spamScore: Number(score.toFixed(2))
  };
}

async function predictSpam(subject, body) {
  if (!enableSpamModel) {
    return scoreSpamHeuristically(subject, body);
  }

  try {
    const cleanSubject = subject || "";
const cleanBody = body || "";

const emailText =
  `${cleanSubject} ${cleanBody}`.slice(0, 12000);
    

    const scriptPath = path.join(
      __dirname,
      "../ml/predict.py"
    );

    const pythonCommand =
      process.platform === "win32"
        ? "python"
        : "python3";

    console.log("=================================");
    console.log("RUNNING SPAM PREDICTION");
    console.log("PYTHON COMMAND:", pythonCommand);
    console.log("SCRIPT PATH:", scriptPath);
    console.log("TEXT LENGTH:", emailText.length);
    console.log("=================================");

    const { stdout, stderr } =
      await execFileAsync(
        pythonCommand,
        [scriptPath, emailText],
        {
          timeout: 10000,
          maxBuffer: 1024 * 1024
        }
      );

    console.log("PYTHON PROCESS FINISHED");
    console.log("PYTHON STDOUT:", JSON.stringify(stdout));
    console.log("PYTHON STDERR:", JSON.stringify(stderr));

    if (!stdout || !stdout.trim()) {
      throw new Error(
        "Python script returned EMPTY output"
      );
    }

    const result =
      JSON.parse(stdout.trim());

    console.log("ML RESULT:", result);

    return {
      spam: Boolean(result.spam),
      spamScore:
        Number(result.spamScore) || 0
    };

  } catch (error) {

    console.error("=================================");
    console.error("SPAM PREDICTION ERROR");
    console.error("MESSAGE:", error.message);
    console.error("CODE:", error.code);
    console.error(
      "STDERR:",
      JSON.stringify(error.stderr)
    );
    console.error(
      "STDOUT:",
      JSON.stringify(error.stdout)
    );
    console.error("=================================");

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
  try {

    const gmail =
      createGmailClient(tokens);

    let query = "";

    if (folder === "Inbox") {
      query = "in:inbox";
    }

    else if (folder === "Starred") {
      query = "is:starred";
    }

    else if (folder === "Sent") {
      query = "in:sent";
    }

    else if (folder === "Spam") {
      query = "in:spam";
    }

    else if (folder === "Archive") {
      query =
        "-in:inbox -in:sent -in:spam -in:trash";
    }

    if (search && search.trim()) {
      query += ` ${search.trim()}`;
    }


    // =================================================
    // GET MESSAGE LIST
    // =================================================

    const listResponse =
      await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 20
      });

    const messages =
      listResponse.data.messages || [];


    console.log(
      "GMAIL FOLDER:",
      folder
    );

    console.log(
      "GMAIL QUERY:",
      query
    );

    console.log(
      "GMAIL MESSAGE COUNT:",
      messages.length
    );

    console.log(
      "GMAIL MESSAGE IDS:",
      messages
    );


    // =================================================
    // PROCESS EMAILS
    // =================================================

    const emailList =
      await Promise.all(
        messages.map(
          async (message) => {

            try {

              console.log(
                "PROCESSING EMAIL:",
                message.id
              );


              const response =
                await gmail.users.messages.get({
                  userId: "me",
                  id: message.id,
                  format: "full"
                });


              const data =
                response.data;


              const headers =
                data.payload?.headers || [];


              const sender =
                getHeader(
                  headers,
                  "From"
                );


              const subject =
                getHeader(
                  headers,
                  "Subject"
                );


              const date =
                getHeader(
                  headers,
                  "Date"
                );


              const body =
                findBody(
                  data.payload
                );


              // =================================================
              // SPAM DETECTION
              // =================================================

              let spamAnalysis = {
                spam: false,
                spamScore: 0
              };


              try {

                spamAnalysis =
                  await predictSpam(
                    subject,
                    body
                  );

              } catch (error) {

                console.error(
                  "Spam prediction failed:",
                  error
                );

              }


              // =================================================
              // LABELS
              // =================================================

              const labelIds =
                data.labelIds || [];


              const isRead =
                !labelIds.includes(
                  "UNREAD"
                );


              const isStarred =
                labelIds.includes(
                  "STARRED"
                );


              // =================================================
              // CATEGORY
              // =================================================

              let category =
                "General";


              if (
                labelIds.includes(
                  "IMPORTANT"
                )
              ) {
                category =
                  "Important";
              }


              if (
                labelIds.includes(
                  "SPAM"
                )
              ) {
                category =
                  "Spam";
              }


              // =================================================
              // FOLDER
              // =================================================

              let folderName =
                folder;


              if (
                labelIds.includes(
                  "SENT"
                )
              ) {

                folderName =
                  "Sent";

              }

              else if (
                labelIds.includes(
                  "SPAM"
                )
              ) {

                folderName =
                  "Spam";

              }

              else if (
                labelIds.includes(
                  "INBOX"
                )
              ) {

                folderName =
                  "Inbox";

              }

              else if (
                !labelIds.includes("INBOX") &&
                !labelIds.includes("SENT") &&
                !labelIds.includes("SPAM") &&
                !labelIds.includes("TRASH")
              ) {

                folderName =
                  "Archive";
              }


              // =================================================
              // RETURN EMAIL
              // =================================================

              const isGmailSpam = labelIds.includes("SPAM");
              const isSpam = spamAnalysis.spam || isGmailSpam;

              return {

                id: data.id,

                threadId:
                  data.threadId,

                sender,

                subject:
                  subject ||
                  "(No Subject)",

                body,

                date,

                isRead,

                isStarred,

                folder:
                  folderName,

                category:
                  isSpam
                    ? "Spam"
                    : category,

                priority:
                  "Normal",

                sentiment:
                  "Neutral",

                spam:
                  isSpam,

                spamScore:
                  isGmailSpam
                    ? Math.max(spamAnalysis.spamScore, 0.75)
                    : spamAnalysis.spamScore
              };


            } catch (error) {

              console.error(
                "EMAIL PROCESSING ERROR:",
                message.id,
                error
              );

              return null;
            }
          }
        )
      );


    // Remove failed emails
    const validEmails =
      emailList.filter(
        (email) =>
          email !== null
      );


    console.log(
      "FINAL EMAIL LIST COUNT:",
      validEmails.length
    );


    return validEmails;


  } catch (error) {

    console.error(
      "GET GMAIL MESSAGES ERROR:",
      error
    );

    throw error;
  }
}


// =====================================================
// AI EMAIL OVERVIEW
// =====================================================

export async function generateEmailOverview(
  subject,
  body
) {

  try {

    if (!openai) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response =
      await openai.chat.completions.create({

        model:
          "gpt-4o-mini",

        messages: [

          {
            role: "system",

            content:
              "Summarize emails clearly and briefly. Give the main purpose, important details, and any required action. Do not add information that is not present in the email."
          },

          {
            role: "user",

            content:
              `Subject: ${subject || ""}

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
// ALIAS FOR CONTROLLER COMPATIBILITY
// =====================================================

export async function getGmailEmailOverview(
  subject,
  body
) {
  return generateEmailOverview(
    subject,
    body
  );
}


// =====================================================
// STAR / UNSTAR EMAIL
// =====================================================

export async function toggleStar(
  tokens,
  messageId,
  starred
) {

  const gmail =
    createGmailClient(tokens);


  if (starred) {

    await gmail.users.messages.modify({

      userId: "me",

      id: messageId,

      requestBody: {

        addLabelIds: [
          "STARRED"
        ]

      }

    });

  } else {

    await gmail.users.messages.modify({

      userId: "me",

      id: messageId,

      requestBody: {

        removeLabelIds: [
          "STARRED"
        ]

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

  const gmail =
    createGmailClient(tokens);


  await gmail.users.messages.modify({

    userId: "me",

    id: messageId,

    requestBody: {

      removeLabelIds: [
        "INBOX"
      ]

    }

  });


  return {

    success: true,

    message:
      "Email archived successfully."

  };
}


// =====================================================
// MOVE EMAIL TO INBOX
// =====================================================

export async function moveToInbox(
  tokens,
  messageId
) {

  const gmail =
    createGmailClient(tokens);


  await gmail.users.messages.modify({

    userId: "me",

    id: messageId,

    requestBody: {

      addLabelIds: [
        "INBOX"
      ]

    }

  });


  return {

    success: true,

    message:
      "Email moved to inbox."

  };
}


// =====================================================
// TRASH EMAIL
// =====================================================

export async function trashMessage(
  tokens,
  messageId
) {

  const gmail =
    createGmailClient(tokens);


  await gmail.users.messages.trash({

    userId: "me",

    id: messageId

  });


  return {

    success: true,

    message:
      "Email moved to trash."

  };
}


// =====================================================
// MARK EMAIL AS READ
// =====================================================

export async function markAsRead(
  tokens,
  messageId
) {

  const gmail =
    createGmailClient(tokens);


  await gmail.users.messages.modify({

    userId: "me",

    id: messageId,

    requestBody: {

      removeLabelIds: [
        "UNREAD"
      ]

    }

  });


  return {

    success: true,

    message:
      "Email marked as read."

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

  let pageToken =
    undefined;


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


    total +=
      messages.length;


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

  const gmail =
    createGmailClient(tokens);


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
      "is:starred"
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


// =====================================================
// SEND GMAIL MESSAGE
// =====================================================

export async function sendGmailMessage(
  tokens,
  to,
  subject,
  body
) {

  const gmail =
    createGmailClient(tokens);


  const emailLines = [

    `To: ${to}`,

    `Subject: ${subject}`,

    "",

    body

  ];


  const rawMessage =
    emailLines.join("\n");


  const encodedMessage =
    Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");


  const response =
    await gmail.users.messages.send({

      userId: "me",

      requestBody: {

        raw:
          encodedMessage

      }

    });


  return {

    success: true,

    message:
      "Email sent successfully.",

    id:
      response.data.id

  };
}