import { Chat } from "../models/ChatModel.js";
import { Resource } from "../models/ResourceModel.js";
import { analyzeMessage } from "../services/llmService.js";
import { executeTerraform, generateHCL } from "../services/tfService.js";


export const handleChat = async (req, res) => {
    const { message } = req.body;

    try {
        const history = await Chat.find().sort({ createdAt: -1 }).limit(10);
        const context = history.reverse();

        const analysis = await analyzeMessage(message, context);
        await Chat.create({ role: 'user', content: message });

        if (analysis.action === 'CHAT' || (analysis.action === 'CREATE' && analysis.missingFields.length > 0)) {
            await Chat.create({ role: 'assistant', content: analysis.conversationalResponse });
            return res.json({ reply: analysis.conversationalResponse });
        }

        if (analysis.action === 'LIST') {
            const items = await Resource.find(analysis.resourceType !== 'ALL' ? { type: analysis.resourceType } : {});
            await Chat.create({ role: 'assistant', content: analysis.conversationalResponse });
            return res.json({ reply: analysis.conversationalResponse, data: items });
        }

        if (analysis.action === 'CREATE') {
            const existingResource = await Resource.findOne({ type: analysis.resourceType, name: analysis.params.name });

            if (existingResource && !analysis.isNewResourceRequest) {
                const dupReply = `You already have an ${analysis.resourceType} named "${analysis.params.name}".`;
                await Chat.create({ role: 'assistant', content: dupReply });
                return res.json({ reply: dupReply });
            }

            const hclCode = generateHCL(analysis.resourceType, analysis.params);

            // DIRECT EXECUTION: No planning/waiting
            const tfResult = await executeTerraform(analysis.params, hclCode);

            if (tfResult.success) {
                await Resource.create({
                    type: analysis.resourceType,
                    name: analysis.params.name,
                    region: analysis.params.region,
                    terraformCode: hclCode,
                    status: 'active'
                });

                const successReply = `Success! I have deployed your ${analysis.resourceType} "${analysis.params.name}" to ${analysis.params.region}.`;
                await Chat.create({ role: 'assistant', content: successReply });

                return res.json({
                    reply: successReply,
                    code: hclCode,
                    data: [tfResult] // Optional: send back the terraform output
                });
            } else {
                const errorMsg = "Infrastructure engine error: " + tfResult.error;
                await Chat.create({ role: 'assistant', content: errorMsg });
                return res.status(500).json({ reply: errorMsg });
            }
        }

    } catch (error) {
        res.status(500).json({ error: "Server Error: " + error.message });
    }
};