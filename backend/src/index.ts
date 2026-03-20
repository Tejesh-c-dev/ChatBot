import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Server } from 'http';
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import chatRoutes from './routes/chat';
import { prisma } from './services/prisma.service';

dotenv.config();

const app = express();
const BASE_PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get("/", (req, res) => {
  res.send("API running 🚀");
});
let server: Server;
server = app
  .listen(BASE_PORT, () => {
    console.log(`Backend running on http://localhost:${BASE_PORT}`);
  })
  .on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `Port ${BASE_PORT} is already in use. Stop the existing process or change PORT in backend/.env and frontend proxy target.`
      );
      process.exit(1);
    }

    console.error('Failed to start backend server:', error);
    process.exit(1);
  });

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
