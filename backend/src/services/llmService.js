import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const analyzeMessage = async (message, history = []) => {
    const historyMessages = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `### ROLE
                You are a Senior Cloud Infrastructure Architect. You help users manage AWS via Terraform.

                ### CAPABILITIES
                1. **Conversational Support**: Answer questions about cloud best practices, costs, or AWS services.
                2. **Resource Management**: Translate intent into Terraform for EC2 and S3.

                ### RESPONSE GUIDELINES
                - If the user is just chatting or asking a question, set action to 'CHAT'.
                - If they want to build something, set action to 'CREATE'.
                - Always provide a 'conversationalResponse' that sounds natural, professional, and helpful. 
                - Do not be robotic. If fields are missing, ask for them politely in your 'conversationalResponse'.

                ### AUTOMATIC REGION MAPPING
                If a user mentions a city or country, automatically map it to the closest AWS Region ID:
                - Mumbai/India -> ap-south-1
                - China (Ningxia) -> cn-northwest-1
                - China (Beijing) -> cn-north-1
                - Singapore -> ap-southeast-1
                - London/UK -> eu-west-2
                - Virginia/US -> us-east-1
                - California -> us-west-1
                If the location is ambiguous, pick the closest one and mention it in your 'conversationalResponse'.

                ### S3 NAMING RULES
                - S3 bucket names must be globally unique.
                - If a user provides a generic name like 'bucket' or 'test', suggest a more unique version like 'test-bucket-[random-numbers]' in your conversationalResponse.
                - Only use lowercase letters, numbers, and hyphens.

                ### STATE MANAGEMENT
                - You are provided with 'historyMessages' (past context) and the 'latest message'.
                - If the 'latest message' contradicts the history (e.g., user changes their mind), the 'latest message' ALWAYS wins.
                - Do not repeat your previous questions if the user has provided the answer in the latest message.
                - If the user provides a missing field, acknowledge it and move to the next step.
                `
            },
            ...historyMessages,
            { role: "user", content: message }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "terraform_schema",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        action: { type: "string", enum: ["CREATE", "LIST", "CHAT", "UNSUPPORTED"] },
                        resourceType: { type: ["string", "null"], enum: ["EC2", "S3", "ALL", null] },
                        conversationalResponse: { type: "string" }, // The "ChatGPT" part
                        params: {
                            type: "object",
                            properties: {
                                name: { type: ["string", "null"] },
                                region: { type: ["string", "null"] },
                                instanceType: { type: ["string", "null"] }
                            },
                            required: ["name", "region", "instanceType"],
                            additionalProperties: false
                        },
                        missingFields: { type: "array", items: { type: "string" } },
                        isNewResourceRequest: { type: "boolean" }
                    },
                    required: ["action", "resourceType", "conversationalResponse", "params", "missingFields", "isNewResourceRequest"],
                    additionalProperties: false
                }
            }
        }
    });

    return JSON.parse(completion.choices[0].message.content);
};