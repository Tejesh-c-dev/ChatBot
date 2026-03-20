import { useState } from 'react';
import { useStore } from '../store/useStore';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const { login, register, isLoading, error } = useStore();

  const handleSubmit = async () => {
    if (mode === 'login') {
      await login(form.email, form.password).catch(() => {});
    } else {
      await register(form.username, form.email, form.password).catch(() => {});
    }
  };

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 60% 0%, #1a1030 0%, #0a0a0f 60%)',
    },
    card: {
      width: 400,
      padding: '40px 36px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    },
    logo: {
      fontFamily: 'var(--font-mono)',
      fontSize: 22,
      fontWeight: 700,
      color: 'var(--accent)',
      letterSpacing: '-0.5px',
      marginBottom: 8,
    },
    subtitle: {
      color: 'var(--text2)',
      fontSize: 13,
      marginBottom: 32,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text2)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      color: 'var(--text)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
      marginBottom: 16,
      outline: 'none',
    },
    btn: {
      width: '100%',
      padding: '12px',
      background: 'var(--accent)',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      cursor: 'pointer',
      marginTop: 8,
      letterSpacing: '0.02em',
    },
    toggle: {
      marginTop: 20,
      textAlign: 'center' as const,
      fontSize: 13,
      color: 'var(--text2)',
    },
    link: {
      color: 'var(--accent)',
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      padding: 0,
    },
    error: {
      background: 'rgba(255,80,100,0.12)',
      border: '1px solid rgba(255,80,100,0.3)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 13,
      color: '#ff8099',
      marginBottom: 16,
    },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>NexusChat</div>
        <div style={s.subtitle}>
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {mode === 'register' && (
          <>
            <label style={s.label}>Username</label>
            <input
              style={s.input}
              placeholder="your_username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </>
        )}

        <label style={s.label}>Email</label>
        <input
          style={s.input}
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input}
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <button style={s.btn} onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            style={s.link}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
