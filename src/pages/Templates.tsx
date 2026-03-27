/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Edit2, Trash2, Copy, Layout,
  Type, Image as ImageIcon, CheckCircle2, ChevronLeft, X, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { useBusiness } from '@/src/context/BusinessContext';
import { db } from '@/src/firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc
} from 'firebase/firestore';
import { Template } from '@/src/types';

export default function Templates() {
  const { businessId } = useBusiness();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', content: '', type: 'text' as 'text' | 'image' });

  useEffect(() => {
    if (!businessId) return;
    return onSnapshot(
      query(collection(db, `businesses/${businessId}/templates`), orderBy('createdAt', 'desc')),
      snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Template)))
    );
  }, [businessId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    const now = new Date().toISOString();
    await addDoc(collection(db, `businesses/${businessId}/templates`), {
      businessId,
      name: form.name,
      content: form.content,
      type: form.type,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    setSaving(false);
    setIsModalOpen(false);
    setForm({ name: '', content: '', type: 'text' });
  };

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm('Delete this template?')) return;
    await deleteDoc(doc(db, `businesses/${businessId}/templates`, id));
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/broadcasts" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-500">Manage pre-defined messages for your broadcasts.</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search templates..."
          className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(template => (
          <div key={template.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-300 transition-all">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg', template.type === 'text' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600')}>
                    {template.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{template.content}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Used {template.usageCount} times
                </div>
                <div>{new Date(template.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => { setForm({ name: template.name + ' (copy)', content: template.content, type: template.type }); setIsModalOpen(true); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Duplicate
              </button>
              <button className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Layout className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 hover:border-indigo-300 transition-all group"
        >
          <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Add New Template</p>
            <p className="text-xs text-gray-500">Create a reusable message</p>
          </div>
        </button>
      </div>

      {filtered.length === 0 && templates.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No templates yet. Create your first one above.</div>
      )}

      {/* Create Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Create Template</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name</label>
                <input required type="text" placeholder="e.g. Eid Mubarak Discount" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                <div className="flex gap-3">
                  {(['text', 'image'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize',
                        form.type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Message Content</label>
                <textarea required rows={4} placeholder="Write your message here... Use [Link] for URLs."
                  value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
