"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_service_1 = require("../services/prisma.service");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    void (async () => {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const user = await prisma_service_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true },
            });
            if (!user) {
                res.status(401).json({ error: 'Invalid token' });
                return;
            }
            req.userId = decoded.userId;
            next();
        }
        catch {
            res.status(401).json({ error: 'Invalid token' });
        }
    })();
}
