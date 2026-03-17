import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chatRoutes from './routes/ChatRoutes.js'

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended : true}));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// Chat Endpoint
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));