import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Send, User, Bot, Info, AlertTriangle, Loader2, XCircle, Zap, Download, Sparkles, ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot, updateDoc, doc, limit, arrayUnion, getDocs,
} from 'firebase/firestore';
import { Conversation, Message, InternalNote } from '../../../shared/types';
import { auth } from '../firebase';
import { slideInRight, fadeIn } from '../lib/animations';
import { ConversationsSkeleton } from '../components/Skeleton';

const PAGE_LOAD_TIMEOUT_MS = 10000;

function shortWait(iso?: string) {
  if (!iso) return null;
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return '<1 min ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800',
  instagram: 'bg-pink-100 text-pink-800',
  facebook: 'bg-blue-100 text-blue-800',
  tiktok: 'bg-gray-100 text-gray-800',
  webchat: 'bg-gray-100 text-gray-800',
};

export default function Conversations() {
  const { businessId, business } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'human_escalated' | 'closed'>('all');
  const [showInfo, setShowInfo] = useState(false);
  const [suggestingReply, setSuggestingReply] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'hot' | 'needs_review'>('all');
  const [nowForUrgent, setNowForUrgent] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find(c => c.id === selectedId);

  // Update "now" every few seconds for urgent pulsed dots
  useEffect(() => {
    const timer = setInterval(() => setNowForUrgent(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Live conversations list
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const timeout = window.setTimeout(() => {
      setLoadError('Loading conversations is taking too long. Please retry.');
      setLoading(false);
    }, PAGE_LOAD_TIMEOUT_MS);
    const q = query(
      collection(db, `businesses/${businessId}/conversations`),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        setConversations(data);
        window.clearTimeout(timeout);
        setLoading(false);
      },
      (err) => {
        console.error('Conversations listener failed:', err);
        setLoadError('Could not load conversations. Please refresh and try again.');
        window.clearTimeout(timeout);
        setLoading(false);
      },
    );
    return () => {
      window.clearTimeout(timeout);
      unsub();
    };
  }, [businessId]);

  // Live messages for selected conversation
  useEffect(() => {
    if (!businessId || !selectedId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, `businesses/${businessId}/conversations/${selectedId}/messages`),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [businessId, selectedId]);

  // Smart Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Check if user is scrolled to bottom (within 100px buffer)
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 150;
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !businessId || !selectedId || sending || selected?.status === 'closed') return;
    setSending(true);

    const now = new Date().toISOString();
    const msgText = input.trim();
    setInput('');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      // ─── FIX: Call backend API to send message to customer ─────────────
      const response = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          conversationId: selectedId,
          businessId,
          content: msgText,
          senderId: auth.currentUser?.uid || 'unknown-agent',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      // Message is already stored in Firestore by the backend
      // and sent to the customer via WhatsApp/Instagram/Facebook
      
      // Update conversation lastMessage (backend does this too, but update locally for instant UI)
      await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
        lastMessage: msgText,
        updatedAt: now,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(`Failed to send message: ${(err as Error).message}`);
      setInput(msgText); // Restore input on error
    } finally {
      setSending(false);
    }
  };

  const handleSummarizeThread = async () => {
    if (!businessId || !selectedId || summarizing) return;
    setSummarizing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ businessId, conversationId: selectedId }),
      });
      if (!resp.ok) throw new Error('Failed to summarize');
    } catch (err) {
      console.error(err);
      alert('Could not summarize this thread right now.');
    } finally {
      setSummarizing(false);
    }
  };

  const addInternalNote = async () => {
    if (!businessId || !selectedId || !noteDraft.trim()) return;
    const note: InternalNote = {
      id: crypto.randomUUID(),
      text: noteDraft.trim(),
      createdAt: new Date().toISOString(),
      authorUid: auth.currentUser?.uid,
    };
    await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
      internalNotes: arrayUnion(note),
      updatedAt: new Date().toISOString(),
    });
    setNoteDraft('');
  };

  const exportConversationsCsv = async () => {
    if (!businessId) return;
    try {
      const snap = await getDocs(collection(db, `businesses/${businessId}/conversations`));
      const header = ['id', 'customer', 'channel', 'status', 'leadPriority', 'leadScore', 'needsReview', 'updatedAt'];
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = [
        header.join(','),
        ...snap.docs.map(d => {
          const x = d.data() as Record<string, unknown>;
          return [
            d.id,
            String(x.customerName ?? ''),
            String(x.channel ?? ''),
            String(x.status ?? ''),
            String(x.leadPriority ?? ''),
            String(x.leadScore ?? ''),
            String(x.needsHumanReview ?? false),
            String(x.updatedAt ?? ''),
          ].map(esc).join(',');
        }),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `conversations-export.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error(err);
      alert('Export failed.');
    }
  };

  const handleSuggestReply = async () => {
    if (!businessId || !selectedId || suggestingReply || selected?.status === 'closed') return;
    setSuggestingReply(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ businessId, conversationId: selectedId }),
      });
      if (!resp.ok) throw new Error('Failed to generate suggested reply');
      const data = await resp.json();
      setInput(data.suggestedReply || '');
    } catch (err) {
      console.error(err);
      alert('Could not generate a reply suggestion right now.');
    } finally {
      setSuggestingReply(false);
    }
  };

  const updateStatus = async (status: 'active' | 'closed' | 'human_escalated') => {
    if (!businessId || !selectedId) return;
    await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const filtered = conversations.filter(c => {
    if (!(statusFilter === 'all' || c.status === statusFilter)) return false;
    if (priorityFilter === 'hot' && c.leadPriority !== 'hot') return false;
    if (priorityFilter === 'needs_review' && !c.needsHumanReview) return false;
    const q = search.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  const sortedChats = [...filtered].sort((a, b) => {
    const d = (b.leadScore ?? 0) - (a.leadScore ?? 0);
    if (d !== 0) return d;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (loading) {
    return <ConversationsSkeleton />;
  }

  if (loadError) {
    return (
      <div className="glass-panel glow-border rounded-xl border border-red-100 bg-red-50/50 p-8 text-center">
        <p className="text-sm font-medium text-red-700">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel glow-border flex h-[calc(100vh-160px)] rounded-xl border border-gray-200/80 overflow-hidden shadow-sm">
      {/* ─── Conversation List ─── */}
      <div className="w-80 border-r border-gray-200/70 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Filter className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  disabled={conversations.length === 0}
                  title={conversations.length === 0 ? 'Available when conversations exist' : 'Filter by conversation status'}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-7 pr-7 py-1.5 text-xs font-medium text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="human_escalated">Urgent</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-400">
                {statusFilter === 'all' ? `${conversations.filter(c => c.status !== 'closed').length} active` : `Status: ${statusFilter.replace('_', ' ')}`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Zap className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                  disabled={conversations.length === 0}
                  title={conversations.length === 0 ? 'Available when conversations exist' : 'Filter by lead queue'}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white pl-7 pr-7 py-1.5 text-xs font-medium text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="all">All leads</option>
                  <option value="hot">Hot only</option>
                  <option value="needs_review">Needs review</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-400">
                {priorityFilter === 'all' ? 'All leads' : priorityFilter === 'hot' ? 'Hot only' : 'Review queue'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void exportConversationsCsv()}
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100"
            >
              <Download className="w-3.5 h-3.5" /> Export CRM (CSV)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sortedChats.length === 0 && (
            <p className="p-10 text-sm text-gray-400 text-center italic">No conversations found.</p>
          )}
          {sortedChats.map(chat => {
            const isUrgent = chat.status === 'human_escalated' && 
                            (nowForUrgent - new Date(chat.updatedAt).getTime()) < 60000;
            
            return (
              <motion.div
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={cn(
                  'p-4 cursor-pointer transition-all border-l-4 relative hover-lift',
                  selectedId === chat.id ? 'bg-indigo-50 border-indigo-600' : 'border-transparent hover:bg-gray-50'
                )}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {chat.customerName || 'Unknown'}
                    </h4>
                    {isUrgent && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-red-500"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        title="Updated in last 60s"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase font-medium">
                    {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-xs truncate flex-1", selectedId === chat.id ? "text-gray-700" : "text-gray-500")}>
                    {chat.lastMessage}
                  </p>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {chat.leadPriority === 'hot' && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Hot</span>
                    )}
                    {chat.needsHumanReview && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 uppercase">Review</span>
                    )}
                    <div className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter',
                      chat.status === 'active' ? 'bg-green-100 text-green-700' :
                      chat.status === 'human_escalated' ? 'bg-red-100 text-red-700' :
                      'bg-gray-200 text-gray-600'
                    )}>
                      {chat.status === 'human_escalated' ? 'Urgent' : chat.status}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Chat Interface ─── */}
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selectedId}
            className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm"
            variants={slideInRight}
            initial="initial"
            animate="animate"
            exit="exit"
          >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200/70 flex items-center justify-between bg-white/85 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                {selected.customerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selected.customerName}</h4>
                <p className="text-xs text-gray-400 capitalize flex items-center gap-1.5">
                  <span className={cn('block w-1.5 h-1.5 rounded-full', selected.status === 'closed' ? 'bg-gray-300' : 'bg-green-500')} />
                  {selected.channel} · {selected.status.replace('_', ' ')}
                  {selected.leadPriority && (
                    <span className="ml-1 normal-case text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      {selected.leadPriority} · {selected.leadScore ?? '—'}
                    </span>
                  )}
                </p>
                {selected.lastCustomerMessageAt && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Last customer message: {shortWait(selected.lastCustomerMessageAt)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selected.status === 'human_escalated' && (
                <button 
                  onClick={() => updateStatus('active')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                >
                  <Zap className="w-3.5 h-3.5" /> Re-enable AI
                </button>
              )}
              {selected.status !== 'closed' && (
                <button 
                  onClick={() => confirm('Close this conversation?') && updateStatus('closed')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200"
                >
                  <XCircle className="w-3.5 h-3.5" /> Close
                </button>
              )}
              <div className="mx-2 w-px h-6 bg-gray-200" />
              <button onClick={() => setShowInfo(prev => !prev)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-50" title="Information"><Info className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 pattern-grid">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 italic text-sm">
                No history yet. Start the conversation.
              </div>
            )}
            {messages.map((msg, idx) => {
              const isFirstInGroup = idx === 0 || messages[idx-1].senderType !== msg.senderType;
              return (
                <motion.div
                  key={msg.id}
                  className={cn(
                    'flex items-start gap-3 w-full',
                    msg.senderType === 'customer' ? 'flex-row' : 'flex-row-reverse'
                  )}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm mt-1',
                    !isFirstInGroup && 'invisible',
                    msg.senderType === 'customer' ? 'bg-gray-400' : msg.senderType === 'ai' ? 'bg-indigo-600' : 'bg-emerald-600'
                  )}>
                    {msg.senderType === 'customer' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    'max-w-[80%] flex flex-col',
                    msg.senderType === 'customer' ? 'items-start' : 'items-end'
                  )}>
                    <div className={cn(
                      'p-3 rounded-2xl text-sm shadow-sm transition-all',
                      msg.senderType === 'customer'
                        ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100 hover:border-gray-200'
                        : msg.senderType === 'ai' 
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-emerald-600 text-white rounded-tr-none'
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[9px] mt-1 text-gray-400 font-medium px-1 uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.senderType === 'ai' && msg.intent && ` · ${msg.intent}`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Footer / Reply Area */}
          <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200/70 shadow-lg">
            {selected.status === 'human_escalated' && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 rounded-xl text-xs text-red-700 font-semibold border border-red-100 italic">
                <AlertTriangle className="w-4 h-4" /> Human Control Active: AI responses are restricted for this customer.
              </div>
            )}
            
            {selected.status === 'closed' ? (
              <div className="py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-500 font-medium italic">Conversation is closed. Re-open to send messages.</p>
                <button 
                  onClick={() => updateStatus('active')}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Restore Conversation
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="flex flex-col gap-3">
                <div className="relative group">
                  <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
                    {(business?.aiMacros?.length ?? 0) > 0 && (
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 max-w-[140px]"
                        defaultValue=""
                        onChange={e => {
                          const id = e.target.value;
                          const m = business?.aiMacros?.find(x => x.id === id);
                          if (m) setInput(prev => (prev ? `${prev}\n${m.content}` : m.content));
                          e.target.value = '';
                        }}
                      >
                        <option value="">Insert macro…</option>
                        {business?.aiMacros?.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={handleSuggestReply}
                      disabled={suggestingReply}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {suggestingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      AI Suggest Reply
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder={selected.status === 'human_escalated' ? "Reply as agent..." : "Type agent follow-up..."}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-none placeholder:text-gray-400 shadow-inner"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 group-focus-within:opacity-100 opacity-0 transition-opacity">Press Enter to send</span>
                    <motion.button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md disabled:bg-gray-300 disabled:shadow-none"
                      whileTap={{ scale: 0.88, rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </motion.button>
                  </div>
                </div>
              </form>
            )}
          </div>
          {showInfo && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 space-y-3 max-h-64 overflow-y-auto">
              <div><span className="font-semibold text-gray-800">Customer:</span> {selected.customerName || 'Unknown'}</div>
              <div><span className="font-semibold text-gray-800">Channel:</span> {selected.channel}</div>
              <div><span className="font-semibold text-gray-800">Conversation ID:</span> {selected.id}</div>
              {selected.sentimentTags && selected.sentimentTags.length > 0 && (
                <div>
                  <span className="font-semibold text-gray-800">Signals:</span>{' '}
                  {selected.sentimentTags.map(t => (
                    <span key={t} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-semibold">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-800">AI summary</span>
                <button
                  type="button"
                  onClick={() => void handleSummarizeThread()}
                  disabled={summarizing}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-60"
                >
                  {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Summarize
                </button>
              </div>
              {selected.threadSummary ? (
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.threadSummary}</p>
              ) : (
                <p className="text-gray-400 italic">No summary yet. Run Summarize to generate one.</p>
              )}
              {selected.threadSummaryNextAction && (
                <p className="text-gray-800"><span className="font-semibold">Next:</span> {selected.threadSummaryNextAction}</p>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <p className="font-semibold text-gray-800 mb-1">Internal notes (team only)</p>
                <ul className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                  {(selected.internalNotes || []).map(n => (
                    <li key={n.id} className="text-[11px] bg-white border border-gray-100 rounded p-2">
                      <span className="text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                      <br />
                      {n.text}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="Add a note for your team…"
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => void addInternalNote()}
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-900"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        ) : (
          <motion.div
            className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/20"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium">Select a conversation from the sidebar</p>
            <p className="text-xs mt-1">Real-time updates are enabled</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
