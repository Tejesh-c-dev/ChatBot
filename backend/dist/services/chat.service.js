"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getMessages = getMessages;
exports.getMessagesPage = getMessagesPage;
exports.sessionBelongsToUser = sessionBelongsToUser;
exports.addMessage = addMessage;
exports.getRecentMessages = getRecentMessages;
const prisma_service_1 = require("./prisma.service");
async function createSession(userId) {
    const existingUser = await prisma_service_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });
    if (!existingUser) {
        throw new Error('User not found');
    }
    const session = await prisma_service_1.prisma.session.create({
        data: {
            userId,
            title: 'New Chat',
        },
        select: {
            id: true,
        },
    });
    return session.id;
}
async function getMessages(sessionId) {
    const session = await prisma_service_1.prisma.session.findFirst({
        where: { id: sessionId, deletedAt: null },
        select: { id: true },
    });
    if (!session) {
        throw new Error('Session not found');
    }
    return prisma_service_1.prisma.message.findMany({
        where: { sessionId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
    });
}
async function getMessagesPage(sessionId, limit = 20, before) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await prisma_service_1.prisma.message.findMany({
        where: {
            sessionId,
            deletedAt: null,
            ...(before ? { createdAt: { lt: before } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit + 1,
    });
    const hasMore = messages.length > safeLimit;
    const pageItems = messages.slice(0, safeLimit).reverse();
    const nextBefore = pageItems[0]?.createdAt ?? null;
    return {
        items: pageItems,
        hasMore,
        nextBefore,
    };
}
async function sessionBelongsToUser(sessionId, userId) {
    const session = await prisma_service_1.prisma.session.findFirst({
        where: {
            id: sessionId,
            userId,
            deletedAt: null,
        },
        select: { id: true },
    });
    return Boolean(session);
}
async function addMessage(sessionId, role, content) {
    const session = await prisma_service_1.prisma.session.findUnique({
        where: { id: sessionId },
        select: { id: true, title: true, deletedAt: true },
    });
    if (!session || session.deletedAt) {
        throw new Error('Session not found');
    }
    const nextTitle = role === 'user' && session.title === 'New Chat'
        ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
        : session.title;
    return prisma_service_1.prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
            data: {
                sessionId,
                role,
                content,
            },
        });
        await tx.session.update({
            where: { id: sessionId },
            data: {
                title: nextTitle,
                updatedAt: new Date(),
            },
        });
        return message;
    });
}
async function getRecentMessages(sessionId, limit = 10) {
    const messages = await prisma_service_1.prisma.message.findMany({
        where: { sessionId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    return messages.reverse();
}
