import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const analyzeQuery = async (message) => {

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `
                You convert user questions about cloud resources into a structured query.

                Supported resource fields:
                type: EC2 | S3
                name
                region
                status
                createdAt

                Return JSON:

                {
                "queryType": "COUNT | LIST | DETAILS",
                "filters": {
                "type": "EC2 | S3 | null",
                "name": "string | null",
                "region": "string | null",
                "status": "string | null",
                "createdAfter": "ISO date | null",
                "createdBefore": "ISO date | null"
                }
                }

                Examples:

                "how many EC2 do I have?"
                → COUNT + type=EC2

                "list my s3 buckets"
                → LIST + type=S3

                "status of instance test-server"
                → DETAILS + name=test-server

                "show instances created last week"
                → LIST + createdAfter=last week
                `
            },
            { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
};