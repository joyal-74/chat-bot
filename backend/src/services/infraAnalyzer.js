import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const analyzeMessage = async (message, currentDraft = null) => {
    // Region mapping for common locations
    const regionMap = {
        'london': 'eu-west-2',
        'uk': 'eu-west-2',
        'england': 'eu-west-2',
        'ireland': 'eu-west-1',
        'dublin': 'eu-west-1',
        'frankfurt': 'eu-central-1',
        'germany': 'eu-central-1',
        'paris': 'eu-west-3',
        'france': 'eu-west-3',
        'stockholm': 'eu-north-1',
        'sweden': 'eu-north-1',
        'virginia': 'us-east-1',
        'north virginia': 'us-east-1',
        'ohio': 'us-east-2',
        'oregon': 'us-west-2',
        'california': 'us-west-1',
        'north california': 'us-west-1',
        'mumbai': 'ap-south-1',
        'india': 'ap-south-1',
        'singapore': 'ap-southeast-1',
        'sydney': 'ap-southeast-2',
        'australia': 'ap-southeast-2',
        'tokyo': 'ap-northeast-1',
        'japan': 'ap-northeast-1',
        'seoul': 'ap-northeast-2',
        'korea': 'ap-northeast-2',
        'sao paulo': 'sa-east-1',
        'brazil': 'sa-east-1'
    };

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `
You are an AWS infrastructure assistant. Extract resource information from user messages.

IMPORTANT RULES:
1. Only support EC2 and S3 resources
2. For EC2: need name, region, and instanceType (default to "t2.micro" if not specified)
3. For S3: need name and region only (instanceType should ALWAYS be null)
4. Convert location names to AWS region codes using this mapping:
   ${JSON.stringify(regionMap, null, 2)}
5. If location not in mapping, use common sense (e.g., "New York" -> "us-east-1")
6. Resource names should be valid: lowercase, hyphens allowed, no spaces

Return JSON:
{
  "resourceType": "EC2" | "S3" | null,
  "params": {
    "name": string | null,
    "region": string | null,
    "instanceType": string | null
  },
  "conversationalResponse": "A friendly sentence acknowledging what was provided and asking for missing info, or confirming understanding",
  "isComplete": boolean (true if all required fields for the resource type are present)
}`
            },
            {
                role: "user",
                content: currentDraft
                    ? `Current draft: ${JSON.stringify(currentDraft)}\n\nUser message: ${message}`
                    : message
            }
        ],
        response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Post-process to ensure S3 doesn't have instanceType
    if (analysis.resourceType === 'S3' && analysis.params.instanceType) {
        analysis.params.instanceType = null;
    }

    return analysis;
};