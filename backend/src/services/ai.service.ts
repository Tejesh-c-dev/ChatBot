import { addMessage, getRecentMessages } from './chat.service';
import { MessageRole } from '../types/message';

const SYSTEM_PROMPT =
  'You are a helpful assistant that remembers conversation context.';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = ['mistralai/mistral-7b-instruct:free', 'openrouter/auto'];
const HISTORY_LIMIT = 10;

function buildFallbackReply(userMessage: string): string {
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

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function extractAssistantReply(
  content?: string | Array<{ type?: string; text?: string }>
): string {
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

export async function generateReply(
  sessionId: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const normalizedMessage = userMessage.trim();
  const fallbackReply = buildFallbackReply(normalizedMessage);

  if (!normalizedMessage) {
    throw new Error('Message cannot be empty');
  }

  await addMessage(sessionId, 'user', normalizedMessage);

  const recentMessages = await getRecentMessages(sessionId, HISTORY_LIMIT);
  const contextMessages: Array<{ role: MessageRole; content: string }> = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    ...recentMessages.map((message) => ({
      role: message.role as MessageRole,
      content: message.content,
    })),
  ];

  const payloadMessages = contextMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const callModel = async (model: string): Promise<string> => {
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

    const data = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      const detail = JSON.stringify(data);
      throw new Error(
        `OpenRouter request failed for model ${model} (${response.status}): ${detail}`
      );
    }

    const reply = extractAssistantReply(data.choices?.[0]?.message?.content);
    if (!reply) {
      throw new Error(`OpenRouter returned an empty reply for model ${model}`);
    }

    return reply;
  };

  const configuredModel = (process.env.OPENROUTER_MODEL || '').trim();
  const modelsToTry = [configuredModel, ...DEFAULT_MODELS].filter((model, index, arr) => {
    if (!model) return false;
    return arr.indexOf(model) === index;
  });

  let reply = fallbackReply;
  try {
    let lastError: unknown = null;
    for (const model of modelsToTry) {
      try {
        reply = await callModel(model);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
  } catch (error) {
    console.error('generateReply OpenRouter fallback:', error);
  }

  await addMessage(sessionId, 'assistant', reply);

  return reply;
}
