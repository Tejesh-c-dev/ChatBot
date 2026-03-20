import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { createSession, sessionBelongsToUser } from '../services/chat.service';
import { generateReply } from '../services/ai.service';

type ChatBody = {
  userId?: string;
  sessionId?: string;
  message?: string;
};

export async function postChat(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { userId, sessionId, message } = req.body as ChatBody;
    const effectiveUserId = req.userId || userId;

    if (!effectiveUserId || !effectiveUserId.trim()) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const effectiveSessionId = sessionId?.trim() || (await createSession(effectiveUserId.trim()));

    const isOwner = await sessionBelongsToUser(effectiveSessionId, effectiveUserId.trim());
    if (!isOwner) {
      res.status(403).json({ error: 'Forbidden session access' });
      return;
    }

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
