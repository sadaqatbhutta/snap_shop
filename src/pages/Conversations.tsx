/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Send, User, Bot, MoreVertical, Info, AlertTriangle, Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useBusiness } from '@/src/context/BusinessContext';
import { db } from '@/src/firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, limit
} from 'firebase/firestore';
import { processMessage } from '@/src/services/geminiService';
import { Conversation, Message } from '@/src/types';
import { auth } from '@/src/firebase';

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800',
  instagram: 'bg-pink-100 text-pink-800',
  facebook: 'bg-blue-100 text-blue-800',
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find(c => c.id === selectedId);

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
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    });
  }, [businessId]);

  // Live messages for selected conversation
  useEffect(() => {
    if (!businessId || !selectedId) return;
    const q = query(
      collection(db, `businesses/${businessId}/conversations/${selectedId}/messages`),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [businessId, selectedId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !businessId || !selectedId || !business || sending) return;
    setSending(true);

    const now = new Date().toISOString();
    const agentMsg: Omit<Message, 'id'> = {
      conversationId: selectedId,
      businessId,
      senderId: auth.currentUser?.uid || 'agent',
      senderType: 'agent',
      content: input.trim(),
      type: 'text',
      timestamp: now,
    };

    const msgText = input.trim();
    setInput('');

    try {
      await addDoc(
        collection(db, `businesses/${businessId}/conversations/${selectedId}/messages`),
        agentMsg
      );
      await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
        lastMessage: msgText,
        updatedAt: now,
      });
    } finally {
      setSending(false);
    }
  };

  const escalateToHuman = async () => {
    if (!businessId || !selectedId) return;
    await updateDoc(doc(db, `businesses/${businessId}/conversations`, selectedId), {
      status: 'human_escalated',
      updatedAt: new Date().toISOString(),
    });
  };

  const filtered = conversations.filter(c =>
    c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Conversation List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
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
            <button className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-indigo-600">
              <Filter className="w-3 h-3" /> Filter
            </button>
            <span className="text-xs text-gray-400">{conversations.filter(c => c.status === 'active').length} active</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="p-6 text-sm text-gray-400 text-center">No conversations yet.</p>
          )}
          {filtered.map(chat => (
            <div
              key={chat.id}
              onClick={() => setSelectedId(chat.id)}
              className={cn(
                'p-4 cursor-pointer transition-colors hover:bg-gray-50',
                selectedId === chat.id && 'bg-indigo-50'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                  {chat.customerName || 'Unknown'}
                </h4>
                <span className="text-xs text-gray-400 shrink-0">
                  {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                <span className={cn(
                  'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                  chat.status === 'active' ? 'bg-green-100 text-green-700' :
                  chat.status === 'human_escalated' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {chat.status === 'human_escalated' ? 'Human' : chat.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {selected.customerName?.charAt(0) || '?'}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{selected.customerName}</h4>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', CHANNEL_COLORS[selected.channel] || 'bg-gray-100 text-gray-600')}>
                  {selected.channel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selected.aiConfidence !== undefined && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                  AI {Math.round(selected.aiConfidence * 100)}%
                </span>
              )}
              <button className="hover:text-indigo-600 text-gray-400"><Info className="w-5 h-5" /></button>
              <button className="hover:text-indigo-600 text-gray-400"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn('flex items-end gap-3', msg.senderType === 'customer' ? 'flex-row' : 'flex-row-reverse')}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0',
                  msg.senderType === 'customer' ? 'bg-gray-400' : msg.senderType === 'ai' ? 'bg-indigo-600' : 'bg-emerald-600'
                )}>
                  {msg.senderType === 'customer' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={cn(
                  'max-w-[70%] p-3 rounded-2xl text-sm shadow-sm',
                  msg.senderType === 'customer'
                    ? 'bg-white text-gray-800 rounded-bl-none'
                    : 'bg-indigo-600 text-white rounded-br-none'
                )}>
                  <p>{msg.content}</p>
                  <p className={cn('text-[10px] mt-1', msg.senderType === 'customer' ? 'text-gray-400' : 'text-indigo-200')}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.intent && <span className="ml-2 opacity-70">· {msg.intent}</span>}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            {selected.status === 'human_escalated' && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 rounded-lg text-xs text-orange-700 font-medium">
                <AlertTriangle className="w-4 h-4" /> Human agent mode — AI is paused for this conversation.
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Select a conversation to start
        </div>
      )}

      {/* Customer Info Sidebar */}
      {selected && (
        <div className="w-64 border-l border-gray-200 bg-white p-5 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Channel</p>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', CHANNEL_COLORS[selected.channel] || 'bg-gray-100 text-gray-600')}>
                  {selected.channel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  selected.status === 'active' ? 'bg-green-100 text-green-700' :
                  selected.status === 'human_escalated' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {selected.status}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">AI Guardrails</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">AI Handling</span>
                <span className={cn('text-xs font-bold', selected.status === 'active' ? 'text-green-600' : 'text-orange-500')}>
                  {selected.status === 'active' ? 'ON' : 'OFF'}
                </span>
              </div>
              {selected.aiConfidence !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Confidence</span>
                  <span className="text-xs font-bold text-green-600">{Math.round(selected.aiConfidence * 100)}%</span>
                </div>
              )}
              {selected.status !== 'human_escalated' && (
                <button
                  onClick={escalateToHuman}
                  className="w-full py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Escalate to Human
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
