import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const routeIntent = async (message) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You classify the user's message for a cloud infrastructure assistant.

Return JSON:

{
 "intent": "CREATE_INFRA | QUERY_INFRA | CHAT | UNSUPPORTED"
}

Rules:

CREATE_INFRA
- create EC2
- launch instance
- deploy server
- create S3 bucket
- provision infrastructure

QUERY_INFRA
- how many instances
- list resources
- status of instance
- show EC2
- when was instance created
- how many buckets

CHAT
- general AWS questions
- best practices
- cost questions
- explanations

UNSUPPORTED
- anything unrelated to infrastructure
`
      },
      {
        role: "user",
        content: message
      }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
};