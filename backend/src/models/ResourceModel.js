import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['EC2', 'S3'], required: true },
    name: { type: String, required: true },
    region: { type: String, required: true },
    status: { type: String, default: 'planned' },
    terraformCode: { type: String }, 
    details: {
        instanceType: String,
        bucketName: String
    },
    createdAt: { type: Date, default: Date.now }
});

export const Resource = mongoose.model('Resource', resourceSchema);