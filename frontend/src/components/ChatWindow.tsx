import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import MessageBubble from './MessageBubble';

export default function ChatWindow() {
  const { activeSession, isSending, sendMessage, createSession } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isSending || !activeSession) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(msg);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const s: Record<string, React.CSSProperties> = {
    window: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    },
    topBar: {
      padding: '14px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    sessionTitle: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text)',
    },
    msgCount: {
      fontSize: 11,
      color: 'var(--text3)',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: '2px 8px',
    },
    messages: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '24px 0 8px',
    },
    empty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 12,
      color: 'var(--text3)',
    },
    emptyIcon: {
      fontSize: 40,
      opacity: 0.4,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--text2)',
    },
    emptyText: {
      fontSize: 13,
      color: 'var(--text3)',
      textAlign: 'center' as const,
    },
    startBtn: {
      marginTop: 8,
      padding: '10px 20px',
      background: 'var(--accent)',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
    },
    inputArea: {
      padding: '12px 20px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '8px 8px 8px 14px',
    },
    textarea: {
      flex: 1,
      background: 'none',
      border: 'none',
      color: 'var(--text)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
      lineHeight: 1.5,
      resize: 'none' as const,
      outline: 'none',
      minHeight: 24,
      maxHeight: 140,
      overflowY: 'auto' as const,
    },
    sendBtn: {
      width: 36,
      height: 36,
      background: 'var(--accent)',
      border: 'none',
      borderRadius: 8,
      color: 'white',
      cursor: 'pointer',
      fontSize: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      opacity: input.trim() && !isSending ? 1 : 0.4,
      transition: 'opacity 0.15s',
    },
    hint: {
      fontSize: 11,
      color: 'var(--text3)',
      marginTop: 6,
      paddingLeft: 2,
    },
    typing: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 24px 8px',
      color: 'var(--text3)',
      fontSize: 12,
    },
    dot: {
      width: 6,
      height: 6,
      background: 'var(--accent)',
      borderRadius: '50%',
      animation: 'pulse 1.2s ease-in-out infinite',
    },
  };

  return (
    <div style={s.window}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .dot2 { animation-delay: 0.2s !important; }
        .dot3 { animation-delay: 0.4s !important; }
      `}</style>

      {!activeSession ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>✦</div>
          <div style={s.emptyTitle}>NexusChat</div>
          <div style={s.emptyText}>
            Select a chat from the sidebar<br />or start a new conversation
          </div>
          <button style={s.startBtn} onClick={() => createSession()}>
            Start New Chat
          </button>
        </div>
      ) : (
        <>
          <div style={s.topBar}>
            <div style={s.sessionTitle}>{activeSession.title}</div>
            <div style={s.msgCount}>{activeSession.messages.length} messages</div>
          </div>

          <div style={s.messages}>
            {activeSession.messages.length === 0 ? (
              <div style={{ ...s.empty, paddingTop: 60 }}>
                <div style={s.emptyIcon}>💬</div>
                <div style={{ color: 'var(--text3)', fontSize: 14 }}>
                  Send a message to start the conversation
                </div>
              </div>
            ) : (
              activeSession.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}

            {isSending && (
              <div style={s.typing}>
                <span style={{ color: 'var(--text3)' }}>✦ Thinking</span>
                <div style={s.dot} />
                <div style={{ ...s.dot, animationDelay: '0.2s' }} />
                <div style={{ ...s.dot, animationDelay: '0.4s' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={s.inputArea}>
            <div style={s.inputRow}>
              <textarea
                ref={textareaRef}
                style={s.textarea}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKey}
                placeholder="Message NexusChat…"
                rows={1}
                disabled={isSending}
              />
              <button style={s.sendBtn} onClick={handleSend} disabled={!input.trim() || isSending}>
                ↑
              </button>
            </div>
            <div style={s.hint}>Enter to send · Shift+Enter for new line</div>
          </div>
        </>
      )}
    </div>
  );
}
