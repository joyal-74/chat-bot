import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    resourceType: { type: String, enum: ['EC2', 'S3'] },
    params: {
        name: String,
        region: String,
        instanceType: String,
    },
    isComplete: { type: Boolean, default: false }
}, { timestamps: true });

export const Draft = mongoose.model('Draft', draftSchema);