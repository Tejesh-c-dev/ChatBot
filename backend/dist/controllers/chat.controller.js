"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChat = postChat;
const chatStore_1 = require("../store/chatStore");
const ai_service_1 = require("../services/ai.service");
const userSessions = new Map();
function attachSessionToUser(userId, sessionId) {
    const sessions = userSessions.get(userId);
    if (!sessions) {
        userSessions.set(userId, new Set([sessionId]));
        return;
    }
    sessions.add(sessionId);
}
function isSessionOwnedByUser(userId, sessionId) {
    return userSessions.get(userId)?.has(sessionId) ?? false;
}
async function postChat(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { sessionId, message } = req.body;
        if (!message || !message.trim()) {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const effectiveSessionId = sessionId?.trim() || (0, chatStore_1.createSession)();
        if (sessionId?.trim() && !isSessionOwnedByUser(req.userId, effectiveSessionId)) {
            res.status(403).json({ error: 'Forbidden session access' });
            return;
        }
        attachSessionToUser(req.userId, effectiveSessionId);
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
