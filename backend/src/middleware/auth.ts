import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service';

export interface AuthenticatedRequest extends Request {
	userId?: string;
}

export function authMiddleware(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): void {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json({ error: 'No token provided' });
		return;
	}

	const token = authHeader.split(' ')[1];
	if (!token || token === 'null' || token === 'undefined') {
		res.status(401).json({ error: 'No token provided' });
		return;
	}

	void (async () => {
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
				userId: string;
			};

			const user = await prisma.user.findUnique({
				where: { id: decoded.userId },
				select: { id: true },
			});

			if (!user) {
				res.status(401).json({ error: 'Invalid token' });
				return;
			}

			req.userId = decoded.userId;
			next();
		} catch {
			res.status(401).json({ error: 'Invalid token' });
		}
	})();
}
