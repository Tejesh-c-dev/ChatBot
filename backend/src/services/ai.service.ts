import { addMessage, getRecentMessages } from '../store/chatStore';
import { Message } from '../types/message';

const SYSTEM_PROMPT =
  'You are a helpful assistant. Keep context of the conversation.';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL: string = 'mistralai/mistral-7b-instruct:free';
const FALLBACK_MODEL: string = 'openrouter/free';
const HISTORY_LIMIT = 6;

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
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing');
  }

  const normalizedMessage = userMessage.trim();
  if (!normalizedMessage) {
    throw new Error('Message cannot be empty');
  }

  const userEntry: Message = {
    role: 'user',
    content: normalizedMessage,
    createdAt: new Date().toISOString(),
  };
  addMessage(sessionId, userEntry);

  const recentMessages = getRecentMessages(sessionId, HISTORY_LIMIT);
  const contextMessages: Message[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
      createdAt: new Date().toISOString(),
    },
    ...recentMessages,
  ];

  const payloadMessages = contextMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const callModel = async (model: string): Promise<string> => {
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

  let reply: string;
  try {
    reply = await callModel(PRIMARY_MODEL);
  } catch (primaryError) {
    if (PRIMARY_MODEL === FALLBACK_MODEL) {
      throw primaryError;
    }

    console.warn('Primary model failed, using fallback model:', primaryError);
    reply = await callModel(FALLBACK_MODEL);
  }

  const assistantEntry: Message = {
    role: 'assistant',
    content: reply,
    createdAt: new Date().toISOString(),
  };
  addMessage(sessionId, assistantEntry);

  return reply;
}
