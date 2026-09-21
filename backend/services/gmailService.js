// =====================================================
// GET GMAIL MESSAGES
// =====================================================

export async function getGmailMessages(
  tokens,
  folder = "Inbox",
  search = ""
) {
  try {
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
      query = "-in:inbox -in:sent -in:spam -in:trash";
    }

    if (search && search.trim()) {
      query += ` ${search.trim()}`;
    }

    // =================================================
    // GET GMAIL MESSAGE LIST
    // =================================================

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

    // =================================================
    // PROCESS EMAILS
    // =================================================

    const emailList = await Promise.all(
      messages.map(async (message) => {
        try {
          console.log("PROCESSING EMAIL:", message.id);

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
          // DEFAULT SPAM RESULT
          // =================================================

          let spamAnalysis = {
            spam: false,
            spamScore: 0
          };

          // =================================================
          // ML SPAM DETECTION
          // =================================================

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

        } catch (error) {
          console.error(
            "EMAIL PROCESSING ERROR:",
            message.id,
            error
          );

          return null;
        }
      })
    );

    // Remove failed emails
    const validEmails =
      emailList.filter(
        (email) => email !== null
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