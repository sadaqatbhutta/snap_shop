import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Users, TrendingUp, Clock, ArrowUpRight, Megaphone, ListChecks, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import type { OnboardingProgress } from '../../../shared/types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Conversation, Broadcast } from '../../../shared/types';
import { staggerContainer, staggerItem, fadeUp } from '../lib/animations';
import { DashboardSkeleton } from '../components/Skeleton';

export default function Dashboard() {
  const { businessId, business, refreshBusiness } = useBusiness();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalActiveChats, setTotalActiveChats] = useState(0);
  const [totalBroadcastsSent, setTotalBroadcastsSent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [convTotal, setConvTotal] = useState(0);
  const [agentTotal, setAgentTotal] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    getDocs(collection(db, `businesses/${businessId}/conversations`))
      .then(s => setConvTotal(s.size))
      .catch(() => setConvTotal(0));
    getDocs(collection(db, `businesses/${businessId}/agents`))
      .then(s => setAgentTotal(s.size))
      .catch(() => setAgentTotal(0));
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;

    setLoading(false);

    // Live recent conversations
    const recentConvUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/conversations`), orderBy('updatedAt', 'desc'), limit(5)),
      snap => {
        setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      }
    );

    const convStatsUnsub = onSnapshot(
      collection(db, `businesses/${businessId}/conversations`),
      snap => {
        const allConversations = snap.docs.map(d => d.data() as Conversation);
        setTotalConversations(snap.size);
        setTotalActiveChats(allConversations.filter(c => c.status === 'active').length);
      }
    );

    // Live broadcasts
    const bcUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/broadcasts`), orderBy('createdAt', 'desc'), limit(3)),
      snap => setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast)))
    );

    const bcStatsUnsub = onSnapshot(
      collection(db, `businesses/${businessId}/broadcasts`),
      snap => {
        const allBroadcasts = snap.docs.map(d => d.data() as Broadcast);
        setTotalBroadcastsSent(allBroadcasts.filter(b => b.status === 'sent').length);
      }
    );

    // Customer count (non-blocking)
    getDocs(collection(db, `businesses/${businessId}/customers`)).then(s => setCustomerCount(s.size)).catch(() => setCustomerCount(0));

    return () => { recentConvUnsub(); convStatsUnsub(); bcUnsub(); bcStatsUnsub(); };
  }, [businessId]);

  const activeCount = totalActiveChats;

  const ob: Partial<OnboardingProgress> = business?.onboarding ?? {};
  const aiKnowledgeDone =
    (business?.faqs?.length ?? 0) > 0 ||
    (business?.aiContext?.length ?? 0) > 120 ||
    ob.faqsAdded ||
    ob.aiContextFilled;
  const teamDone = agentTotal > 0 || ob.teamInvited;
  const chatsDone = convTotal > 0 || ob.firstTestChat;
  const channelsDone = ob.channelReviewed;

  const onboardingItems = [
    { done: aiKnowledgeDone, label: 'Teach the AI (context + FAQs)', href: '/ai-settings' },
    { done: channelsDone, label: 'Configure channel webhooks', href: '/settings', manualKey: 'channelReviewed' as const },
    { done: teamDone, label: 'Invite a teammate', href: '/settings' },
    { done: chatsDone, label: 'Receive your first customer message', href: '/conversations' },
  ];

  const onboardingComplete = onboardingItems.every(i => i.done);

  const markOnboarding = async (key: keyof OnboardingProgress) => {
    if (!businessId) return;
    await updateDoc(doc(db, 'businesses', businessId), {
      onboarding: { ...ob, [key]: true },
    });
    await refreshBusiness();
  };

  const stats = [
    { label: 'Total Conversations', value: totalConversations.toString(), icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Customers', value: customerCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Chats', value: activeCount.toString(), icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Broadcasts Sent', value: totalBroadcastsSent.toString(), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {!onboardingComplete && (
        <motion.div
          className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white shadow-lg"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/15 rounded-xl shrink-0">
              <ListChecks className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Getting started</h2>
              <p className="text-sm text-indigo-100 mt-1">Complete these steps to get the most from SnapShop.</p>
              <ul className="mt-4 space-y-2">
                {onboardingItems.map(item => (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-white/50 shrink-0" />
                    )}
                    <Link to={item.href} className={cn('hover:underline font-medium', item.done ? 'text-indigo-100 line-through opacity-80' : '')}>
                      {item.label}
                    </Link>
                    {!item.done && item.manualKey === 'channelReviewed' && (
                      <button
                        type="button"
                        onClick={() => void markOnboarding('channelReviewed')}
                        className="ml-auto text-xs font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg shrink-0"
                      >
                        Mark done
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {stats.map(stat => (
          <motion.div
            key={stat.label}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            variants={staggerItem}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Conversations */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <motion.div
              className="p-6 border-b border-gray-200 flex items-center justify-between"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <h3 className="font-semibold text-gray-800">Recent Conversations</h3>
              <Link to="/conversations" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </motion.div>
            <motion.div
              className="divide-y divide-gray-100"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {conversations.length === 0 && (
                <p className="p-6 text-sm text-gray-400 text-center">No conversations yet. Messages from your channels will appear here.</p>
              )}
              {conversations.map(conv => (
                <motion.div key={conv.id} variants={staggerItem}>
                  <Link
                    to="/conversations"
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer block"
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
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Recent Broadcasts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <motion.div
              className="p-6 border-b border-gray-200 flex items-center justify-between"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <h3 className="font-semibold text-gray-800">Recent Broadcasts</h3>
              <Link to="/broadcasts" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </motion.div>
            <motion.div
              className="p-6 space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {broadcasts.length === 0 && (
                <p className="text-sm text-gray-400 text-center">No broadcasts yet.</p>
              )}
              {broadcasts.map(bc => (
                <motion.div
                  key={bc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  variants={staggerItem}
                >
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
                </motion.div>
              ))}
            </motion.div>
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
