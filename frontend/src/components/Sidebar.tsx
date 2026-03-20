import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ChatSession } from '../types';

export default function Sidebar() {
  const {
    user, sessions, activeSession, createSession,
    selectSession, deleteSession, renameSession, logout,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEdit = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const submitEdit = (id: string) => {
    if (editTitle.trim()) renameSession(id, editTitle.trim());
    setEditingId(null);
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? 'var(--surface3)' : 'transparent',
    border: active ? '1px solid var(--border)' : '1px solid transparent',
    marginBottom: 2,
    gap: 8,
    transition: 'background 0.1s',
  });

  const s: Record<string, React.CSSProperties> = {
    sidebar: {
      width: 260,
      minWidth: 260,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    },
    header: {
      padding: '18px 16px 12px',
      borderBottom: '1px solid var(--border)',
    },
    logo: {
      fontFamily: 'var(--font-mono)',
      fontSize: 16,
      color: 'var(--accent)',
      fontWeight: 700,
      letterSpacing: '-0.3px',
    },
    userInfo: {
      fontSize: 12,
      color: 'var(--text3)',
      marginTop: 2,
    },
    newBtn: {
      margin: '10px 12px',
      width: 'calc(100% - 24px)',
      padding: '9px 12px',
      background: 'var(--accent)',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      cursor: 'pointer',
      letterSpacing: '0.02em',
      transition: 'opacity 0.15s',
    },
    list: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '4px 8px',
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--text3)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      padding: '8px 8px 4px',
    },
    itemContent: {
      flex: 1,
      overflow: 'hidden',
    },
    itemTitle: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    itemMeta: {
      fontSize: 11,
      color: 'var(--text3)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    actions: {
      display: 'flex',
      gap: 4,
      opacity: 0,
    },
    iconBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--text3)',
      cursor: 'pointer',
      fontSize: 12,
      padding: '2px 4px',
      borderRadius: 4,
    },
    editInput: {
      flex: 1,
      background: 'var(--surface2)',
      border: '1px solid var(--accent)',
      borderRadius: 4,
      color: 'var(--text)',
      fontSize: 13,
      padding: '2px 6px',
      fontFamily: 'var(--font-body)',
      outline: 'none',
    },
    footer: {
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: 'var(--text3)',
    },
    logoutBtn: {
      background: 'none',
      border: '1px solid var(--border)',
      color: 'var(--text2)',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
    },
  };

  return (
    <div style={s.sidebar}>
      <div style={s.header}>
        <div style={s.logo}>NexusChat</div>
        <div style={s.userInfo}>@{user?.username}</div>
      </div>

      <button style={s.newBtn} onClick={() => createSession()}>
        + New Chat
      </button>

      <div style={s.list}>
        {sessions.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No chats yet. Start one!
          </div>
        ) : (
          <>
            <div style={s.sectionLabel}>Recent</div>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={itemStyle(activeSession?.id === session.id)}
                onClick={() => selectSession(session.id)}
                onMouseEnter={(e) => {
                  const el = e.currentTarget.querySelector('.actions') as HTMLElement;
                  if (el) el.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget.querySelector('.actions') as HTMLElement;
                  if (el) el.style.opacity = '0';
                }}
              >
                <span style={{ fontSize: 14 }}>💬</span>
                <div style={s.itemContent}>
                  {editingId === session.id ? (
                    <input
                      style={s.editInput}
                      value={editTitle}
                      autoFocus
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit(session.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => submitEdit(session.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div style={s.itemTitle}>{session.title}</div>
                      {session.lastMessage && (
                        <div style={s.itemMeta}>{session.lastMessage}</div>
                      )}
                    </>
                  )}
                </div>
                {editingId !== session.id && (
                  <div className="actions" style={s.actions}>
                    <button
                      style={s.iconBtn}
                      title="Rename"
                      onClick={(e) => startEdit(session, e)}
                    >
                      ✏️
                    </button>
                    <button
                      style={s.iconBtn}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <div style={s.footer}>
        <span style={s.footerText}>{sessions.length} chat{sessions.length !== 1 ? 's' : ''}</span>
        <button style={s.logoutBtn} onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
