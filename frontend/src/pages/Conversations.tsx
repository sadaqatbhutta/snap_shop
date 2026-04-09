import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Send, User, Bot, Info, AlertTriangle, Loader2, XCircle, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, limit
} from 'firebase/firestore';
import { Conversation, Message } from '../../../shared/types';
import { auth } from '../firebase';
import { slideInRight, fadeIn } from '../lib/animations';
import { ConversationsSkeleton } from '../components/Skeleton';

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800',
  instagram: 'bg-pink-100 text-pink-800',
  facebook: 'bg-blue-100 text-blue-800',
  webchat: 'bg-gray-100 text-gray-800',
};

export default function Conversations() {
  const { businessId } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [nowForUrgent, setNowForUrgent] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  
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
    if (!businessId) return;
    const q = query(
      collection(db, `businesses/${businessId}/conversations`),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(data);
      setLoading(false);
    });
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
      // ─── FIX: Call backend API to send message to customer ─────────────
      const response = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const updateStatus = async (status: 'active' | 'closed' | 'human_escalated') => {
    if (!businessId || !selectedId) return;
    await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const filtered = conversations.filter(c =>
    c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <ConversationsSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* ─── Conversation List ─── */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50/30">
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
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              <Filter className="w-3 h-3" /> Filter
            </button>
            <span className="text-xs text-gray-400">
              {conversations.filter(c => c.status !== 'closed').length} active
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="p-10 text-sm text-gray-400 text-center italic">No conversations found.</p>
          )}
          {filtered.map(chat => {
            const isUrgent = chat.status === 'human_escalated' && 
                            (nowForUrgent - new Date(chat.updatedAt).getTime()) < 60000;
            
            return (
              <motion.div
                key={chat.id}
                onClick={() => setSelectedId(chat.id)}
                className={cn(
                  'p-4 cursor-pointer transition-all border-l-4 relative',
                  selectedId === chat.id ? 'bg-indigo-50 border-indigo-600' : 'border-transparent hover:bg-gray-50'
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {chat.customerName || 'Unknown'}
                    </h4>
                    {isUrgent && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Updated in last 60s" />
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
                  <div className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter',
                    chat.status === 'active' ? 'bg-green-100 text-green-700' :
                    chat.status === 'human_escalated' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-600'
                  )}>
                    {chat.status === 'human_escalated' ? 'Urgent' : chat.status}
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
            className="flex-1 flex flex-col bg-white"
            variants={slideInRight}
            initial="initial"
            animate="animate"
            exit="exit"
          >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                {selected.customerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{selected.customerName}</h4>
                <p className="text-xs text-gray-400 capitalize flex items-center gap-1.5">
                  <span className={cn('block w-1.5 h-1.5 rounded-full', selected.status === 'closed' ? 'bg-gray-300' : 'bg-green-500')} />
                  {selected.channel} · {selected.status.replace('_', ' ')}
                </p>
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
              <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-50" title="Information"><Info className="w-5 h-5" /></button>
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
          <div className="p-4 bg-white border-t border-gray-200 shadow-lg">
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
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-transform active:scale-95 shadow-md disabled:bg-gray-300 disabled:shadow-none"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
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
