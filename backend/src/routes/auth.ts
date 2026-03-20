import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { users } from '../models/types';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
	try {
		const { username, email, password } = req.body;

		if (!username || !email || !password) {
			res.status(400).json({ error: 'All fields required' });
			return;
		}

		// Check if email exists
		const existingUser = Array.from(users.values()).find(
			(u) => u.email === email
		);
		if (existingUser) {
			res.status(409).json({ error: 'Email already registered' });
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = {
			id: uuidv4(),
			username,
			email,
			passwordHash,
			createdAt: new Date(),
		};

		users.set(user.id, user);

		const token = jwt.sign(
			{ userId: user.id },
			process.env.JWT_SECRET || 'secret',
			{ expiresIn: '7d' }
		);

		res.status(201).json({
			token,
			user: { id: user.id, username: user.username, email: user.email },
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

		const user = Array.from(users.values()).find((u) => u.email === email);
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
