"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const types_1 = require("../models/types");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Get all sessions for user
router.get('/', (req, res) => {
    const userSessions = Array.from(types_1.sessions.values())
        .filter((s) => s.userId === req.userId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        lastMessage: s.messages[s.messages.length - 1]?.content?.slice(0, 80) || '',
    }));
    res.json(userSessions);
});
// Create new session
router.post('/', (req, res) => {
    const { title } = req.body;
    const session = {
        id: (0, uuid_1.v4)(),
        userId: req.userId,
        title: title || 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    types_1.sessions.set(session.id, session);
    res.status(201).json(session);
});
// Get single session with messages
router.get('/:sessionId', (req, res) => {
    const session = types_1.sessions.get(req.params.sessionId);
    if (!session || session.userId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json(session);
});
// Delete session
router.delete('/:sessionId', (req, res) => {
    const session = types_1.sessions.get(req.params.sessionId);
    if (!session || session.userId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    types_1.sessions.delete(req.params.sessionId);
    res.json({ success: true });
});
// Rename session
router.patch('/:sessionId', (req, res) => {
    const session = types_1.sessions.get(req.params.sessionId);
    if (!session || session.userId !== req.userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    if (req.body.title) {
        session.title = req.body.title;
        session.updatedAt = new Date();
        types_1.sessions.set(session.id, session);
    }
    res.json({ id: session.id, title: session.title });
});
exports.default = router;
