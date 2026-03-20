import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessions } from '../models/types';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all sessions for user
router.get('/', (req: AuthenticatedRequest, res: Response) => {
	const userSessions = Array.from(sessions.values())
		.filter((s) => s.userId === req.userId)
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		)
		.map((s) => ({
			id: s.id,
			title: s.title,
			messageCount: s.messages.length,
			createdAt: s.createdAt,
			updatedAt: s.updatedAt,
			lastMessage: s.messages[s.messages.length - 1]?.content?.slice(0, 80) || '',
		}));

	res.json(userSessions);
});

// Create new session
router.post('/', (req: AuthenticatedRequest, res: Response) => {
	const { title } = req.body;

	const session = {
		id: uuidv4(),
		userId: req.userId!,
		title: title || 'New Chat',
		messages: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	sessions.set(session.id, session);
	res.status(201).json(session);
});

// Get single session with messages
router.get('/:sessionId', (req: AuthenticatedRequest, res: Response) => {
	const session = sessions.get(req.params.sessionId);

	if (!session || session.userId !== req.userId) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	res.json(session);
});

// Delete session
router.delete('/:sessionId', (req: AuthenticatedRequest, res: Response) => {
	const session = sessions.get(req.params.sessionId);

	if (!session || session.userId !== req.userId) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	sessions.delete(req.params.sessionId);
	res.json({ success: true });
});

// Rename session
router.patch('/:sessionId', (req: AuthenticatedRequest, res: Response) => {
	const session = sessions.get(req.params.sessionId);

	if (!session || session.userId !== req.userId) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	if (req.body.title) {
		session.title = req.body.title;
		session.updatedAt = new Date();
		sessions.set(session.id, session);
	}

	res.json({ id: session.id, title: session.title });
});

export default router;
