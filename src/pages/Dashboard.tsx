/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, TrendingUp, Clock, ArrowUpRight, Megaphone, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useBusiness } from '@/src/context/BusinessContext';
import { db } from '@/src/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { Conversation, Broadcast } from '@/src/types';

export default function Dashboard() {
  const { businessId } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    // Live recent conversations
    const convUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/conversations`), orderBy('updatedAt', 'desc'), limit(5)),
      snap => {
        setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
        setLoading(false);
      }
    );

    // Live broadcasts
    const bcUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/broadcasts`), orderBy('createdAt', 'desc'), limit(3)),
      snap => setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast)))
    );

    // Customer count
    getDocs(collection(db, `businesses/${businessId}/customers`)).then(s => setCustomerCount(s.size));

    return () => { convUnsub(); bcUnsub(); };
  }, [businessId]);

  const activeCount = conversations.filter(c => c.status === 'active').length;

  const stats = [
    { label: 'Total Conversations', value: conversations.length.toString(), icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Customers', value: customerCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Chats', value: activeCount.toString(), icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Broadcasts Sent', value: broadcasts.filter(b => b.status === 'sent').length.toString(), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Conversations */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Conversations</h3>
              <Link to="/conversations" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {conversations.length === 0 && (
                <p className="p-6 text-sm text-gray-400 text-center">No conversations yet. Messages from your channels will appear here.</p>
              )}
              {conversations.map(conv => (
                <Link
                  key={conv.id}
                  to="/conversations"
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                      {conv.customerName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{conv.customerName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{conv.lastMessage}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1',
                      conv.status === 'active' ? 'bg-green-100 text-green-800' :
                      conv.status === 'human_escalated' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {conv.status === 'human_escalated' ? 'Human' : conv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Broadcasts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Broadcasts</h3>
              <Link to="/broadcasts" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </div>
            <div className="p-6 space-y-4">
              {broadcasts.length === 0 && (
                <p className="text-sm text-gray-400 text-center">No broadcasts yet.</p>
              )}
              {broadcasts.map(bc => (
                <div key={bc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Megaphone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bc.name}</p>
                      <p className="text-xs text-gray-500">Reach: {bc.reach.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded',
                    bc.status === 'sent' ? 'text-green-600 bg-green-50' :
                    bc.status === 'scheduled' ? 'text-blue-600 bg-blue-50' :
                    'text-gray-600 bg-gray-100'
                  )}>
                    {bc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/broadcasts" className="block w-full py-2 px-4 bg-indigo-600 text-white text-center rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Broadcast Message
              </Link>
              <Link to="/ai-settings" className="block w-full py-2 px-4 border border-indigo-600 text-indigo-600 text-center rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                Add New FAQ
              </Link>
              <Link to="/crm" className="block w-full py-2 px-4 border border-gray-200 text-gray-600 text-center rounded-lg font-medium hover:bg-gray-50 transition-colors">
                View CRM
              </Link>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-xl shadow-lg text-white">
            <h3 className="font-semibold mb-2">AI Status: Online</h3>
            <p className="text-sm text-indigo-100 mb-4">
              SnapShop AI is handling {activeCount} active conversation{activeCount !== 1 ? 's' : ''}.
            </p>
            <div className="w-full bg-indigo-500 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.min(100, activeCount * 10)}%` }} />
            </div>
            <p className="text-xs text-indigo-100 mt-2">{activeCount} active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
