import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GitBranch, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { apiFetch } from '../lib/api';
import { staggerContainer, staggerItem } from '../lib/animations';
import { cn } from '../lib/utils';

type WorkflowRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: {
    intentContains?: string[];
    messageContains?: string[];
    channel?: string[];
    confidenceBelow?: number;
  };
  actions: string[];
};

const ACTION_OPTIONS = [
  'escalate',
  'tag_hot',
  'tag_urgent',
  'assign_sales',
  'assign_support',
  'assign_billing',
  'skip_ai',
];

export default function Workflows() {
  const { businessId } = useBusiness();
  const [items, setItems] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [actions, setActions] = useState<string[]>(['escalate']);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/ai/workflows?businessId=${encodeURIComponent(businessId)}`);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const toggleAction = (action: string) => {
    setActions(prev => (prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]));
  };

  const handleSave = async () => {
    if (!businessId || !name.trim() || !actions.length) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/ai/workflows', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          enabled: true,
          priority: 50,
          match: {
            messageContains: keywords.split(',').map(s => s.trim()).filter(Boolean),
          },
          actions,
        }),
      });
      setName('');
      setKeywords('');
      setActions(['escalate']);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!businessId) return;
    await apiFetch('/api/ai/workflows/delete', {
      method: 'POST',
      body: JSON.stringify({ businessId, ruleId }),
    });
    await load();
  };

  const toggleEnabled = async (rule: WorkflowRule) => {
    if (!businessId) return;
    await apiFetch('/api/ai/workflows', {
      method: 'POST',
      body: JSON.stringify({
        businessId,
        id: rule.id,
        name: rule.name,
        enabled: !rule.enabled,
        priority: rule.priority,
        match: rule.match,
        actions: rule.actions,
      }),
    });
    await load();
  };

  return (
    <motion.div className="max-w-3xl mx-auto space-y-8" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={staggerItem}>
        <p className="page-eyebrow">Intelligence</p>
        <h1 className="section-title text-3xl md:text-4xl mt-1">AI Workflows</h1>
        <p className="mt-2 text-[var(--ink-soft)] text-sm max-w-xl leading-relaxed">
          Route by intent — escalate, tag hot leads, or send to sales, support, or billing.
        </p>
      </motion.div>

      <motion.div className="surface-card p-6 md:p-7 space-y-4" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-deep)]">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--ink)]">New rule</h3>
            <p className="text-xs text-[var(--ink-soft)]">Keyword match → actions</p>
          </div>
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name" className="input-modern" />
        <input
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Match keywords (comma-separated), e.g. refund, complaint"
          className="input-modern"
        />
        <div className="flex flex-wrap gap-2">
          {ACTION_OPTIONS.map(action => (
            <button
              key={action}
              type="button"
              onClick={() => toggleAction(action)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-[0.65rem] border',
                actions.includes(action)
                  ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                  : 'bg-white text-[var(--ink-soft)] border-[var(--line-strong)] hover:border-[var(--ink)]/30'
              )}
            >
              {action}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-[var(--danger)] font-medium">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Add rule
        </button>
      </motion.div>

      <motion.div className="space-y-3" variants={staggerItem}>
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--accent-deep)]" />
          <h4 className="font-bold text-[var(--ink)]">Active rules</h4>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)] py-8 text-center border border-dashed border-[var(--line-strong)] rounded-[1rem]">
            No rules yet.
          </p>
        ) : (
          items.map(rule => (
            <div key={rule.id} className="flex items-start justify-between gap-3 p-4 rounded-[1rem] border border-[var(--line)] bg-white/80">
              <div>
                <p className="font-bold text-sm text-[var(--ink)]">{rule.name}</p>
                <p className="text-xs text-[var(--ink-soft)] mt-1">
                  Priority {rule.priority} · {(rule.match.messageContains || rule.match.intentContains || []).join(', ') || 'confidence/channel match'}
                </p>
                <p className="text-[11px] text-[var(--accent-deep)] mt-1.5 font-semibold">{rule.actions.join(' · ')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleEnabled(rule)}
                  className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-[0.55rem]',
                    rule.enabled ? 'bg-[var(--accent-soft)] text-[var(--accent-deep)]' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {rule.enabled ? 'On' : 'Off'}
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-[var(--danger)] rounded-lg hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
