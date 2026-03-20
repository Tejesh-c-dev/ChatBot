import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

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

api.interceptors.request.use((config) => {
  const token = getValidStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.error;

    if (status === 401 && (message === 'Invalid token' || message === 'No token provided')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

export const sessionsAPI = {
  getAll: (params?: { cursor?: string; limit?: number }) =>
    api.get('/sessions', { params }),
  create: (title?: string) => api.post('/sessions', { title }),
  getOne: (id: string, params?: { before?: string; limit?: number }) =>
    api.get(`/sessions/${id}`, { params }),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  rename: (id: string, title: string) => api.patch(`/sessions/${id}`, { title }),
};

export const chatAPI = {
  sendMessage: (sessionId: string, content: string) =>
    api.post(`/chat/${sessionId}/message`, { content }),
};

export default api;
