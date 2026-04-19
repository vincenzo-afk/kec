import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { doc, collection, addDoc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatDistanceToNow } from 'date-fns';
import StudyGPT from '../StudyGPT/StudyGPT';
import toast from 'react-hot-toast';

const TABS = ['p2p', 'groups', 'ai'];

export default function Chat() {
  const { tab = 'p2p' } = useParams();
  const [activeTab, setActiveTab] = useState(TABS.includes(tab) ? tab : 'p2p');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 'var(--bottom-nav-height)' }}>
      <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Chat</h2>
        <div className="tabs">
          {[['p2p','💬 Direct'],['groups','👥 Groups'],['ai','🤖 AI']].map(([t,l])=>(
            <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{l}</button>
          ))}
        </div>
      </div>
      {activeTab === 'p2p'    && <P2PTab />}
      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'ai'     && <StudyGPT />}
    </div>
  );
}

/* ───────── P2P ───────── */
function P2PTab() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);

  const filteredConvs = conversations.filter(c =>
    c.otherUser?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (active) return <P2PConversation chatId={active.chatId} other={active.otherUser} onBack={() => setActive(null)} profile={profile} />;

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--space-4)' }}>
        <input className="form-input" placeholder="🔍 Search by name…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {filteredConvs.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">💬</div><p>No conversations yet</p><p className="text-xs">Search for a student or teacher to start chatting</p></div>
        : filteredConvs.map(c => (
          <button key={c.chatId} onClick={() => setActive(c)}
            style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-4)', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--color-border)', textAlign:'left', width:'100%' }}>
            <div className="avatar avatar-md">{c.otherUser?.name?.[0]}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{c.otherUser?.name}</div>
              <div className="text-xs text-muted truncate">{c.lastMessage}</div>
            </div>
            {c.unread > 0 && <span className="badge badge-blue">{c.unread}</span>}
          </button>
        ))
      }
    </div>
  );
}

function P2PConversation({ chatId, other, onBack, profile }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, `chats/p2p/${chatId}/messages`), orderBy('timestamp', 'asc'));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const send = async (imageURL = null) => {
    if (!text.trim() && !imageURL) return;
    await addDoc(collection(db, `chats/p2p/${chatId}/messages`), {
      senderId: profile.id, receiverId: other.id,
      text: text.trim(), imageURL: imageURL || null,
      timestamp: serverTimestamp(), read: false, deletedFor: [],
    });
    setText('');
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `chats/p2p/${chatId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await send(url);
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-3" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <button className="btn btn-ghost btn-icon" onClick={onBack}>←</button>
        <div className="avatar avatar-sm">{other?.name?.[0]}</div>
        <div><div className="font-semibold text-sm">{other?.name}</div></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {messages.map(m => {
          const isMe = m.senderId === profile.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '72%', padding: '10px 14px', borderRadius: 18,
                background: isMe ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isMe ? '#fff' : 'var(--color-text-primary)',
                border: isMe ? 'none' : '1px solid var(--color-border)',
                borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4,
                fontSize: 'var(--font-size-sm)', lineHeight: 1.5,
              }}>
                {m.imageURL ? <img src={m.imageURL} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.text ? 8 : 0 }} /> : null}
                {m.text}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {m.timestamp?.toDate ? formatDistanceToNow(m.timestamp.toDate(), { addSuffix: true }) : ''}
                  {isMe && <span style={{ marginLeft: 4 }}>{m.read ? ' ✓✓' : ' ✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
        <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleImage} />
        <button className="btn btn-secondary btn-icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '⋯' : '📷'}
        </button>
        <input className="form-input" style={{ flex: 1 }} placeholder="Type a message…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} />
        <button className="btn btn-primary btn-icon" onClick={() => send()} disabled={!text.trim() && !uploading}>↑</button>
      </div>
    </div>
  );
}

/* ───────── Groups ───────── */
function GroupsTab() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'chats/groups'), where('members', 'array-contains', profile.id));
    return onSnapshot(q, snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [profile?.id]);

  if (active) return <GroupConversation group={active} onBack={() => setActive(null)} profile={profile} />;

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {groups.length === 0
        ? <div className="empty-state"><div className="empty-state-icon">👥</div><p>No group chats yet</p><p className="text-xs">Groups are created automatically when students are approved</p></div>
        : groups.map(g => (
          <button key={g.id} onClick={() => setActive(g)}
            style={{ display:'flex', alignItems:'center', gap:'var(--space-3)', padding:'var(--space-4)', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--color-border)', width:'100%', textAlign:'left' }}>
            <div className="avatar avatar-md" style={{ background:'var(--color-primary-muted)', color:'var(--color-primary)', fontSize:20 }}>👥</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{g.groupName}</div>
              <div className="text-xs text-muted">{g.members?.length} members · {g.type}</div>
            </div>
          </button>
        ))
      }
    </div>
  );
}

function GroupConversation({ group, onBack, profile }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, `chats/groups/${group.id}/messages`), orderBy('timestamp', 'asc'), limit(100));
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [group.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, `chats/groups/${group.id}/messages`), {
      senderId: profile.id, text: text.trim(), timestamp: serverTimestamp(), readBy: [profile.id],
    });
    setText('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-3" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <button className="btn btn-ghost btn-icon" onClick={onBack}>←</button>
        <div><div className="font-semibold text-sm">{group.groupName}</div><div className="text-xs text-muted">{group.members?.length} members</div></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {messages.map(m => {
          const isMe = m.senderId === profile.id;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2, marginLeft: 4 }}>{m.senderId?.slice(0,6)}</span>}
              <div style={{
                maxWidth: '72%', padding: '10px 14px', borderRadius: 18, fontSize: 'var(--font-size-sm)', lineHeight: 1.5,
                background: isMe ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isMe ? '#fff' : 'var(--color-text-primary)',
                border: isMe ? 'none' : '1px solid var(--color-border)',
                borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4,
              }}>{m.text}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
        <input className="form-input" style={{ flex: 1 }} placeholder="Message group…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} />
        <button className="btn btn-primary btn-icon" onClick={send} disabled={!text.trim()}>↑</button>
      </div>
    </div>
  );
}
