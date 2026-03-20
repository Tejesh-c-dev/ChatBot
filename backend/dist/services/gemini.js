"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatResponse = getChatResponse;
const FALLBACK_RESPONSE = 'I am unable to reach OpenRouter right now. Please check the backend OPENROUTER_API_KEY and try again.';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
function extractReplyContent(content) {
    if (typeof content === 'string') {
        return content.trim();
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part?.text === 'string' ? part.text : ''))
            .join(' ')
            .trim();
    }
    return '';
}
function mapOpenRouterError(status) {
    if (status === 429) {
        return 'OpenRouter quota/rate limit exceeded right now. Please wait a bit and try again.';
    }
    if (status === 401 || status === 403) {
        return 'OpenRouter authentication failed. Please verify OPENROUTER_API_KEY.';
    }
    if (status === 400) {
        return 'OpenRouter rejected the request. Please verify model and request payload.';
    }
    return FALLBACK_RESPONSE;
}
async function getChatResponse(messages, userMessage) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return FALLBACK_RESPONSE;
    }
    const conversation = [
        ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        })),
        { role: 'user', content: userMessage },
    ];
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: conversation,
            }),
        });
        const data = (await response.json());
        if (!response.ok) {
            console.error('OpenRouter request failed:', response.status, data);
            return mapOpenRouterError(response.status);
        }
        const reply = extractReplyContent(data.choices?.[0]?.message?.content);
        if (!reply) {
            return FALLBACK_RESPONSE;
        }
        return reply;
    }
    catch (error) {
        console.error('OpenRouter request failed:', error);
        return FALLBACK_RESPONSE;
    }
}
