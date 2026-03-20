"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getMessages = getMessages;
exports.addMessage = addMessage;
exports.getRecentMessages = getRecentMessages;
const uuid_1 = require("uuid");
const chatStore = new Map();
function createSession() {
    const sessionId = (0, uuid_1.v4)();
    chatStore.set(sessionId, []);
    return sessionId;
}
function getMessages(sessionId) {
    return chatStore.get(sessionId) ?? [];
}
function addMessage(sessionId, message) {
    const messages = chatStore.get(sessionId);
    if (!messages) {
        chatStore.set(sessionId, [message]);
        return;
    }
    messages.push(message);
}
function getRecentMessages(sessionId, limit = 10) {
    const messages = chatStore.get(sessionId) ?? [];
    return messages.slice(-limit);
}
