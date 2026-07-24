import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { apiFetch } from '../lib/api';
import { staggerContainer, staggerItem } from '../lib/animations';

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  source?: string;
  chunkCount: number;
  updatedAt: string;
};

export default function KnowledgeBase() {
  const { businessId } = useBusiness();
  const [items, setItems] = useState<KnowledgeDoc[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/ai/knowledge?businessId=${encodeURIComponent(businessId)}`);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/ai/knowledge', {
        method: 'POST',
        body: JSON.stringify({ businessId, title: title.trim(), content: content.trim(), source: 'manual' }),
      });
      setTitle('');
      setContent('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!businessId) return;
    await apiFetch('/api/ai/knowledge/delete', {
      method: 'POST',
      body: JSON.stringify({ businessId, docId }),
    });
    await load();
  };

  return (
    <motion.div className="max-w-4xl mx-auto space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="surface-card p-6 space-y-4" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg"><BookOpen className="w-5 h-5 text-teal-700" /></div>
          <div>
            <h3 className="text-lg font-semibold">Knowledge Base (RAG)</h3>
            <p className="text-sm text-slate-500">Products, policies, and price lists the AI retrieves before answering.</p>
          </div>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Document title (e.g. Shipping Policy)"
          className="input-modern w-full"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          placeholder="Paste catalog entries, FAQs, return policy, pricing…"
          className="input-modern w-full"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Index document
        </button>
      </motion.div>

      <motion.div className="surface-card p-6 space-y-3" variants={staggerItem}>
        <h4 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Indexed documents</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">No documents yet. Add your first knowledge doc above.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[var(--line)] bg-white/70">
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.content}</p>
                <p className="text-[11px] text-slate-400 mt-1">{item.chunkCount} chunks · updated {new Date(item.updatedAt).toLocaleString()}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
