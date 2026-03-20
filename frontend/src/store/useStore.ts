import { create } from 'zustand';
import { User, ChatSession, ChatSessionDetail, Message } from '../types';
import { authAPI, sessionsAPI, chatAPI } from '../api/client';

interface AppStore {
  user: User | null;
  token: string | null;
  sessions: ChatSession[];
  activeSession: ChatSessionDetail | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
}

export const useStore = create<AppStore>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  sessions: [],
  activeSession: null,
  isLoading: false,
  isSending: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register({ username, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, sessions: [], activeSession: null });
  },

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const { data } = await sessionsAPI.getAll();
      set({ sessions: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createSession: async (title) => {
    try {
      const { data } = await sessionsAPI.create(title);
      set((state) => ({ sessions: [data, ...state.sessions] }));
      await get().selectSession(data.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create session';
      set({ error: msg });
    }
  },

  selectSession: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await sessionsAPI.getOne(id);
      set({ activeSession: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  deleteSession: async (id) => {
    try {
      await sessionsAPI.delete(id);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSession: state.activeSession?.id === id ? null : state.activeSession,
      }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete';
      set({ error: msg });
    }
  },

  renameSession: async (id, title) => {
    try {
      await sessionsAPI.rename(id, title);
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
        activeSession:
          state.activeSession?.id === id
            ? { ...state.activeSession, title }
            : state.activeSession,
      }));
    } catch {
      set({ error: 'Failed to rename' });
    }
  },

  sendMessage: async (content) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      isSending: true,
      activeSession: state.activeSession
        ? { ...state.activeSession, messages: [...state.activeSession.messages, tempUserMsg] }
        : null,
    }));

    try {
      const { data } = await chatAPI.sendMessage(activeSession.id, content);
      set((state) => {
        if (!state.activeSession) return {};
        const msgs = state.activeSession.messages.filter((m) => m.id !== tempUserMsg.id);
        return {
          isSending: false,
          activeSession: {
            ...state.activeSession,
            title: data.sessionTitle,
            messages: [...msgs, data.userMessage, data.assistantMessage],
          },
          sessions: state.sessions.map((s) =>
            s.id === activeSession.id
              ? { ...s, title: data.sessionTitle, lastMessage: data.assistantMessage.content.slice(0, 80) }
              : s
          ),
        };
      });
    } catch {
      set((state) => ({
        isSending: false,
        error: 'Failed to send message',
        activeSession: state.activeSession
          ? { ...state.activeSession, messages: state.activeSession.messages.filter((m) => m.id !== tempUserMsg.id) }
          : null,
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
