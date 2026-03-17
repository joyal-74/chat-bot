import express from 'express';
import { handleChat } from '../controllers/ChatController.js';

const router = express.Router();

router.post('/', handleChat);

export default router;