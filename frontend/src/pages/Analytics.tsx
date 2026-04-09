/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { BarChart, LineChart, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Conversation, Message } from '../../../shared/types';
import { staggerContainer, staggerItem, fadeUp } from '../lib/animations';

interface Stats {
  convsByDay: number[];
  intentCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  totalMessages: number;
  escalationRate: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [motionValue, value]);

  return <motion.span>{rounded}</motion.span>;
}

export default function Analytics() {
  const { businessId } = useBusiness();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    async function load() {
      // 1. Fetch pre-aggregated daily stats (Last 30 days)
      const statsSnap = await getDocs(
        query(collection(db, `businesses/${businessId}/stats`), orderBy('__name__', 'desc'), limit(30))
      );
      
      // 2. Fetch recent conversations (Last 200 - for channel/escalation breakdown)
      const convSnap = await getDocs(
        query(collection(db, `businesses/${businessId}/conversations`), orderBy('updatedAt', 'desc'), limit(200))
      );

      const statsDocs = statsSnap.docs.map(d => ({ date: d.id.replace('daily_', ''), ...d.data() }));
      const convs = convSnap.docs.map(d => d.data() as Conversation);

      // Aggregates from stats
      const convsByDay = Array(12).fill(0);
      const now = new Date();
      let aggregatedTotalMessages = 0;
      const aggregatedIntents: Record<string, number> = {};

      statsDocs.forEach(s => {
        const date = new Date(s.date);
        const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
        if (diffDays < 12) {
          convsByDay[11 - diffDays] = (s as any).totalConversations || 0;
        }
        aggregatedTotalMessages += (s as any).totalMessages || 0;
        
        const intents = (s as any).intentCounts || {};
        Object.entries(intents).forEach(([intent, count]) => {
          aggregatedIntents[intent] = (aggregatedIntents[intent] || 0) + (count as number);
        });
      });

      // Breakdowns from existing convs (Fallback until new stats accumulate)
      const channelCounts: Record<string, number> = {};
      convs.forEach(c => { channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1; });

      const escalated = convs.filter(c => c.status === 'human_escalated').length;
      const escalationRate = convs.length ? Math.round((escalated / convs.length) * 100) : 0;

      setStats({
        convsByDay,
        intentCounts: aggregatedIntents,
        channelCounts,
        totalMessages: aggregatedTotalMessages,
        escalationRate
      });
      setLoading(false);
    }

    load();
  }, [businessId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  const maxConv = Math.max(...(stats?.convsByDay || [1]), 1);
  const totalConvs = stats?.convsByDay.reduce((a, b) => a + b, 0) || 0;

  const channelTotal = Object.values(stats?.channelCounts || {}).reduce((a, b) => a + b, 0) || 1;
  const channels = Object.entries(stats?.channelCounts || {}).sort((a, b) => b[1] - a[1]);

  const intentTotal = Object.values(stats?.intentCounts || {}).reduce((a, b) => a + b, 0) || 1;
  const intents = Object.entries(stats?.intentCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const intentColors: Record<string, string> = {
    inquiry: 'bg-indigo-500',
    order_request: 'bg-green-500',
    complaint: 'bg-red-500',
    greeting: 'bg-yellow-500',
    spam: 'bg-gray-400',
    unknown: 'bg-gray-300',
  };

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Calendar className="w-4 h-4" /> Last 12 Days <ChevronDown className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {[
          { label: 'Total Conversations', value: totalConvs, isNumber: true },
          { label: 'Total Messages', value: stats?.totalMessages || 0, isNumber: true },
          { label: 'Escalation Rate', value: stats?.escalationRate || 0, suffix: '%', isNumber: true },
          { label: 'Channels Active', value: channels.length, isNumber: true },
        ].map(s => (
          <motion.div
            key={s.label}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm"
            variants={staggerItem}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {s.isNumber ? <AnimatedNumber value={typeof s.value === 'number' ? s.value : 0} /> : s.value}
              {s.suffix || ''}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Conversation Volume Bar Chart */}
        <motion.div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-800">Conversation Volume</h4>
            <BarChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-48 flex items-end gap-1.5">
            {stats?.convsByDay.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                  style={{ height: `${Math.max(4, (v / maxConv) * 100)}%` }}
                />
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {v} conv
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-medium">
            <span>12d ago</span>
            <span>6d ago</span>
            <span>Today</span>
          </div>
        </motion.div>

        {/* Channel Distribution */}
        <motion.div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h4 className="font-semibold text-gray-800 mb-6">Channel Distribution</h4>
          {channels.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
          ) : (
            <div className="space-y-4">
              {channels.map(([ch, count]) => (
                <div key={ch} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{ch}</span>
                    <span className="font-bold text-gray-900">{Math.round((count / channelTotal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(count / channelTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Intent Analysis */}
      <motion.div
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h4 className="font-semibold text-gray-800 mb-6">Intent Analysis</h4>
        {intents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No intent data yet. Intents are detected as messages come in via webhooks.</p>
        ) : (
          <div className="space-y-5">
            {intents.map(([intent, count]) => (
              <div key={intent} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{intent.replace('_', ' ')}</span>
                  <span className="font-bold text-gray-900">{Math.round((count / intentTotal) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={cn('h-2 rounded-full', intentColors[intent] || 'bg-indigo-400')}
                    style={{ width: `${(count / intentTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
