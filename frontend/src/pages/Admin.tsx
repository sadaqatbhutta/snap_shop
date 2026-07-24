import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { getApiUrl } from '../lib/apiBase';
import { fadeUp } from '../lib/animations';
import { PLAN_DEFINITIONS, PlanId } from '../../../shared/plans';

interface AdminBusiness {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: string | null;
  plan: string;
  billingStatus: string;
  usage: { messages: number; aiCalls: number; broadcasts: number };
}

export default function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const me = await fetch(getApiUrl('/api/admin/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await me.json();
      if (!meData.isPlatformAdmin) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      const resp = await fetch(getApiUrl('/api/admin/businesses'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Failed to load businesses');
      const data = await resp.json();
      setBusinesses(data.businesses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setPlan = async (businessId: string, plan: PlanId) => {
    setSavingId(businessId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch(getApiUrl(`/api/admin/businesses/${businessId}/plan`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update plan');
      }
      setBusinesses(prev => prev.map(b => (b.id === businessId ? { ...b, plan } : b)));
    } catch (err: any) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading admin…
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-3">
        <Shield className="w-10 h-10 text-gray-400 mx-auto" />
        <h1 className="text-xl font-bold text-gray-900">Platform admin only</h1>
        <p className="text-sm text-gray-500">
          Create a document at <code className="bg-gray-100 px-1 rounded">admins/{'{yourUid}'}</code> in Firestore to unlock this console.
        </p>
      </div>
    );
  }

  return (
    <motion.div className="max-w-5xl mx-auto space-y-6" variants={fadeUp} initial="initial" animate="animate">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-50 rounded-lg">
          <Shield className="w-6 h-6 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-sm text-gray-500">Overview of tenant businesses and manual plan overrides.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Plan</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map(b => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{b.id.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{b.ownerEmail || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  msg {b.usage.messages} · ai {b.usage.aiCalls} · bc {b.usage.broadcasts}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={b.plan}
                    disabled={savingId === b.id}
                    onChange={e => void setPlan(b.id, e.target.value as PlanId)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    {Object.values(PLAN_DEFINITIONS).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {businesses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No businesses found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
