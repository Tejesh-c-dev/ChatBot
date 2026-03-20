"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReply = generateReply;
const chat_service_1 = require("./chat.service");
const SYSTEM_PROMPT = 'You are a helpful assistant that remembers conversation context.';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = ['mistralai/mistral-7b-instruct:free', 'openrouter/auto'];
const HISTORY_LIMIT = 10;
function buildFallbackReply(userMessage) {
    const normalized = userMessage.replace(/\s+/g, ' ').trim();
    const lower = normalized.toLowerCase();
    if (/^(hi|hello|hey|yo)\b/.test(lower)) {
        return 'Hi! I am running in offline mode right now, but I can still help with short answers and drafting text.';
    }
    if (lower.includes('about you') || lower.includes('who are you')) {
        return 'I am your chat assistant for this app. The cloud model is currently unavailable, so I am replying in offline mode for now.';
    }
    if (lower.includes('help')) {
        return 'I can still help in offline mode with summaries, rewrites, brainstorming, and simple explanations. Ask in short prompts for best results.';
    }
    if (lower.endsWith('?')) {
        return `Short answer: I received your question (${normalized.slice(0, 140)}). I am in offline mode, so please treat this as a temporary response until the provider is reachable.`;
    }
    const preview = normalized.slice(0, 180);
    return `Noted: "${preview}". I am running in offline mode right now, but your message was saved and we can continue chatting.`;
}
function extractAssistantReply(content) {
    if (typeof content === 'string') {
        return content.trim();
    }
    if (Array.isArray(content)) {
        return content
            .map((item) => (typeof item.text === 'string' ? item.text : ''))
            .join(' ')
            .trim();
    }
    return '';
}
async function generateReply(sessionId, userMessage) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const normalizedMessage = userMessage.trim();
    const fallbackReply = buildFallbackReply(normalizedMessage);
    if (!normalizedMessage) {
        throw new Error('Message cannot be empty');
    }
    await (0, chat_service_1.addMessage)(sessionId, 'user', normalizedMessage);
    const recentMessages = await (0, chat_service_1.getRecentMessages)(sessionId, HISTORY_LIMIT);
    const contextMessages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        ...recentMessages.map((message) => ({
            role: message.role,
            content: message.content,
        })),
    ];
    const payloadMessages = contextMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));
    const callModel = async (model) => {
        if (!apiKey) {
            return fallbackReply;
        }
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: payloadMessages,
            }),
        });
        const data = (await response.json());
        if (!response.ok) {
            const detail = JSON.stringify(data);
            throw new Error(`OpenRouter request failed for model ${model} (${response.status}): ${detail}`);
        }
        const reply = extractAssistantReply(data.choices?.[0]?.message?.content);
        if (!reply) {
            throw new Error(`OpenRouter returned an empty reply for model ${model}`);
        }
        return reply;
    };
    const configuredModel = (process.env.OPENROUTER_MODEL || '').trim();
    const modelsToTry = [configuredModel, ...DEFAULT_MODELS].filter((model, index, arr) => {
        if (!model)
            return false;
        return arr.indexOf(model) === index;
    });
    let reply = fallbackReply;
    try {
        let lastError = null;
        for (const model of modelsToTry) {
            try {
                reply = await callModel(model);
                lastError = null;
                break;
            }
            catch (error) {
                lastError = error;
            }
        }
        if (lastError) {
            throw lastError;
        }
    }
    catch (error) {
        console.error('generateReply OpenRouter fallback:', error);
    }
    await (0, chat_service_1.addMessage)(sessionId, 'assistant', reply);
    return reply;
}
