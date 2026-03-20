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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/chat', chat_1.default);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
