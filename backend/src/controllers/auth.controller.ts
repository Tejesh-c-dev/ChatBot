import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.service';

type AuthBody = {
  username?: string;
  email?: string;
  password?: string;
};

export const login = async (req: Request<unknown, unknown, AuthBody>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
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
      return res.status(400).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email },
      userId: user.id,
    });
  } catch (err: unknown) {
    console.error('LOGIN ERROR:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return res.status(500).json({ error: message });
  }
};

export const register = async (req: Request<unknown, unknown, AuthBody>, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        email: normalizedEmail,
        passwordHash: hashed,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    return res.status(201).json({ token, user, userId: user.id });
  } catch (err: unknown) {
    console.error('REGISTER ERROR:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return res.status(500).json({ error: message });
  }
};
