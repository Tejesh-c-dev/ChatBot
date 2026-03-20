import { Request } from 'express';

export interface User {
	id: string;
	username: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
}

export interface ChatSession {
	id: string;
	userId: string;
	title: string;
	messages: Message[];
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthRequest extends Request {
	userId?: string;
}

// In-memory store (replace with DB in production)
export const users: Map<string, User> = new Map();
export const sessions: Map<string, ChatSession> = new Map();
