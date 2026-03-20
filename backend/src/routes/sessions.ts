import { Request, Response, Router } from 'express';
import { createSession, getMessagesPage } from '../services/chat.service';
import { prisma } from '../services/prisma.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function resolveSessionTitle(
	messages: Array<{ role: string; content: string }>,
	sessionTitle: string
): string {
	if (sessionTitle && sessionTitle !== 'New Chat') {
		return sessionTitle;
	}

	const userMessage = messages.find((message) => message.role === 'user')?.content?.trim();
	if (!userMessage) {
		return 'New Chat';
	}

	return userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : '');
}

// Get all sessions for user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const limit = Number(req.query.limit ?? 20);
		const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
		const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

		const userSessions = await prisma.session.findMany({
			where: {
				userId: req.userId,
				deletedAt: null,
			},
			take: safeLimit + 1,
			...(cursor
				? {
					cursor: { id: cursor },
					skip: 1,
				}
				: {}),
			include: {
				messages: {
					where: { deletedAt: null },
					orderBy: { createdAt: 'desc' },
					take: 10,
				},
			},
			orderBy: { updatedAt: 'desc' },
		});

		const hasMore = userSessions.length > safeLimit;
		const pageItems = userSessions.slice(0, safeLimit);
		const sessionsWithCount = await Promise.all(
			pageItems.map(async (session) => {
				const messageCount = await prisma.message.count({
					where: { sessionId: session.id, deletedAt: null },
				});

				const lastMessage = session.messages[0];
				const updatedAt = lastMessage?.createdAt ?? session.updatedAt;

				return {
					id: session.id,
					title: resolveSessionTitle([...session.messages].reverse(), session.title),
					messageCount,
					createdAt: session.createdAt,
					updatedAt,
					lastMessage: lastMessage?.content?.slice(0, 80) ?? '',
				};
			})
		);

		res.json({
			items: sessionsWithCount,
			nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
			hasMore,
		});
	} catch (error) {
		console.error('sessions.getAll failed:', error);
		res.status(500).json({ error: 'Failed to load sessions' });
	}
});

// Create new session
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
		const sessionId = await createSession(req.userId);

		if (title) {
			await prisma.session.update({
				where: { id: sessionId },
				data: { title },
			});
		}

		const session = await prisma.session.findUnique({
			where: { id: sessionId },
			select: {
				id: true,
				title: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!session) {
			res.status(500).json({ error: 'Failed to create session' });
			return;
		}

		res.status(201).json({
			id: session.id,
			title: session.title,
			messageCount: 0,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
			lastMessage: '',
		});
	} catch (error) {
		console.error('sessions.create failed:', error);
		res.status(500).json({ error: 'Failed to create session' });
	}
});

// Get single session with messages
router.get('/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const session = await prisma.session.findUnique({
			where: { id: req.params.sessionId },
			include: {
				messages: {
					where: { deletedAt: null },
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
			},
		});

		if (!session) {
			res.status(404).json({ error: 'Session not found' });
			return;
		}

		if (session.userId !== req.userId) {
			res.status(403).json({ error: 'Forbidden session access' });
			return;
		}

		if (session.deletedAt) {
			res.status(404).json({ error: 'Session not found' });
			return;
		}

		const beforeRaw = typeof req.query.before === 'string' ? req.query.before : undefined;
		const beforeDate = beforeRaw ? new Date(beforeRaw) : undefined;
		const parsedLimit = Number(req.query.limit ?? 20);
		const page = await getMessagesPage(
			session.id,
			Number.isFinite(parsedLimit) ? parsedLimit : 20,
			beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : undefined
		);

		const lastMessage = session.messages[session.messages.length - 1];
		const title = resolveSessionTitle(page.items, session.title);
		const messageCount = await prisma.message.count({
			where: { sessionId: session.id, deletedAt: null },
		});

		res.json({
			id: session.id,
			title,
			messageCount,
			createdAt: session.createdAt,
			updatedAt: lastMessage?.createdAt ?? session.updatedAt,
			lastMessage: lastMessage?.content?.slice(0, 80) ?? '',
			messages: page.items.map((message) => ({
				id: message.id,
				role: message.role,
				content: message.content,
				timestamp: message.createdAt,
			})),
			pageInfo: {
				hasMore: page.hasMore,
				nextBefore: page.nextBefore,
			},
		});
	} catch (error) {
		console.error('sessions.getOne failed:', error);
		res.status(500).json({ error: 'Failed to load session' });
	}
});

// Delete session
router.delete('/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const deleted = await prisma.session.updateMany({
			where: { id: req.params.sessionId, userId: req.userId },
			data: { deletedAt: new Date() },
		});

		if (deleted.count === 0) {
			res.status(404).json({ error: 'Session not found' });
			return;
		}

		await prisma.message.updateMany({
			where: { sessionId: req.params.sessionId, deletedAt: null },
			data: { deletedAt: new Date() },
		});

		res.json({ success: true });
	} catch (error) {
		console.error('sessions.delete failed:', error);
		res.status(404).json({ error: 'Session not found' });
	}
});

// Rename session
router.patch('/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
	try {
		if (!req.userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
		if (!title) {
			res.status(400).json({ error: 'title is required' });
			return;
		}

		const session = await prisma.session.updateMany({
			where: { id: req.params.sessionId, userId: req.userId },
			data: { title, updatedAt: new Date() },
		});

		if (session.count === 0) {
			res.status(404).json({ error: 'Session not found' });
			return;
		}

		res.json({ id: req.params.sessionId, title });
	} catch {
		res.status(500).json({ error: 'Failed to rename session' });
	}
});

export default router;
