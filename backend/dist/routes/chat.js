"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const chat_controller_1 = require("../controllers/chat.controller");
const ai_service_1 = require("../services/ai.service");
const auth_1 = require("../middleware/auth");
const chat_service_1 = require("../services/chat.service");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// New endpoint: POST /api/chat
router.post('/', chat_controller_1.postChat);
// Backward-compatible endpoint: POST /api/chat/:sessionId/message
router.post('/:sessionId/message', async (req, res) => {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { content } = req.body;
        if (!content?.trim()) {
            res.status(400).json({ error: 'Message content required' });
            return;
        }
        const allowed = await (0, chat_service_1.sessionBelongsToUser)(req.params.sessionId, req.userId);
        if (!allowed) {
            res.status(403).json({ error: 'Forbidden session access' });
            return;
        }
        const aiText = await (0, ai_service_1.generateReply)(req.params.sessionId, content.trim());
        const nowIso = new Date().toISOString();
        res.json({
            userMessage: {
                id: (0, uuid_1.v4)(),
                role: 'user',
                content: content.trim(),
                timestamp: nowIso,
            },
            assistantMessage: {
                id: (0, uuid_1.v4)(),
                role: 'assistant',
                content: aiText,
                timestamp: nowIso,
            },
            sessionTitle: content.trim().slice(0, 40) + (content.trim().length > 40 ? '...' : ''),
        });
    }
    catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});
exports.default = router;
