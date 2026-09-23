import OpenAI from "openai";
import "dotenv/config";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const defaultModel = "gpt-4o-mini";
const model = process.env.OPENAI_MODEL?.trim() || defaultModel;

function getOpenAIClient() {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return openai;
}

async function createResponse(input) {
  const client = getOpenAIClient();

  try {
    return await client.responses.create({
      model,
      input
    });
  } catch (error) {
    const isModelError = error?.status === 400 || error?.status === 404;

    if (!isModelError || model === defaultModel) {
      throw error;
    }

    console.warn(
      `OPENAI_MODEL "${model}" was rejected; retrying with "${defaultModel}".`
    );

    return client.responses.create({
      model: defaultModel,
      input
    });
  }
}

export const generateEmailOverview = async (subject, body) => {
  const response = await createResponse(`
You are an AI email assistant.

Summarize the following email in 1-3 short sentences.

Focus on:
- What the email is about
- Important information
- Any action the recipient needs to take

Do not add information that is not present in the email.

Subject:
${subject}

Email body:
${body}
`);

  return response.output_text?.trim() || "No overview was generated.";
};
// --------------------------------------------------
// AI EMAIL WRITER
// --------------------------------------------------

export const generateEmailDraft = async (prompt, tone) => {
  const response = await createResponse(`
You are a professional AI email writing assistant.

Create a complete email based on the user's request.

Tone: ${tone || "Professional"}

Requirements:
- Generate a suitable and concise subject.
- Write a complete email body.
- Use an appropriate greeting such as "Dear Professor," or "Dear Sir/Madam," when appropriate.
- Clearly explain the purpose of the email.
- Include a polite closing.
- Include "Thank you" when appropriate.
- End with a suitable sign-off such as "Best regards,".
- Do not invent specific facts that the user did not provide.
- Do not invent an email address.
- Do not include a date.
- Keep the email natural and professional.

User request:
${prompt}

Return ONLY in this exact format:

SUBJECT:
<subject>

BODY:
<complete email body>
`);

  const output = response.output_text?.trim() || "";

  const subjectMatch = output.match(
    /SUBJECT:\s*([\s\S]*?)\s*BODY:/
  );

  const bodyMatch = output.match(
    /BODY:\s*([\s\S]*)/
  );

  const subject = subjectMatch
    ? subjectMatch[1].trim()
    : "";

  const body = bodyMatch
    ? bodyMatch[1].trim()
    : output.trim();

  return {
    subject,
    body
  };
};