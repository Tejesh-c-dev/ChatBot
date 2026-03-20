import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types/message';

const chatStore: Map<string, Message[]> = new Map();

export function createSession(): string {
  const sessionId = uuidv4();
  chatStore.set(sessionId, []);
  return sessionId;
}

export function getMessages(sessionId: string): Message[] {
  return chatStore.get(sessionId) ?? [];
}

export function addMessage(sessionId: string, message: Message): void {
  const messages = chatStore.get(sessionId);
  if (!messages) {
    chatStore.set(sessionId, [message]);
    return;
  }
  messages.push(message);
}

export function getRecentMessages(sessionId: string, limit = 10): Message[] {
  const messages = chatStore.get(sessionId) ?? [];
  return messages.slice(-limit);
}
