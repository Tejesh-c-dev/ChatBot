"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const types_1 = require("../models/types");
const router = (0, express_1.Router)();
// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: 'All fields required' });
            return;
        }
        // Check if email exists
        const existingUser = Array.from(types_1.users.values()).find((u) => u.email === email);
        if (existingUser) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = {
            id: (0, uuid_1.v4)(),
            username,
            email,
            passwordHash,
            createdAt: new Date(),
        };
        types_1.users.set(user.id, user);
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    }
    catch (_err) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password required' });
            return;
        }
        const user = Array.from(types_1.users.values()).find((u) => u.email === email);
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
