import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GitBranch, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { apiFetch } from '../lib/api';
import { staggerContainer, staggerItem } from '../lib/animations';

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
    <motion.div className="max-w-4xl mx-auto space-y-6" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div className="surface-card p-6 space-y-4" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-lg"><GitBranch className="w-5 h-5 text-teal-700" /></div>
          <div>
            <h3 className="text-lg font-semibold">AI Workflows</h3>
            <p className="text-sm text-slate-500">Route by intent — escalate, tag hot leads, or send to sales/support/billing.</p>
          </div>
        </div>

        <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name" className="input-modern w-full" />
        <input
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="Match keywords (comma-separated), e.g. refund, complaint"
          className="input-modern w-full"
        />
        <div className="flex flex-wrap gap-2">
          {ACTION_OPTIONS.map(action => (
            <button
              key={action}
              type="button"
              onClick={() => toggleAction(action)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                actions.includes(action)
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-[var(--line)]'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Add rule
        </button>
      </motion.div>

      <motion.div className="surface-card p-6 space-y-3" variants={staggerItem}>
        <h4 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Active rules</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">No rules yet.</p>
        ) : (
          items.map(rule => (
            <div key={rule.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[var(--line)] bg-white/70">
              <div>
                <p className="font-medium text-sm">{rule.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Priority {rule.priority} · {(rule.match.messageContains || rule.match.intentContains || []).join(', ') || 'confidence/channel match'}
                </p>
                <p className="text-[11px] text-teal-800 mt-1">{rule.actions.join(' · ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEnabled(rule)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${rule.enabled ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-500'}`}
                >
                  {rule.enabled ? 'On' : 'Off'}
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-rose-600">
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
