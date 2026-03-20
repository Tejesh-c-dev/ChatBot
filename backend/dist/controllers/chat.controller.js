"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChat = postChat;
const chat_service_1 = require("../services/chat.service");
const ai_service_1 = require("../services/ai.service");
async function postChat(req, res) {
    try {
        const { userId, sessionId, message } = req.body;
        const effectiveUserId = req.userId || userId;
        if (!effectiveUserId || !effectiveUserId.trim()) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        if (!message || !message.trim()) {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const effectiveSessionId = sessionId?.trim() || (await (0, chat_service_1.createSession)(effectiveUserId.trim()));
        const isOwner = await (0, chat_service_1.sessionBelongsToUser)(effectiveSessionId, effectiveUserId.trim());
        if (!isOwner) {
            res.status(403).json({ error: 'Forbidden session access' });
            return;
        }
        const reply = await (0, ai_service_1.generateReply)(effectiveSessionId, message);
        res.status(200).json({
            sessionId: effectiveSessionId,
            reply,
        });
    }
    catch (error) {
        console.error('chat.controller postChat failed:', error);
        res.status(500).json({ error: 'Failed to generate reply' });
    }
}
