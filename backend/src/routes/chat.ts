import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { postChat } from '../controllers/chat.controller';
import { generateReply } from '../services/ai.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { sessionBelongsToUser } from '../services/chat.service';

const router = Router();
router.use(authMiddleware);

// New endpoint: POST /api/chat
router.post('/', postChat);

// Backward-compatible endpoint: POST /api/chat/:sessionId/message
router.post('/:sessionId/message', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { content } = req.body;
		if (!content?.trim()) {
			res.status(400).json({ error: 'Message content required' });
			return;
		}

		const allowed = await sessionBelongsToUser(req.params.sessionId, req.userId);
		if (!allowed) {
			res.status(403).json({ error: 'Forbidden session access' });
			return;
		}

		const aiText = await generateReply(req.params.sessionId, content.trim());
		const nowIso = new Date().toISOString();

		res.json({
			userMessage: {
				id: uuidv4(),
				role: 'user',
				content: content.trim(),
				timestamp: nowIso,
			},
			assistantMessage: {
				id: uuidv4(),
				role: 'assistant',
				content: aiText,
				timestamp: nowIso,
			},
			sessionTitle: content.trim().slice(0, 40) + (content.trim().length > 40 ? '...' : ''),
		});
	} catch (err) {
		console.error('Chat error:', err);
		res.status(500).json({ error: 'Failed to get AI response' });
	}
});

export default router;
