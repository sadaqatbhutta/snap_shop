import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, ChevronLeft, UserPlus,
  Tag, Hash, X, Calendar, MessageCircle, Filter, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, getDocs, where
} from 'firebase/firestore';
import { Segment } from '../../../shared/types';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '../lib/animations';

const defaultForm = {
  name: '', description: '', channel: 'all', tags: '',
  tagLogic: 'AND' as 'AND' | 'OR', excludedTags: '', lastInteraction: 'any',
};

export default function Segments() {
  const { businessId } = useBusiness();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    return onSnapshot(
      query(collection(db, `businesses/${businessId}/segments`), orderBy('createdAt', 'desc')),
      snap => setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Segment)))
    );
  }, [businessId]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setFormData({
      name: seg.name,
      description: seg.description,
      channel: seg.criteria.channel || 'all',
      tags: seg.criteria.tags?.join(', ') || '',
      tagLogic: seg.criteria.tagLogic || 'AND',
      excludedTags: seg.criteria.excludedTags?.join(', ') || '',
      lastInteraction: seg.criteria.lastInteraction || 'any',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    let custQuery = query(collection(db, `businesses/${businessId}/customers`));
    if (formData.channel !== 'all') {
      custQuery = query(collection(db, `businesses/${businessId}/customers`), where('channel', '==', formData.channel));
    }
    const criteria: Segment['criteria'] = {};
    if (formData.channel !== 'all') criteria.channel = formData.channel as Segment['criteria']['channel'];
    if (formData.tags) {
      criteria.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      criteria.tagLogic = formData.tagLogic;
    }
    if (formData.excludedTags) criteria.excludedTags = formData.excludedTags.split(',').map(t => t.trim()).filter(Boolean);
    if (formData.lastInteraction !== 'any') criteria.lastInteraction = formData.lastInteraction;

    const custSnap = await getDocs(custQuery);
    const customers = custSnap.docs.map(d => d.data() as any);
    const cutoffDate = criteria.lastInteraction
      ? (() => {
          const parsedDays = parseInt(criteria.lastInteraction, 10);
          if (Number.isNaN(parsedDays)) return null;
          const date = new Date();
          date.setDate(date.getDate() - parsedDays);
          return date;
        })()
      : null;

    const count = customers.filter(customer => {
      if (criteria.tagLogic === 'AND' && criteria.tags?.length) {
        const hasAllTags = criteria.tags.every(tag => customer.tags?.includes(tag));
        if (!hasAllTags) return false;
      }
      if (criteria.tagLogic !== 'AND' && criteria.tags?.length) {
        const hasAnyTag = criteria.tags.some(tag => customer.tags?.includes(tag));
        if (!hasAnyTag) return false;
      }
      if (criteria.excludedTags?.length) {
        const hasExcluded = criteria.excludedTags.some(tag => customer.tags?.includes(tag));
        if (hasExcluded) return false;
      }
      if (cutoffDate && customer.lastInteractionAt) {
        if (new Date(customer.lastInteractionAt) < cutoffDate) return false;
      }
      return true;
    }).length;

    const now = new Date().toISOString();

    if (editingId) {
      await updateDoc(doc(db, `businesses/${businessId}/segments`, editingId), {
        name: formData.name,
        description: formData.description,
        criteria,
        count,
        updatedAt: now,
      });
    } else {
      await addDoc(collection(db, `businesses/${businessId}/segments`), {
        businessId,
        name: formData.name,
        description: formData.description,
        criteria,
        count,
        createdAt: now,
        updatedAt: now,
      });
    }

    setSaving(false);
    setIsModalOpen(false);
    setFormData(defaultForm);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!businessId || !confirm('Delete this segment?')) return;
    await deleteDoc(doc(db, `businesses/${businessId}/segments`, id));
  };

  const criteriaLabel = (seg: Segment) => {
    const parts: string[] = [];
    if (seg.criteria.channel) parts.push(`Channel: ${seg.criteria.channel}`);
    if (seg.criteria.tags?.length) parts.push(`Tags: ${seg.criteria.tags.join(` ${seg.criteria.tagLogic} `)}`);
    if (seg.criteria.lastInteraction) parts.push(`Last: ${seg.criteria.lastInteraction}`);
    return parts.join(' | ') || 'All';
  };

  const filtered = segments.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-gray-900">
      <motion.div
        className="flex justify-between items-center"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center gap-4">
          <Link to="/broadcasts" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Customer Segments</h1>
            <p className="text-gray-500">Group your customers for targeted broadcasts.</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Create Segment
        </button>
      </motion.div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search segments..."
          className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No segments yet. Create one to target specific customers.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criteria</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Customers</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-gray-200"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filtered.map(segment => (
                <motion.tr
                  key={segment.id}
                  className="hover:bg-gray-50 transition-colors group"
                  variants={staggerItem}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}
                  whileTap={{ scale: 0.995 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="text-sm font-medium">{segment.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500 line-clamp-1">{segment.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 max-w-xs overflow-hidden">
                      <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-600 truncate">{criteriaLabel(segment)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-semibold">{segment.count.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(segment.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(segment)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(segment.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        )}
      </div>

      <div
        onClick={openCreate}
        className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 hover:border-indigo-300 transition-all group cursor-pointer"
      >
        <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
          <UserPlus className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Create a Custom Segment</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Target specific groups of customers based on their behavior, tags, or communication channel.
          </p>
        </div>
      </div>

      {/* Create / Edit Segment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  {editingId ? 'Edit Segment' : 'Create New Segment'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Segment Name</label>
                  <input required type="text" placeholder="e.g. High-Value WhatsApp Users"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea rows={2} placeholder="What is this segment for?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-600" /> Define Criteria
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Channel</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-sm"
                          value={formData.channel} onChange={e => setFormData({ ...formData, channel: e.target.value })}>
                          <option value="all">All Channels</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="tiktok">TikTok</option>
                          <option value="webchat">Web Chat</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Interaction</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-sm"
                          value={formData.lastInteraction} onChange={e => setFormData({ ...formData, lastInteraction: e.target.value })}>
                          <option value="any">Any Time</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                          <option value="90d">Last 90 Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Include Tags</label>
                      <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {(['AND', 'OR'] as const).map(logic => (
                          <button key={logic} type="button" onClick={() => setFormData({ ...formData, tagLogic: logic })}
                            className={cn('px-3 py-1 text-[10px] font-bold rounded-md transition-all',
                              formData.tagLogic === logic ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            )}>
                            {logic}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="e.g. vip, lead, interested"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exclude Tags</label>
                    <div className="relative">
                      <X className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <input type="text" placeholder="e.g. unsubscribed, blacklisted"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        value={formData.excludedTags} onChange={e => setFormData({ ...formData, excludedTags: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? 'Update Segment' : 'Save Segment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
