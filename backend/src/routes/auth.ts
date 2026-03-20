import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
	try {
		const { username, email, password } = req.body;

		if (!username || !email || !password) {
			res.status(400).json({ error: 'All fields required' });
			return;
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const existingUser = await prisma.user.findUnique({
			where: { email: normalizedEmail },
			select: { id: true },
		});
		if (existingUser) {
			res.status(409).json({ error: 'Email already registered' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({
			data: {
				username: String(username).trim(),
				email: normalizedEmail,
				passwordHash,
			},
			select: {
				id: true,
				username: true,
				email: true,
			},
		});

		const token = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SECRET || 'secret',
			{ expiresIn: '7d' }
		);

		res.status(201).json({
			token,
			user,
		});
	} catch (_err) {
		res.status(500).json({ error: 'Server error' });
	}
});

// Login
router.post('/login', async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			res.status(400).json({ error: 'Email and password required' });
			return;
		}

		const normalizedEmail = String(email).trim().toLowerCase();
		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail },
			select: {
				id: true,
				username: true,
				email: true,
				passwordHash: true,
			},
		});
		if (!user) {
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) {
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		const token = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SECRET || 'secret',
			{ expiresIn: '7d' }
		);

		res.json({
			token,
			user: { id: user.id, username: user.username, email: user.email },
		});
	} catch {
		res.status(500).json({ error: 'Server error' });
	}
});

export default router;
