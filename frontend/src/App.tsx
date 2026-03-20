import { useEffect } from 'react';
import { useStore } from './store/useStore';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import './App.css';

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
    <div className="app-shell">
      {error && (
        <div className="error-banner" onClick={clearError}>
          Error: {error}
        </div>
      )}
      <div className="app-layout">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
}
