import { create } from 'zustand';
import { User, ChatSession, ChatSessionDetail, Message, SessionsListResponse } from '../types';
import { authAPI, sessionsAPI, chatAPI } from '../api/client';

function getValidStoredToken(): string | null {
  const rawToken = localStorage.getItem('token');
  if (!rawToken) return null;

  const normalized = rawToken.trim().replace(/^"|"$/g, '');
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    localStorage.removeItem('token');
    return null;
  }

  return normalized;
}

function getValidStoredUser(): User | null {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as Partial<User>;
    if (!parsed?.id || !parsed?.username || !parsed?.email) {
      localStorage.removeItem('user');
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      email: parsed.email,
    };
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

interface AppStore {
  user: User | null;
  token: string | null;
  sessions: ChatSession[];
  sessionsHasMore: boolean;
  sessionsCursor: string | null;
  activeSession: ChatSessionDetail | null;
  messageHasMore: boolean;
  messageNextBefore: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadSessions: () => Promise<void>;
  loadMoreSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
}

export const useStore = create<AppStore>((set, get) => ({
  user: getValidStoredUser(),
  token: getValidStoredToken(),
  sessions: [],
  sessionsHasMore: false,
  sessionsCursor: null,
  activeSession: null,
  messageHasMore: false,
  messageNextBefore: null,
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
      const { data } = await sessionsAPI.getAll({ limit: 20 });
      const payload = data as SessionsListResponse;
      set({
        sessions: payload.items,
        sessionsHasMore: payload.hasMore,
        sessionsCursor: payload.nextCursor,
        isLoading: false,
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, sessions: [], activeSession: null, isLoading: false });
        return;
      }
      set({ isLoading: false });
    }
  },

  loadMoreSessions: async () => {
    const { sessionsCursor, sessionsHasMore } = get();
    if (!sessionsHasMore || !sessionsCursor) return;

    try {
      const { data } = await sessionsAPI.getAll({ cursor: sessionsCursor, limit: 20 });
      const payload = data as SessionsListResponse;
      set((state) => ({
        sessions: [...state.sessions, ...payload.items],
        sessionsHasMore: payload.hasMore,
        sessionsCursor: payload.nextCursor,
      }));
    } catch {
      set({ error: 'Failed to load more sessions' });
    }
  },

  createSession: async (title) => {
    try {
      const { data } = await sessionsAPI.create(title);
      set((state) => ({ sessions: [data, ...state.sessions] }));
      await get().selectSession(data.id);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, sessions: [], activeSession: null });
        return;
      }

      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create session';
      set({ error: msg });
    }
  },

  selectSession: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await sessionsAPI.getOne(id, { limit: 25 });
      set({
        activeSession: data,
        messageHasMore: Boolean(data?.pageInfo?.hasMore),
        messageNextBefore: data?.pageInfo?.nextBefore ?? null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadOlderMessages: async () => {
    const { activeSession, messageHasMore, messageNextBefore } = get();
    if (!activeSession || !messageHasMore || !messageNextBefore) return;

    try {
      const { data } = await sessionsAPI.getOne(activeSession.id, {
        limit: 25,
        before: messageNextBefore,
      });

      set((state) => {
        if (!state.activeSession || state.activeSession.id !== activeSession.id) {
          return {};
        }

        const existingIds = new Set(state.activeSession.messages.map((m) => m.id));
        const olderMessages = (data.messages as Message[]).filter((m) => !existingIds.has(m.id));

        return {
          activeSession: {
            ...state.activeSession,
            messages: [...olderMessages, ...state.activeSession.messages],
            messageCount: data.messageCount,
          },
          messageHasMore: Boolean(data?.pageInfo?.hasMore),
          messageNextBefore: data?.pageInfo?.nextBefore ?? null,
        };
      });
    } catch {
      set({ error: 'Failed to load older messages' });
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
            messageCount: state.activeSession.messageCount + 2,
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
