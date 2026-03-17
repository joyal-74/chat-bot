import { Chat } from "../models/ChatModel.js";
import { Resource } from "../models/ResourceModel.js";
import { Draft } from "../models/DraftModel.js";
import { routeIntent } from "../services/intentRouter.js";
import { analyzeMessage } from "../services/infraAnalyzer.js";
import { executeTerraform, generateHCL } from "../services/tfService.js";

export const handleChat = async (req, res) => {
    const { message, userId = "user-123" } = req.body;

    try {
        // Save user message
        await Chat.create({ userId, role: "user", content: message });

        // Check if there's an existing incomplete draft FIRST
        const existingDraft = await Draft.findOne({ userId, isComplete: false });

        // If there's an existing draft, we're in the middle of creation flow
        if (existingDraft) {
            console.log("Existing draft found:", JSON.stringify(existingDraft, null, 2));
            return await handleCreateInfra(message, userId, existingDraft, res);
        }

        // No existing draft, route the intent normally
        const { intent } = await routeIntent(message);
        console.log("Intent:", intent);

        // Handle different intents
        switch (intent) {
            case "CREATE_INFRA":
                return await handleCreateInfra(message, userId, null, res);

            case "QUERY_INFRA":
                return await handleQueryInfra(message, userId, res);

            case "CHAT":
                const chatReply = "I'm your AWS assistant. I can help you create EC2 instances or S3 buckets, or answer questions about AWS resources. What would you like to know?";
                await Chat.create({ userId, role: "assistant", content: chatReply });
                return res.json({ reply: chatReply });

            case "UNSUPPORTED":
            default:
                const unsupportedReply = "I can only help with AWS EC2 and S3 resources. Please ask me about creating or managing EC2 instances or S3 buckets.";
                await Chat.create({ userId, role: "assistant", content: unsupportedReply });
                return res.json({ reply: unsupportedReply });
        }

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Update handleCreateInfra to accept existing draft
// Update handleCreateInfra to accept existing draft
const handleCreateInfra = async (message, userId, existingDraft = null, res) => {
    // Find existing incomplete draft (either passed in or from DB)
    let draft = existingDraft || await Draft.findOne({ userId, isComplete: false });

    // Analyze the message with context of existing draft
    const analysis = await analyzeMessage(message, draft);
    console.log("Analysis:", JSON.stringify(analysis, null, 2));

    // Update or create draft
    if (!draft) {
        // Only create draft if analysis found a resource type
        if (analysis.resourceType) {
            draft = await Draft.create({
                userId,
                resourceType: analysis.resourceType,
                params: analysis.params
            });
        } else {
            // No resource mentioned, ask what they want to create
            const reply = "I can help you create EC2 instances or S3 buckets. Which would you like to create?";
            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply });
        }
    } else {
        // Update existing draft with new information
        if (analysis.resourceType) draft.resourceType = analysis.resourceType;
        if (analysis.params.name) draft.params.name = analysis.params.name;
        if (analysis.params.region) draft.params.region = analysis.params.region;

        // Only update instanceType for EC2
        if (draft.resourceType === 'EC2' && analysis.params.instanceType) {
            draft.params.instanceType = analysis.params.instanceType;
        } else if (draft.resourceType === 'S3') {
            // Ensure S3 never has instanceType
            draft.params.instanceType = null;
        }

        await draft.save();
    }

    // FIRST CHECK: If analysis says it's complete, execute immediately
    if (analysis.isComplete) {
        console.log("Analysis indicates resource is complete, executing infrastructure...");
        return await executeInfrastructure(draft, userId, res);
    }

    // SECOND: Check if all required fields are present (as a backup)
    const missingFields = getMissingFields(draft);

    if (missingFields.length === 0) {
        console.log("All fields present, executing infrastructure...");
        return await executeInfrastructure(draft, userId, res);
    }

    // THIRD: If we have a conversational response, send it
    if (analysis.conversationalResponse) {
        console.log("Sending conversational response:", analysis.conversationalResponse);
        await Chat.create({ userId, role: "assistant", content: analysis.conversationalResponse });
        return res.json({ reply: analysis.conversationalResponse });
    }

    // FINALLY: Generate a response based on missing fields
    const reply = generateMissingFieldsResponse(draft, missingFields);
    console.log("Sending missing fields response:", reply);
    await Chat.create({ userId, role: "assistant", content: reply });
    return res.json({ reply });
};

// Update getMissingFields to handle S3 better
const getMissingFields = (draft) => {
    const missing = [];

    if (!draft.resourceType) {
        missing.push("resource type");
        return missing;
    }

    if (!draft.params.name) missing.push("name");
    if (!draft.params.region) missing.push("region");

    // For EC2, set default instanceType if missing
    if (draft.resourceType === 'EC2' && !draft.params.instanceType) {
        draft.params.instanceType = 't2.micro';
        draft.save(); // Save the default
    }

    return missing;
};

// Update generateMissingFieldsResponse to be more helpful
const generateMissingFieldsResponse = (draft, missingFields, conversationalResponse = '') => {
    let reply = conversationalResponse ? `${conversationalResponse} ` : '';

    if (missingFields.includes("resource type")) {
        reply += "What would you like to create? An EC2 instance or an S3 bucket?";
    } else {
        const resourceType = draft.resourceType || 'resource';

        if (missingFields.length === 0) {
            // This shouldn't happen, but just in case
            reply += `Great! I have all the information needed. Let me create your ${resourceType}.`;
        } else {
            reply += `For your ${resourceType}, I still need: ${missingFields.join(', ')}. `;

            // Add specific examples based on what's missing
            if (missingFields.includes("name") && missingFields.includes("region")) {
                if (draft.resourceType === 'EC2') {
                    reply += "Try: 'create EC2 called webserver in London'";
                } else {
                    reply += "Try: 'create S3 bucket called my-data in Ireland'";
                }
            } else if (missingFields.includes("name")) {
                reply += `What name would you like to give your ${resourceType}?`;
            } else if (missingFields.includes("region")) {
                reply += `Which region would you like to use? (e.g., London, Ireland, Virginia)`;
            }
        }
    }

    return reply;
};

// Update executeInfrastructure to clear draft properly
const executeInfrastructure = async (draft, userId, res) => {
    try {
        // Generate Terraform code
        const hclCode = generateHCL(draft.resourceType, draft.params);

        // Execute Terraform
        const tfResult = await executeTerraform(draft.params, hclCode);

        if (tfResult.success) {
            // Save to resources
            await Resource.create({
                userId,
                type: draft.resourceType,
                name: draft.params.name,
                region: draft.params.region,
                status: "active",
                details: draft.params
            });

            // Mark draft as complete (this removes it from future checks)
            draft.isComplete = true;
            await draft.save();

            // Generate success message
            let reply = `✅ Success! Your ${draft.resourceType} "${draft.params.name}" has been created in ${draft.params.region}.`;
            if (draft.resourceType === 'EC2') {
                reply += ` Instance type: ${draft.params.instanceType}.`;
            }

            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply, code: hclCode });
        } else {
            // Don't mark draft as complete on failure
            return res.status(500).json({
                reply: `❌ Deployment failed: ${tfResult.error}`,
                error: tfResult.error
            });
        }
    } catch (error) {
        console.error("Execution error:", error);
        return res.status(500).json({
            reply: `❌ Error during deployment: ${error.message}`
        });
    }
};

// Keep handleQueryInfra the same
const handleQueryInfra = async (message, userId, res) => {
    const lowerMessage = message.toLowerCase();

    // Check if this is a COUNT query
    const isCountQuery = lowerMessage.includes('how many') ||
        lowerMessage.includes('count') ||
        lowerMessage.includes('total');

    // Check if asking about creation time
    const isTimeQuery = lowerMessage.includes('when') ||
        lowerMessage.includes('created') ||
        lowerMessage.includes('creation') ||
        lowerMessage.includes('time');

    // Check if asking about specific resource type
    const isEC2Query = lowerMessage.includes('ec2') ||
        lowerMessage.includes('instance') ||
        lowerMessage.includes('instances');

    const isS3Query = lowerMessage.includes('s3') ||
        lowerMessage.includes('bucket') ||
        lowerMessage.includes('buckets') ||
        lowerMessage.includes('storage');


    const isLocationQuery = lowerMessage.includes(' in ') ||
        lowerMessage.includes(' from ') ||
        lowerMessage.includes(' at ') ||
        lowerMessage.includes('location') ||
        lowerMessage.includes('region');

    // Handle LOCATION-based queries FIRST
    if (isLocationQuery) {
        // Extract location using LLM
        const locationAnalysis = await analyzeMessage(`extract region from: ${message}`);
        const targetRegion = locationAnalysis.params.region;

        if (!targetRegion) {
            const reply = "I couldn't determine which region you're asking about. Please specify a location like London, Ireland, Virginia, etc.";
            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply });
        }

        // If asking about specific type in that location
        if (isEC2Query && !isS3Query) {
            // Get only EC2 in that region
            const resources = await Resource.find({
                userId,
                type: 'EC2',
                region: targetRegion
            }).sort({ createdAt: -1 });

            if (resources.length === 0) {
                const reply = `You don't have any EC2 instances in ${targetRegion} (${locationAnalysis.params.region} region).`;
                await Chat.create({ userId, role: "assistant", content: reply });
                return res.json({ reply });
            }

            const formatResource = (resource) => {
                let base = `- "${resource.name}" (${resource.status})`;
                if (isTimeQuery) {
                    base += `\n  └─ Created: ${formatDateTime(resource.createdAt)}`;
                }
                return base;
            };

            const resourceList = resources.map(r => formatResource(r)).join('\n\n');
            const reply = `EC2 instances in ${targetRegion}:\n\n${resourceList}\n\nTotal: ${resources.length} instances`;

            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply });
        }
        else if (isS3Query && !isEC2Query) {
            // Get only S3 in that region
            const resources = await Resource.find({
                userId,
                type: 'S3',
                region: targetRegion
            }).sort({ createdAt: -1 });

            if (resources.length === 0) {
                const reply = `You don't have any S3 buckets in ${targetRegion} (${locationAnalysis.params.region} region).`;
                await Chat.create({ userId, role: "assistant", content: reply });
                return res.json({ reply });
            }

            const formatResource = (resource) => {
                let base = `- "${resource.name}" (${resource.status})`;
                if (isTimeQuery) {
                    base += `\n  └─ Created: ${formatDateTime(resource.createdAt)}`;
                }
                return base;
            };

            const resourceList = resources.map(r => formatResource(r)).join('\n\n');
            const reply = `S3 buckets in ${targetRegion}:\n\n${resourceList}\n\nTotal: ${resources.length} buckets`;

            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply });
        }
        else {
            // Get BOTH EC2 and S3 in that region
            const ec2Resources = await Resource.find({
                userId,
                type: 'EC2',
                region: targetRegion
            }).sort({ createdAt: -1 });

            const s3Resources = await Resource.find({
                userId,
                type: 'S3',
                region: targetRegion
            }).sort({ createdAt: -1 });

            const totalCount = ec2Resources.length + s3Resources.length;

            if (totalCount === 0) {
                const reply = `You don't have any resources in ${targetRegion} (${locationAnalysis.params.region} region).`;
                await Chat.create({ userId, role: "assistant", content: reply });
                return res.json({ reply });
            }

            const formatResource = (resource) => {
                let base = `- "${resource.name}" (${resource.status})`;
                if (isTimeQuery) {
                    base += `\n  └─ Created: ${formatDateTime(resource.createdAt)}`;
                }
                return base;
            };

            let resourceList = '';

            if (ec2Resources.length > 0) {
                resourceList += '🖥️ EC2 Instances:\n';
                resourceList += ec2Resources.map(r => formatResource(r)).join('\n\n');
                resourceList += '\n\n';
            }

            if (s3Resources.length > 0) {
                resourceList += '📦 S3 Buckets:\n';
                resourceList += s3Resources.map(r => formatResource(r)).join('\n\n');
            }

            const reply = `Resources in ${targetRegion}:\n\n${resourceList}\nTotal: ${totalCount} resources (${ec2Resources.length} EC2, ${s3Resources.length} S3)`;

            await Chat.create({ userId, role: "assistant", content: reply });
            return res.json({ reply });
        }
    }

    if (isCountQuery) {
        // Handle COUNT queries
        let query = { userId };
        let resourceType = 'resources';
        let reply;

        if (isEC2Query && !isS3Query) {
            query.type = 'EC2';
            resourceType = 'EC2 instances';
            const count = await Resource.countDocuments(query);
            const activeCount = await Resource.countDocuments({ ...query, status: 'active' });
            reply = count === 0
                ? `You don't have any ${resourceType} yet.`
                : `You have ${count} ${resourceType} total (${activeCount} active).`;
        } else if (isS3Query && !isEC2Query) {
            query.type = 'S3';
            resourceType = 'S3 buckets';
            const count = await Resource.countDocuments(query);
            const activeCount = await Resource.countDocuments({ ...query, status: 'active' });
            reply = count === 0
                ? `You don't have any ${resourceType} yet.`
                : `You have ${count} ${resourceType} total (${activeCount} active).`;
        } else {
            // Count all resources
            const ec2Count = await Resource.countDocuments({ userId, type: 'EC2' });
            const s3Count = await Resource.countDocuments({ userId, type: 'S3' });
            const totalCount = ec2Count + s3Count;

            reply = totalCount === 0
                ? "You don't have any resources yet."
                : `You have ${totalCount} total resources (${ec2Count} EC2 instances, ${s3Count} S3 buckets).`;
        }

        await Chat.create({ userId, role: "assistant", content: reply });
        return res.json({ reply });
    }

    // For LIST queries - determine what to show
    let query = { userId };
    let resourceType = 'resources';
    let title = "Here are your resources";

    if (isEC2Query && !isS3Query) {
        // Specifically asking for EC2 only
        query.type = 'EC2';
        resourceType = 'EC2 instances';
        title = "Here are your EC2 instances";
    } else if (isS3Query && !isEC2Query) {
        // Specifically asking for S3 only
        query.type = 'S3';
        resourceType = 'S3 buckets';
        title = "Here are your S3 buckets";
    } else {
        // Show all resources
        title = "Here are all your resources";
        // No type filter needed
    }

    const resources = await Resource.find(query)
        .sort({ createdAt: -1 })
        .limit(15);

    if (resources.length === 0) {
        let reply;
        if (isEC2Query && !isS3Query) {
            reply = "You don't have any EC2 instances yet.";
        } else if (isS3Query && !isEC2Query) {
            reply = "You don't have any S3 buckets yet.";
        } else {
            reply = "You don't have any resources yet. Would you like to create an EC2 instance or S3 bucket?";
        }

        await Chat.create({ userId, role: "assistant", content: reply });
        return res.json({ reply });
    }

    const formatDateTime = (date) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format resources based on whether time was asked
    const formatResource = (resource) => {
        let base = `- "${resource.name}" in ${resource.region} (${resource.status})`;
        if (isTimeQuery) {
            base += `\n  └─ Created: ${formatDateTime(resource.createdAt)}`;
        }
        return base;
    };

    // If showing specific type (EC2 or S3), show simple list
    if ((isEC2Query && !isS3Query) || (isS3Query && !isEC2Query)) {
        const resourceList = resources.map(r => formatResource(r)).join('\n\n');

        const reply = `${title}:\n\n${resourceList}\n\nTotal: ${resources.length} ${resourceType}`;

        await Chat.create({ userId, role: "assistant", content: reply });
        return res.json({ reply });
    }
    // Show all resources with separation
    else {
        const ec2Resources = resources.filter(r => r.type === 'EC2');
        const s3Resources = resources.filter(r => r.type === 'S3');

        let resourceList = '';

        if (ec2Resources.length > 0) {
            resourceList += '🖥️ EC2 Instances:\n';
            resourceList += ec2Resources.map(r => formatResource(r)).join('\n\n');
            resourceList += '\n\n';
        }

        if (s3Resources.length > 0) {
            resourceList += '📦 S3 Buckets:\n';
            resourceList += s3Resources.map(r => formatResource(r)).join('\n\n');
        }

        const reply = `${title}:\n\n${resourceList}\n\nTotal: ${resources.length} resources (${ec2Resources.length} EC2, ${s3Resources.length} S3)`;

        await Chat.create({ userId, role: "assistant", content: reply });
        return res.json({ reply });
    }
};