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
    <motion.div className="max-w-3xl mx-auto space-y-8" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={staggerItem}>
        <p className="page-eyebrow">Intelligence</p>
        <h1 className="section-title text-3xl md:text-4xl mt-1">Knowledge Base</h1>
        <p className="mt-2 text-[var(--ink-soft)] text-sm max-w-xl leading-relaxed">
          Products, policies, and price lists the AI retrieves before every reply.
        </p>
      </motion.div>

      <motion.div className="surface-card p-6 md:p-7 space-y-4" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-deep)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--ink)]">Index a document</h3>
            <p className="text-xs text-[var(--ink-soft)]">Chunked + embedded for retrieval</p>
          </div>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Document title (e.g. Shipping Policy)"
          className="input-modern"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          placeholder="Paste catalog entries, FAQs, return policy, pricing…"
          className="input-modern resize-y min-h-[160px]"
        />
        {error && <p className="text-sm text-[var(--danger)] font-medium">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Index document
        </button>
      </motion.div>

      <motion.div className="space-y-3" variants={staggerItem}>
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent-deep)]" />
          <h4 className="font-bold text-[var(--ink)]">Indexed documents</h4>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)] py-8 text-center border border-dashed border-[var(--line-strong)] rounded-[1rem] bg-white/40">
            No documents yet. Add your first knowledge doc above.
          </p>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-3 p-4 rounded-[1rem] border border-[var(--line)] bg-white/80 hover:border-[var(--accent)]/30 transition-colors">
              <div className="min-w-0">
                <p className="font-bold text-sm text-[var(--ink)]">{item.title}</p>
                <p className="text-xs text-[var(--ink-soft)] mt-1.5 line-clamp-2 leading-relaxed">{item.content}</p>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  {item.chunkCount} chunks · {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-[var(--danger)] rounded-lg hover:bg-rose-50" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
