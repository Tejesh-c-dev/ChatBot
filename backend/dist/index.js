"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const chat_1 = __importDefault(require("./routes/chat"));
const prisma_service_1 = require("./services/prisma.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const BASE_PORT = Number(process.env.PORT || 3001);
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/chat', chat_1.default);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
let server;
server = app
    .listen(BASE_PORT, () => {
    console.log(`Backend running on http://localhost:${BASE_PORT}`);
})
    .on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${BASE_PORT} is already in use. Stop the existing process or change PORT in backend/.env and frontend proxy target.`);
        process.exit(1);
    }
    console.error('Failed to start backend server:', error);
    process.exit(1);
});
async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        await prisma_service_1.prisma.$disconnect();
        process.exit(0);
    });
}
process.on('SIGINT', () => {
    void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});
