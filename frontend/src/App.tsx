import { useEffect } from 'react';
import { useStore } from './store/useStore';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  errorBanner: {
    position: 'fixed',
    top: 16,
    right: 16,
    background: '#ff4466',
    color: 'white',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 13,
    zIndex: 9999,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255,68,102,0.4)',
  },
};

export default function App() {
  const { user, error, loadSessions, clearError } = useStore();

  useEffect(() => {
    if (user) loadSessions();
  }, [user, loadSessions]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 4000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  if (!user) return <AuthPage />;

  return (
    <div style={styles.layout}>
      {error && (
        <div style={styles.errorBanner} onClick={clearError}>
          ⚠ {error}
        </div>
      )}
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
