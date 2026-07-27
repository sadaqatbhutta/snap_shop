import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Users, TrendingUp, Clock, ArrowUpRight, Megaphone, ListChecks, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import type { OnboardingProgress } from '../../../shared/types';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer, doc, updateDoc, where } from 'firebase/firestore';
import { Conversation, Broadcast } from '../../../shared/types';
import { staggerContainer, staggerItem, fadeUp } from '../lib/animations';
import { DashboardSkeleton } from '../components/Skeleton';

async function countQuery(q: Parameters<typeof getCountFromServer>[0]) {
  try {
    return (await getCountFromServer(q)).data().count;
  } catch {
    return 0;
  }
}

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
  const [onboardingSavingKey, setOnboardingSavingKey] = useState<keyof OnboardingProgress | null>(null);

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;
    setLoading(false);

    const recentConvUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/conversations`), orderBy('updatedAt', 'desc'), limit(5)),
      snap => {
        setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      },
    );

    const bcUnsub = onSnapshot(
      query(collection(db, `businesses/${businessId}/broadcasts`), orderBy('createdAt', 'desc'), limit(3)),
      snap => setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast))),
    );

    const conversationsCol = collection(db, `businesses/${businessId}/conversations`);
    const broadcastsCol = collection(db, `businesses/${businessId}/broadcasts`);

    void Promise.all([
      countQuery(query(conversationsCol)),
      countQuery(query(collection(db, `businesses/${businessId}/agents`))),
      countQuery(query(conversationsCol, where('status', '==', 'active'))),
      countQuery(query(broadcastsCol, where('status', '==', 'sent'))),
      countQuery(query(collection(db, `businesses/${businessId}/customers`))),
    ]).then(([convCount, agents, active, sent, customers]) => {
      if (cancelled) return;
      setConvTotal(convCount);
      setTotalConversations(convCount);
      setAgentTotal(agents);
      setTotalActiveChats(active);
      setTotalBroadcastsSent(sent);
      setCustomerCount(customers);
    });

    return () => {
      cancelled = true;
      recentConvUnsub();
      bcUnsub();
    };
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
    { done: aiKnowledgeDone, label: 'Teach the AI (context + FAQs)', href: '/app/ai-settings', key: 'aiContextFilled' as const },
    { done: channelsDone, label: 'Configure channel webhooks', href: '/app/settings', key: 'channelReviewed' as const },
    { done: teamDone, label: 'Invite a teammate', href: '/app/settings', key: 'teamInvited' as const },
    { done: chatsDone, label: 'Receive your first customer message', href: '/app/conversations', key: 'firstTestChat' as const },
  ];

  const onboardingComplete = onboardingItems.every(i => i.done);

  const setOnboardingValue = async (key: keyof OnboardingProgress, value: boolean) => {
    if (!businessId) return;
    setOnboardingSavingKey(key);
    await updateDoc(doc(db, 'businesses', businessId), {
      onboarding: { ...ob, [key]: value },
    });
    await refreshBusiness();
    setOnboardingSavingKey(null);
  };

  const stats = [
    { label: 'Conversations', value: totalConversations.toString(), icon: MessageSquare },
    { label: 'Customers', value: customerCount.toString(), icon: Users },
    { label: 'Active chats', value: activeCount.toString(), icon: Clock },
    { label: 'Broadcasts', value: totalBroadcastsSent.toString(), icon: TrendingUp },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <motion.div
        className="relative overflow-hidden rounded-[1.5rem] hero-stage text-white px-6 py-8 sm:px-8 sm:py-9"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--accent-bright)]">Today</p>
            <h1 className="font-display text-4xl sm:text-5xl mt-2 leading-none">
              {business?.name || 'SnapShop'}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/65 leading-relaxed">
              Your AI inbox is live — replies, escalations, and campaigns in one calm surface.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-[0.7rem] border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm">
            <span className="status-dot" />
            AI online · {activeCount} active
          </div>
        </div>
      </motion.div>

      {!onboardingComplete && (
        <motion.div
          className="surface-card p-6"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-teal-50 text-teal-800 rounded-xl shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl text-[var(--ink)]">Getting started</h2>
              <p className="text-sm text-slate-500 mt-1">A few steps to make SnapShop feel like your team.</p>
              <ul className="mt-4 space-y-2.5">
                {onboardingItems.map(item => (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                    <Link to={item.href} className={cn('hover:underline font-medium text-[var(--ink)]', item.done && 'text-slate-400 line-through')}>
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      disabled={onboardingSavingKey === item.key}
                      onClick={() => void setOnboardingValue(item.key, !item.done)}
                      className="ml-auto text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg shrink-0 disabled:opacity-60"
                    >
                      {onboardingSavingKey === item.key ? 'Saving…' : item.done ? 'Undo' : 'Done'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {stats.map(stat => (
          <motion.div
            key={stat.label}
            className="kpi-tile p-5 hover-lift bg-white/90"
            variants={staggerItem}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                <stat.icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--ink-soft)]/50" />
            </div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{stat.label}</h3>
            <p className="font-display text-3xl text-[var(--ink)] mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card overflow-hidden">
            <motion.div
              className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <h3 className="font-semibold text-[var(--ink)]">Recent conversations</h3>
              <Link to="/app/conversations" className="text-sm text-teal-800 font-semibold hover:underline">View all</Link>
            </motion.div>
            <motion.div
              className="divide-y divide-[var(--line)]"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {conversations.length === 0 && (
                <p className="p-6 text-sm text-slate-400 text-center">No conversations yet. Channel messages will appear here.</p>
              )}
              {conversations.map(conv => (
                <motion.div key={conv.id} variants={staggerItem}>
                  <Link
                    to="/app/conversations"
                    className="p-4 hover:bg-teal-50/40 transition-colors flex items-center justify-between cursor-pointer block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-800">
                        {conv.customerName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--ink)]">{conv.customerName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{conv.lastMessage}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1',
                        conv.status === 'active' ? 'bg-teal-50 text-teal-800' :
                        conv.status === 'human_escalated' ? 'bg-amber-50 text-amber-800' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        {conv.status === 'human_escalated' ? 'Human' : conv.status}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="surface-card overflow-hidden">
            <motion.div
              className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between"
              variants={fadeUp}
              initial="initial"
              animate="animate"
            >
              <h3 className="font-semibold text-[var(--ink)]">Recent broadcasts</h3>
              <Link to="/app/broadcasts" className="text-sm text-teal-800 font-semibold hover:underline">View all</Link>
            </motion.div>
            <motion.div
              className="p-5 space-y-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {broadcasts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No broadcasts yet.</p>
              )}
              {broadcasts.map(bc => (
                <motion.div
                  key={bc.id}
                  className="hover-lift flex items-center justify-between p-3.5 rounded-xl bg-[var(--mist)]/60"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-[var(--line)]">
                      <Megaphone className="w-4 h-4 text-teal-800" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{bc.name}</p>
                      <p className="text-xs text-slate-500">Reach: {bc.reach.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded',
                    bc.status === 'sent' ? 'text-teal-800 bg-teal-50' :
                    bc.status === 'scheduled' ? 'text-sky-700 bg-sky-50' :
                    'text-slate-600 bg-slate-100'
                  )}>
                    {bc.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-card p-5">
            <h3 className="font-semibold text-[var(--ink)] mb-3">Quick actions</h3>
            <div className="space-y-2.5">
              <Link to="/app/broadcasts" className="btn-primary block w-full py-2.5 text-center text-sm">
                Broadcast message
              </Link>
              <Link to="/app/knowledge" className="btn-accent block w-full py-2.5 text-center text-sm">
                Add knowledge
              </Link>
              <Link to="/app/ai-settings" className="btn-ghost block w-full py-2.5 text-center text-sm">
                Teach the AI
              </Link>
              <Link to="/app/crm" className="btn-ghost block w-full py-2.5 text-center text-sm">
                Open CRM
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-white">
            <div className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full bg-teal-400/30 blur-2xl" />
            <h3 className="font-semibold relative">AI pulse</h3>
            <p className="text-sm text-slate-300 mt-2 relative">
              Handling {activeCount} active conversation{activeCount !== 1 ? 's' : ''} right now.
            </p>
            <div className="mt-4 w-full bg-white/10 rounded-full h-1.5 relative">
              <div className="bg-teal-300 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, activeCount * 10)}%` }} />
            </div>
            <p className="text-xs text-teal-200/80 mt-2 relative">{activeCount} live</p>
          </div>
        </div>
      </div>
    </div>
  );
}
