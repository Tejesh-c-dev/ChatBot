import ReactMarkdown from 'react-markdown';
import { Message } from '../types';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      padding: '0 24px',
      gap: 10,
      alignItems: 'flex-end',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: isUser ? 'var(--accent)' : 'var(--surface3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      flexShrink: 0,
      border: '1px solid var(--border)',
      order: isUser ? 1 : 0,
    },
    bubble: {
      maxWidth: '72%',
      padding: '12px 16px',
      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      background: isUser ? 'var(--user-bubble)' : 'var(--surface)',
      border: `1px solid ${isUser ? 'rgba(124,106,255,0.3)' : 'var(--border)'}`,
      fontSize: 14,
      lineHeight: 1.65,
      color: 'var(--text)',
      wordBreak: 'break-word' as const,
    },
    time: {
      fontSize: 10,
      color: 'var(--text3)',
      marginTop: 4,
      textAlign: isUser ? 'right' : 'left' as const,
    },
  };

  const mdStyles = `
    .md-content p { margin: 0 0 8px; }
    .md-content p:last-child { margin-bottom: 0; }
    .md-content code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: 12px; }
    .md-content pre { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0; }
    .md-content pre code { background: none; padding: 0; }
    .md-content ul, .md-content ol { padding-left: 20px; margin: 8px 0; }
    .md-content li { margin-bottom: 4px; }
    .md-content strong { color: var(--text); font-weight: 600; }
    .md-content a { color: var(--accent); }
  `;

  const t = new Date(message.timestamp);
  const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <style>{mdStyles}</style>
      <div style={s.wrapper}>
        <div style={s.avatar}>{isUser ? '👤' : '✦'}</div>
        <div>
          <div style={s.bubble}>
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <div className="md-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
          <div style={s.time}>{timeStr}</div>
        </div>
      </div>
    </>
  );
}
