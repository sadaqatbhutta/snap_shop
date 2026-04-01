/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Search, Filter, Calendar, Clock, CheckCircle2,
  AlertCircle, MoreVertical, Users, FileText, TrendingUp, X, Loader2,
  Send, Trash2 as Trash
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Broadcast, Template, Segment } from '../../../shared/types';

export default function Broadcasts() {
  const { businessId } = useBusiness();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', templateId: '', segmentId: '', scheduledAt: '' });

  useEffect(() => {
    if (!businessId) return;
    const unsubs = [
      onSnapshot(query(collection(db, `businesses/${businessId}/broadcasts`), orderBy('createdAt', 'desc')), snap =>
        setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast)))
      ),
      onSnapshot(collection(db, `businesses/${businessId}/templates`), snap =>
        setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Template)))
      ),
      onSnapshot(collection(db, `businesses/${businessId}/segments`), snap =>
        setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [businessId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    const tmpl = templates.find(t => t.id === form.templateId);
    const seg = segments.find(s => s.id === form.segmentId);
    const now = new Date().toISOString();
    await addDoc(collection(db, `businesses/${businessId}/broadcasts`), {
      businessId,
      name: form.name,
      templateId: form.templateId,
      templateName: tmpl?.name || '',
      segmentId: form.segmentId,
      segmentName: seg?.name || '',
      status: form.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: form.scheduledAt || null,
      reach: seg?.count || 0,
      createdAt: now,
    });
    setSaving(false);
    setIsModalOpen(false);
    setForm({ name: '', templateId: '', segmentId: '', scheduledAt: '' });
  };

  const handleSendNow = async (broadcastId: string) => {
    if (!businessId || !confirm('Are you sure you want to send this broadcast now?')) return;
    try {
      const resp = await fetch(`/api/broadcast/${broadcastId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      if (!resp.ok) throw new Error('Failed to trigger broadcast');
      const data = await resp.json();
      alert(data.scheduled ? 'Broadcast scheduled successfully!' : 'Broadcast started!');
    } catch (err) {
      console.error(err);
      alert('Error triggering broadcast');
    }
  };

  const filtered = broadcasts.filter(b => activeTab === 'all' || b.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-500 text-sm">Send bulk messages to your customer segments.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/segments" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
            <Users className="w-4 h-4 text-indigo-500" /> Segments
          </Link>
          <Link to="/templates" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
            <FileText className="w-4 h-4 text-indigo-500" /> Templates
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
            <Plus className="w-4 h-4" /> New Broadcast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Broadcasts', value: broadcasts.length, icon: Megaphone, bg: 'bg-indigo-50', color: 'text-indigo-600' },
          { label: 'Messages Sent', value: broadcasts.filter(b => b.status === 'sent').reduce((a, b) => a + (b.reach || 0), 0).toLocaleString(), icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'Scheduled', value: broadcasts.filter(b => b.status === 'scheduled').length, icon: TrendingUp, bg: 'bg-orange-50', color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-hover hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl', s.bg)}>
                <s.icon className={cn('w-6 h-6', s.color)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-0.5">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex bg-gray-50 p-1 rounded-xl">
          {['all', 'sent', 'scheduled', 'draft'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-6 py-2 text-xs font-bold rounded-lg capitalize transition-all',
                activeTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-20 text-center opacity-50">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium italic">No broadcasts found in this category.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Info</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuration</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Date</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Reach</th>
                <th className="px-6 py-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(bc => (
                <tr key={bc.id} className="group hover:bg-indigo-50/20 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{bc.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">ID: {bc.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 w-fit">
                        <FileText className="w-3 h-3 text-indigo-400" />
                        <span className="text-[11px] font-bold text-gray-600">{bc.templateName || 'Untitled Template'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 w-fit">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span className="text-[11px] font-bold text-gray-600 italic">{bc.segmentName || 'All Customers'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm',
                      bc.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      bc.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      bc.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    )}>
                      {bc.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                      {bc.status === 'scheduled' && <Clock className="w-3 h-3" />}
                      {bc.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-700">
                        {bc.sentAt || bc.scheduledAt ? new Date(bc.sentAt || bc.scheduledAt!).toLocaleDateString() : new Date(bc.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {bc.sentAt || bc.scheduledAt ? new Date(bc.sentAt || bc.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Drafted'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-indigo-600 text-lg">
                    {bc.reach.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {bc.status !== 'sent' && (
                        <button
                          onClick={() => handleSendNow(bc.id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-100"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Now
                        </button>
                      )}
                      
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this broadcast archive?')) return;
                          const { doc, deleteDoc } = await import('firebase/firestore');
                          await deleteDoc(doc(db, `businesses/${businessId}/broadcasts`, bc.id));
                        }}
                        className="p-2.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Broadcast Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2"><Megaphone className="w-5 h-5" /> New Broadcast</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Broadcast Name</label>
                <input required type="text" placeholder="e.g. Eid Special Offer" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Template</label>
                <select required value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                  <option value="">Select a template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {templates.length === 0 && <p className="text-xs text-orange-500 mt-1">No templates yet. <Link to="/templates" className="underline">Create one first.</Link></p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Segment</label>
                <select required value={form.segmentId} onChange={e => setForm({ ...form, segmentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                  <option value="">Select a segment...</option>
                  {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
                </select>
                {segments.length === 0 && <p className="text-xs text-orange-500 mt-1">No segments yet. <Link to="/segments" className="underline">Create one first.</Link></p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
