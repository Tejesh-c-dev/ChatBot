import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { createSession } from '../store/chatStore';
import { generateReply } from '../services/ai.service';

type ChatBody = {
  sessionId?: string;
  message?: string;
};

const userSessions = new Map<string, Set<string>>();

function attachSessionToUser(userId: string, sessionId: string): void {
  const sessions = userSessions.get(userId);
  if (!sessions) {
    userSessions.set(userId, new Set([sessionId]));
    return;
  }
  sessions.add(sessionId);
}

function isSessionOwnedByUser(userId: string, sessionId: string): boolean {
  return userSessions.get(userId)?.has(sessionId) ?? false;
}

export async function postChat(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sessionId, message } = req.body as ChatBody;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const effectiveSessionId = sessionId?.trim() || createSession();

    if (sessionId?.trim() && !isSessionOwnedByUser(req.userId, effectiveSessionId)) {
      res.status(403).json({ error: 'Forbidden session access' });
      return;
    }

    attachSessionToUser(req.userId, effectiveSessionId);

    const reply = await generateReply(effectiveSessionId, message);

    res.status(200).json({
      sessionId: effectiveSessionId,
      reply,
    });
  } catch (error) {
    console.error('chat.controller postChat failed:', error);
    res.status(500).json({ error: 'Failed to generate reply' });
  }
}
