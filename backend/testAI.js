import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testAI() {
  try {
    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: "Explain what an email summary is in one sentence."
    });

    console.log("AI Response:");
    console.log(response.output_text);

  } catch (error) {
    console.log("AI Error:");
    console.log(error.message);
  }
}

testAI();