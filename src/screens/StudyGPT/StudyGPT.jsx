import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGemini } from '../../hooks/useGemini';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function Message({ msg, style }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-msg ${isUser ? 'user' : 'ai'}`} style={style}>
      {!isUser && <div className="msg-avatar">🤖</div>}
      <div className="msg-bubble">
        <div className="msg-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        {!isUser && (
          <div className="msg-actions">
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copied!'); }}>
              📋 Copy
            </button>
          </div>
        )}
      </div>
      {isUser && <div className="msg-avatar user-avatar">👤</div>}
    </div>
  );
}

export default function StudyGPT() {
  const { profile } = useAuth();
  const { callGemini, loading } = useGemini();

  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'ai', content: `Hi ${profile?.name?.split(' ')[0] || 'there'}! 👋 I'm KingstonConnect AI — your personalised academic assistant.\n\nI can help you with your subjects, explain concepts, discuss your attendance, upcoming tests, and more. Ask me anything in English or Tamil! 🎓` },
  ]);
  const [input, setInput] = useState('');
  const [useContext, setUseContext] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const doSend = async (qText) => {
    const q = qText.trim();
    if (!q || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: q };
    setMessages(m => [...m, userMsg]);
    setInput('');

    try {
      const result = await callGemini(q, {
        includeContext: useContext,
        contextPreferences: {
          includeAttendance: profile?.preferences?.includeAttendance !== false,
          includeResults: profile?.preferences?.includeResults !== false,
          includeCalendar: profile?.preferences?.includeCalendar !== false,
          includeNotes: profile?.preferences?.includeNotes !== false,
        },
      });
      const aiMsg = { id: Date.now().toString() + '_ai', role: 'ai', content: result?.reply || 'Sorry, I could not get a response. Try again.' };
      setMessages(m => [...m, aiMsg]);
    } catch (e) {
      setMessages(m => [...m, { id: Date.now().toString() + '_err', role: 'ai', content: '⚠️ Error: ' + (e.message || 'Failed to get response.') }]);
    }
  };

  const send = () => doSend(input);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearConversation = () => {
    setMessages([{ id: 'welcome2', role: 'ai', content: 'Conversation cleared. Ask me anything! 🎓' }]);
  };

  const regenerate = () => {
    if (loading || messages.length < 2) return;
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;
    const realIndex = messages.length - 1 - lastUserIndex;
    const lastUserQuery = messages[realIndex].content;
    setMessages(prev => prev.slice(0, realIndex)); 
    doSend(lastUserQuery);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 'var(--bottom-nav-height)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div className="flex items-center gap-3">
          <div style={{ fontSize: 28 }}>🤖</div>
          <div>
            <div className="font-semibold">StudyGPT</div>
            <div className="text-xs text-muted">Powered by Groq AI</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`btn btn-sm ${useContext ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setUseContext(!useContext)}
            title="Toggle academic context"
            style={{ fontSize: 11 }}
          >
            {useContext ? '🎓 Context ON' : '💬 Context OFF'}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={clearConversation} title="Clear conversation">🗑️</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {messages.map((msg, i) => (
          <Message key={msg.id} msg={msg} style={{ animationDelay: `${i * 0.03}s` }} />
        ))}
        {loading && (
          <div className="chat-msg ai">
            <div className="msg-avatar">🤖</div>
            <div className="msg-bubble" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '14px 18px' }}>
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '200ms' }} />
              <span className="typing-dot" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Regenerate */}
      {messages.length > 2 && !loading && (
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={regenerate} style={{ fontSize: 12 }}>🔄 Regenerate last response</button>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', maxWidth: 'var(--max-content)', margin: '0 auto' }}>
          <textarea
            ref={textareaRef}
            id="studygpt-input"
            className="form-input"
            style={{ resize: 'none', maxHeight: 140, overflow: 'auto', lineHeight: 1.5 }}
            rows={1}
            placeholder="Ask anything in English or Tamil…"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
            onKeyDown={handleKey}
          />
          <button
            id="studygpt-send"
            className="btn btn-primary btn-icon"
            style={{ width: 42, height: 42, fontSize: 18, flexShrink: 0 }}
            onClick={send}
            disabled={loading || !input.trim()}
          >
            {loading ? <span className="spinner" /> : '↑'}
          </button>
        </div>
      </div>

      <style>{`
        .chat-msg { display: flex; align-items: flex-end; gap: var(--space-3); animation: slideUp 0.2s ease both; }
        .chat-msg.user { flex-direction: row-reverse; }
        .msg-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; background: var(--color-bg-secondary); }
        .user-avatar { background: var(--color-primary-muted); }
        .msg-bubble { max-width: 75%; padding: 12px 16px; border-radius: 18px; font-size: var(--font-size-sm); line-height: 1.6; }
        .chat-msg.ai .msg-bubble { background: var(--color-surface); border: 1px solid var(--color-border); border-bottom-left-radius: 4px; }
        .chat-msg.user .msg-bubble { background: var(--color-primary); color: #fff; border-bottom-right-radius: 4px; }
        .msg-text { color: inherit; }
        .chat-msg.ai .msg-text { color: var(--color-text-primary); }
        .msg-actions { margin-top: 8px; }
        @keyframes typingPulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .typing-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-text-muted); animation: typingPulse 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
