import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Filter, Download, Plus, MoreHorizontal, Mail, Phone, Tag,
  ChevronUp, ChevronDown, ArrowUpDown, Edit2, Check, X, MessageSquare,
  FileText, User, Loader2, Trash2, ChevronDown as ChevronDownIcon, StickyNote
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Customer } from '../../../shared/types';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '../lib/animations';
import { TableSkeleton } from '../components/Skeleton';

type SortKey = keyof Customer | null;
type FilterChannel = 'all' | 'whatsapp' | 'instagram' | 'facebook' | 'webchat';

export default function CRM() {
  const { businessId } = useBusiness();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<FilterChannel>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(db, `businesses/${businessId}/customers`), orderBy('lastInteractionAt', 'desc'));
    return onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setLoading(false);
    });
  }, [businessId]);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => { setMenuOpenId(null); setShowFilterMenu(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSort = (key: keyof Customer) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const sorted = useMemo(() => {
    let items = [...customers];
    if (filterChannel !== 'all') items = items.filter(c => c.channel === filterChannel);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.externalId.includes(q)
      );
    }
    if (sortConfig.key) {
      items.sort((a, b) => {
        const av = a[sortConfig.key!] ?? '';
        const bv = b[sortConfig.key!] ?? '';
        return av < bv ? (sortConfig.direction === 'asc' ? -1 : 1) : av > bv ? (sortConfig.direction === 'asc' ? 1 : -1) : 0;
      });
    }
    return items;
  }, [customers, sortConfig, searchQuery, filterChannel]);

  const saveTags = async (id: string) => {
    if (!businessId) return;
    const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    await updateDoc(doc(db, `businesses/${businessId}/customers`, id), { tags: newTags });
    setEditingTagsId(null);
    if (selectedCustomer?.id === id) setSelectedCustomer(prev => prev ? { ...prev, tags: newTags } : null);
  };

  const saveNotes = async () => {
    if (!businessId || !selectedCustomer) return;
    await updateDoc(doc(db, `businesses/${businessId}/customers`, selectedCustomer.id), { notes: notesInput });
    setSelectedCustomer(prev => prev ? { ...prev, notes: notesInput } : null);
    setEditingNotes(false);
  };

  const deleteCustomer = async (id: string) => {
    if (!businessId || !confirm('Delete this customer and all their data?')) return;
    await deleteDoc(doc(db, `businesses/${businessId}/customers`, id));
    setMenuOpenId(null);
    if (selectedCustomer?.id === id) setSelectedCustomer(null);
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Channel', 'Tags', 'Last Interaction'],
      ...sorted.map(c => [c.name, c.email || '', c.phone || c.externalId, c.channel, c.tags.join('; '), c.lastInteractionAt ? new Date(c.lastInteractionAt).toLocaleDateString() : ''])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ column }: { column: keyof Customer }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> : <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search customers..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          {/* Filter dropdown */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={cn('flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
                filterChannel !== 'all' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <Filter className="w-4 h-4" />
              {filterChannel === 'all' ? 'Filter' : filterChannel}
              <ChevronDownIcon className="w-3 h-3" />
            </button>
            {showFilterMenu && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-44 overflow-hidden">
                {(['all', 'whatsapp', 'instagram', 'facebook', 'webchat'] as FilterChannel[]).map(ch => (
                  <button key={ch} onClick={() => { setFilterChannel(ch); setShowFilterMenu(false); }}
                    className={cn('w-full text-left px-4 py-2.5 text-sm capitalize hover:bg-gray-50 transition-colors',
                      filterChannel === ch ? 'text-indigo-600 font-semibold bg-indigo-50' : 'text-gray-700'
                    )}>
                    {ch === 'all' ? 'All Channels' : ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </motion.div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No customers yet. They'll appear here when they message you.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Customer <SortIcon column="name" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('channel')}>
                  <div className="flex items-center">Channel <SortIcon column="channel" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lastInteractionAt')}>
                  <div className="flex items-center">Last Interaction <SortIcon column="lastInteractionAt" /></div>
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-gray-100"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {sorted.map(customer => (
                <motion.tr
                  key={customer.id}
                  className="hover:bg-gray-50 transition-colors group cursor-pointer"
                  onClick={() => { setSelectedCustomer(customer); setNotesInput(customer.notes || ''); setEditingNotes(false); }}
                  variants={staggerItem}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}
                  whileTap={{ scale: 0.995 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {customer.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {customer.email && (
                        <a href={`mailto:${customer.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs text-indigo-600 hover:underline">
                          <Mail className="w-3 h-3" /> {customer.email}
                        </a>
                      )}
                      <a href={`tel:${customer.phone || customer.externalId}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs text-indigo-600 hover:underline">
                        <Phone className="w-3 h-3" /> {customer.phone || customer.externalId}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {customer.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    {editingTagsId === customer.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input autoFocus type="text" value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveTags(customer.id)}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                          placeholder="Tag1, Tag2..." />
                        <button onClick={() => saveTags(customer.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={e => { e.stopPropagation(); setEditingTagsId(null); }} className="text-red-600 hover:text-red-700"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 items-center">
                        {customer.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium border border-indigo-100">{tag}</span>
                        ))}
                        <button onClick={e => { e.stopPropagation(); setEditingTagsId(customer.id); setTagInput(customer.tags.join(', ')); }}
                          className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {customer.lastInteractionAt ? new Date(customer.lastInteractionAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="relative">
                      <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === customer.id ? null : customer.id); }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {menuOpenId === customer.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-44 overflow-hidden">
                          <button onClick={() => { navigate('/conversations'); setMenuOpenId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" /> View Conversations
                          </button>
                          <button onClick={() => { setSelectedCustomer(customer); setNotesInput(customer.notes || ''); setEditingNotes(true); setMenuOpenId(null); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-amber-500" /> Edit Notes
                          </button>
                          <button onClick={() => deleteCustomer(customer.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Delete Customer
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        )}
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}>
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    {selectedCustomer.email && (
                      <a href={`mailto:${selectedCustomer.email}`} className="flex items-center gap-1 text-indigo-600 hover:underline">
                        <Mail className="w-3 h-3" /> {selectedCustomer.email}
                      </a>
                    )}
                    <a href={`tel:${selectedCustomer.phone || selectedCustomer.externalId}`} className="flex items-center gap-1 text-indigo-600 hover:underline">
                      <Phone className="w-3 h-3" /> {selectedCustomer.phone || selectedCustomer.externalId}
                    </a>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate('/conversations')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all">
                    <MessageSquare className="w-4 h-4" /> View Conversations
                  </button>
                  <button onClick={() => { setEditingTagsId(selectedCustomer.id); setTagInput(selectedCustomer.tags.join(', ')); setSelectedCustomer(null); }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50">
                    <Tag className="w-4 h-4" /> Edit Tags
                  </button>
                </div>

                {/* Notes */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <h3>Internal Notes</h3>
                    </div>
                    {!editingNotes && (
                      <button onClick={() => setEditingNotes(true)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea rows={4} value={notesInput} onChange={e => setNotesInput(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Add internal notes about this customer..." />
                      <div className="flex gap-2">
                        <button onClick={saveNotes} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Save Notes</button>
                        <button onClick={() => setEditingNotes(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn('p-4 rounded-xl text-sm leading-relaxed', selectedCustomer.notes ? 'bg-amber-50 border border-amber-100 text-amber-900 italic' : 'bg-gray-50 border border-dashed border-gray-200 text-gray-400')}>
                      {selectedCustomer.notes ? `"${selectedCustomer.notes}"` : 'No notes yet. Click Edit to add one.'}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 space-y-3">
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Customer Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-indigo-600 font-medium">Channel</span>
                      <span className="font-bold text-indigo-900 capitalize">{selectedCustomer.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-600 font-medium">Since</span>
                      <span className="font-bold text-indigo-900">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCustomer.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-200">{tag}</span>
                        ))}
                        {selectedCustomer.tags.length === 0 && <span className="text-xs text-gray-400">No tags</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-between bg-gray-50/50">
              <button onClick={() => deleteCustomer(selectedCustomer.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Customer
              </button>
              <button onClick={() => setSelectedCustomer(null)} className="px-6 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}
