import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Lock, Globe, CreditCard, ChevronRight,
  Mail, AlertTriangle, PhoneCall, Clock, Save, Loader2, CheckCircle2,
  X, Copy, Check, Phone, MessageSquare, ExternalLink, Music2,
  Eye, EyeOff, KeyRound, Users, UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useBusiness } from '../context/BusinessContext';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '../lib/animations';
import { logout } from '../services/authService';
import type { AIMacro } from '../../../shared/types';

const WebchatWidget = lazy(() => import('../components/WebchatWidget'));

type Panel = null | 'integrations' | 'security' | 'billing' | 'team';
type RuntimePayload = {
  timestamp: string;
  uptime_s: number;
  environment: string;
  queueMode: 'redis' | 'in-memory';
  queueStrictMode: boolean;
  redisConnected: boolean;
  inlineWorkersEnabled: boolean;
  queueHealthy: boolean;
};

function getApiBaseUrl() {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3040';
  }
  return window.location.origin;
}

// ─── Integrations Panel ───────────────────────────────────────────────────────
function IntegrationsPanel({ businessId, business, onClose }: { businessId: string; business: any; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = getApiBaseUrl();

  const channels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: Phone,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      description: 'Connect your WhatsApp Business API',
      webhook: `${baseUrl}/api/webhook/whatsapp`,
      docs: 'https://developers.facebook.com/docs/whatsapp',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Globe,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      description: 'Connect Instagram Direct Messages',
      webhook: `${baseUrl}/api/webhook/instagram`,
      docs: 'https://developers.facebook.com/docs/instagram-api',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      description: 'Connect Facebook Messenger',
      webhook: `${baseUrl}/api/webhook/facebook`,
      docs: 'https://developers.facebook.com/docs/messenger-platform',
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: Music2,
      color: 'text-gray-900',
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      description: 'Connect TikTok messaging webhooks',
      webhook: `${baseUrl}/api/webhook/tiktok`,
      docs: 'https://developers.tiktok.com/',
    },
    {
      id: 'webchat',
      name: 'Web Chat',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      description: 'Embed a chat widget on your website',
      webhook: `${baseUrl}/api/webchat/message`,
      docs: `${baseUrl}/webchat-widget.js`,
    },
  ];

  const embedSnippet = `<script src="${baseUrl}/webchat-widget.js" data-business-id="${businessId}" data-api-base="${baseUrl}" data-title="Chat with us" data-position="right" defer></script>`;
  const integrationHealth = [
    { key: 'metaAccessToken', label: 'Meta Access Token', ok: Boolean(business?.metaAccessToken) },
    { key: 'whatsappPhoneNumberId', label: 'WhatsApp Number ID', ok: Boolean(business?.whatsappPhoneNumberId) },
    { key: 'tiktokAccessToken', label: 'TikTok Access Token', ok: Boolean(business?.tiktokAccessToken) },
    { key: 'webchat', label: 'Webchat Widget Script', ok: Boolean(baseUrl) },
  ];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel glow-border bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Channel Integrations</h2>
              <p className="text-indigo-200 text-sm">Connect your messaging channels via webhooks</p>
            </div>
          </div>
          <button aria-label="Close integrations panel" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Business ID */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Business ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-indigo-700 bg-white px-3 py-2 rounded-lg border border-gray-200 break-all">
                {businessId}
              </code>
              <button
                aria-label="Copy business ID"
                onClick={() => copy(businessId, 'bizid')}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
              >
                {copied === 'bizid' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">Send this as <code className="bg-gray-100 px-1 rounded">business_id</code> in every webhook payload.</p>
          </div>

          {/* Webhook Payload Example */}
          <div className="p-4 bg-gray-900 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Example Payload</p>
              <button
                aria-label="Copy webhook payload example"
                onClick={() => copy(`{\n  "business_id": "${businessId}",\n  "user_id": "+923001234567",\n  "message": "Hello, what is the price?",\n  "type": "text",\n  "name": "Customer Name"\n}`, 'payload')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied === 'payload' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'payload' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-green-400 leading-relaxed overflow-x-auto">{`{
  "business_id": "${businessId}",
  "user_id": "+923001234567",
  "message": "Hello, what is the price?",
  "type": "text",
  "name": "Customer Name"
}`}</pre>
          </div>

          {/* Channel Cards */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Webhook Endpoints</p>
            {channels.map(ch => (
              <div key={ch.id} className={cn('p-4 rounded-xl border', ch.border, ch.bg)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <ch.icon className={cn('w-5 h-5', ch.color)} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{ch.name}</p>
                      <p className="text-xs text-gray-500">{ch.description}</p>
                    </div>
                  </div>
                  <a
                    href={ch.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Docs <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 bg-white px-3 py-2 rounded-lg border border-white/80 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">POST</span>
                    <code className="text-xs text-gray-700 truncate">{ch.webhook}</code>
                  </div>
                  <button
                    aria-label={`Copy ${ch.name} webhook URL`}
                    onClick={() => copy(ch.webhook, ch.id)}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
                  >
                    {copied === ch.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-white">
            <p className="text-sm font-bold text-gray-700 mb-3">Integration Health</p>
            <div className="space-y-2">
              {integrationHealth.map(item => (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={cn('px-2 py-0.5 rounded-full font-bold', item.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                    {item.ok ? 'Configured' : 'Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-900 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Website Embed Snippet</p>
              <button
                aria-label="Copy webchat embed snippet"
                onClick={() => copy(embedSnippet, 'webchat-embed')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied === 'webchat-embed' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'webchat-embed' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-green-400 leading-relaxed overflow-x-auto">{embedSnippet}</pre>
          </div>

          <Suspense fallback={<p className="text-xs text-gray-500">Loading webchat preview...</p>}>
            <WebchatWidget businessId={businessId} apiBase={baseUrl} />
          </Suspense>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Security Panel ───────────────────────────────────────────────────────────
function SecurityPanel({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mapPasswordError = (err: any) => {
    const code = String(err?.code || '');
    const rawMessage = String(err?.message || '').toLowerCase();

    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || rawMessage.includes('invalid-credential')) {
      return 'Current password is incorrect.';
    }
    if (code === 'auth/weak-password') {
      return 'New password is too weak. Use at least 6 characters.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait and try again.';
    }
    if (code === 'auth/requires-recent-login') {
      return 'For security, please sign in again and then change your password.';
    }
    if (code === 'auth/network-request-failed' || rawMessage.includes('network')) {
      return 'Network error. Check your internet connection and try again.';
    }
    return 'Failed to update password.';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const user = auth.currentUser!;
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      const msg = mapPasswordError(err);
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        className="glass-panel glow-border bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold">Security</h2>
          </div>
          <button aria-label="Close security panel" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-5">
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <KeyRound className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">Change Password</p>
              <p className="text-xs text-indigo-600">Update your account password below.</p>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                className={cn('p-3 rounded-lg text-sm font-medium flex items-center gap-2',
                  message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                )}
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {[
            { id: 'current-password', label: 'Current Password', value: currentPassword, onChange: setCurrentPassword },
            { id: 'new-password', label: 'New Password', value: newPassword, onChange: setNewPassword },
            { id: 'confirm-password', label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword },
          ].map(field => (
            <div key={field.label} className="space-y-1">
              <label htmlFor={field.id} className="text-sm font-semibold text-gray-700">{field.label}</label>
              <div className="relative">
                <input
                  id={field.id}
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="button" aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <motion.button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Billing Panel ────────────────────────────────────────────────────────────
function BillingPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel glow-border bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6" />
            <h2 className="text-xl font-bold">Billing</h2>
          </div>
          <button aria-label="Close billing panel" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="p-5 bg-indigo-600 rounded-2xl text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">Current Plan</p>
            <p className="text-2xl font-bold">Free Plan</p>
            <p className="text-indigo-200 text-sm mt-1">Up to 500 messages/month</p>
          </div>
          <div className="space-y-3">
            {[
              { plan: 'Starter', price: '$29/mo', features: '5,000 messages, 3 channels' },
              { plan: 'Growth', price: '$79/mo', features: '25,000 messages, all channels' },
              { plan: 'Enterprise', price: 'Custom', features: 'Unlimited, dedicated support' },
            ].map(p => (
              <div key={p.plan} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{p.plan}</p>
                  <p className="text-xs text-gray-500">{p.features}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600 text-sm">{p.price}</p>
                  <button
                    onClick={() => window.open(`mailto:sales@snapshop.ai?subject=${encodeURIComponent(`Upgrade to ${p.plan} plan`)}`, '_blank')}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Panel ───────────────────────────────────────────────────────────────
function TeamPanel({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const unsubs = [
      onSnapshot(collection(db, `businesses/${businessId}/agents`), snap => 
        setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
      onSnapshot(query(collection(db, `businesses/${businessId}/invites`), orderBy('createdAt', 'desc')), snap => 
        setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [businessId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ businessId, email: inviteEmail, role }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      await updateDoc(doc(db, 'businesses', businessId), { 'onboarding.teamInvited': true });
      setInviteEmail('');
      if (data.emailSent === false) {
        alert(`Invite created, but email delivery is not configured.\nShare this link manually:\n${data.inviteUrl}`);
      } else {
        alert('Invitation sent!');
      }
    } catch {
      alert('Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel glow-border bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Users className="w-8 h-8" /></div>
            <div>
              <h2 className="text-2xl font-black">Team Management</h2>
              <p className="text-indigo-100 text-sm font-medium">Manage agents and administrators</p>
            </div>
          </div>
          <button aria-label="Close team panel" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all group"><X className="w-6 h-6 group-rotate-90 transition-transform" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <section className="space-y-6">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 px-1"><UserPlus className="w-5 h-5 text-indigo-600" /> Invite Teammate</h3>
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:shadow-md">
              <label htmlFor="invite-email" className="sr-only">Invite teammate email</label>
              <input id="invite-email" required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="flex-1 px-5 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-sm" />
              <label htmlFor="invite-role" className="sr-only">Invite teammate role</label>
              <select id="invite-role" value={role} onChange={e => setRole(e.target.value as any)} className="w-full md:w-32 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={loading} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invite'}</button>
            </form>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 px-1">Active Team ({agents.length})</h3>
            <div className="grid gap-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg">{agent.name?.[0] || 'A'}</div>
                    <div className="flex flex-col"><span className="font-bold text-gray-900">{agent.name}</span><span className="text-xs text-gray-400 font-medium">{agent.email}</span></div>
                  </div>
                  <span className={cn('px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest', agent.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700')}>{agent.role}</span>
                </div>
              ))}
            </div>
          </section>

          {invites.filter(i => !i.used).length > 0 && (
            <section className="space-y-4">
              <h3 className="text-lg font-black text-gray-400 italic px-1">Pending Invitations</h3>
              <div className="grid gap-3 opacity-60">
                {invites.filter(i => !i.used).map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border border-dashed border-gray-200 rounded-2xl">
                    <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-gray-400" /><div><p className="text-sm font-bold text-gray-600">{invite.email}</p><p className="text-[10px] text-gray-400">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p></div></div>
                    <button onClick={async () => {
                      if (!confirm('Revoke?')) return;
                      try {
                        const idToken = await auth.currentUser?.getIdToken();
                        const resp = await fetch(`/api/team/invite/${invite.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${idToken}` },
                        });
                        if (!resp.ok) throw new Error();
                      } catch {
                        alert('Failed to revoke invite');
                      }
                    }} className="text-[10px] font-black text-red-500 hover:text-red-600 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest">Revoke</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="p-8 border-t border-gray-100 bg-gray-50/50"><button onClick={onClose} className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-base hover:bg-gray-50 transition-all shadow-sm">Done</button></div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function Settings() {
  const { business, businessId, refreshBusiness } = useBusiness();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [notifications, setNotifications] = useState({
    inquiries: true, lowStock: false, missedCalls: true, frequency: 'instant',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [aiMacros, setAiMacros] = useState<AIMacro[]>([]);
  const [macroLabel, setMacroLabel] = useState('');
  const [macroContent, setMacroContent] = useState('');
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimePayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const healthBootstrappedRef = useRef(false);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setBusinessEmail(business.ownerEmail || '');
      if ((business as any).notifications) {
        setNotifications((business as any).notifications);
      }
      setAiMacros(business.aiMacros ?? []);
    }
  }, [business]);

  const readHealth = useCallback(async () => {
    const apiBase = getApiBaseUrl();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    try {
      setHealthLoading(true);
      const resp = await fetch(`${apiBase}/api/runtime`, { signal: controller.signal });
      if (!resp.ok) throw new Error(`Runtime endpoint failed (${resp.status})`);
      const data = (await resp.json()) as RuntimePayload;
      setRuntimeHealth(data);
      setHealthError(null);
      healthBootstrappedRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to read health status.';
      setHealthError(message);
      // Keep current UI responsive when runtime endpoint is slow/unavailable.
      if (!healthBootstrappedRef.current) {
        setRuntimeHealth(null);
      }
    } finally {
      window.clearTimeout(timeout);
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!alive) return;
      await readHealth();
    })();
    const interval = setInterval(() => {
      if (alive) {
        void readHealth();
      }
    }, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [readHealth]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    await updateDoc(doc(db, 'businesses', businessId), {
      name: businessName,
      ownerEmail: businessEmail,
      notifications,
      aiMacros,
    });
    await refreshBusiness();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: 'inquiries' | 'lowStock' | 'missedCalls') =>
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { icon: Lock, label: 'Security', description: 'Manage your password and account security.', panel: 'security' as const },
    { icon: Users, label: 'Team', description: 'Collaborate with agents and admins.', panel: 'team' as const },
    { icon: Globe, label: 'Integrations', description: 'Connect WhatsApp, Instagram, and more.', panel: 'integrations' as const },
    { icon: CreditCard, label: 'Billing', description: 'Manage your subscription and payments.', panel: 'billing' as const },
  ];

  const handleDeleteAccount = async () => {
    if (!businessId) return;
    setDeletingAccount(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resp = await fetch(`/api/business/${businessId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete account');
      }
      await logout();
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* General Settings */}
      <motion.div className="glass-panel glow-border bg-white/80 p-8 rounded-xl border border-gray-200/80 shadow-sm space-y-6" variants={staggerItem}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg"><SettingsIcon className="w-6 h-6 text-indigo-600" /></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
              <p className="text-sm text-gray-500">Manage your business profile and preferences.</p>
            </div>
          </div>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="business-name" className="text-sm font-medium text-gray-700">Business Name</label>
            <input id="business-name" type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label htmlFor="business-email" className="text-sm font-medium text-gray-700">Business Email</label>
            <input id="business-email" type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-2">Your Business ID</p>
          <code className="text-xs text-indigo-900 bg-white px-3 py-1.5 rounded border border-indigo-200 block break-all">
            {businessId || 'Loading...'}
          </code>
          <p className="text-xs text-indigo-700 mt-2">Use this as <code>business_id</code> in webhook payloads.</p>
        </div>
      </motion.div>

      {/* Runtime Health */}
      <motion.div className="glass-panel glow-border bg-white/80 p-6 rounded-xl border border-gray-200/80 shadow-sm space-y-4" variants={staggerItem}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Runtime Health</h3>
            <p className="text-sm text-gray-500">Queue mode and backend health visibility.</p>
          </div>
          <button
            type="button"
            onClick={() => void readHealth()}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {healthLoading && <p className="text-sm text-gray-500">Loading runtime health...</p>}
        {!healthLoading && healthError && (
          <p className="text-sm text-red-600">Health read failed: {healthError}</p>
        )}
        {!healthLoading && !healthError && runtimeHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Backend Status</p>
              <p className={cn('font-semibold', runtimeHealth.queueHealthy ? 'text-green-700' : 'text-amber-700')}>
                {runtimeHealth.queueHealthy ? 'ok' : 'degraded'}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Queue Mode</p>
              <p className="font-semibold text-gray-900">{runtimeHealth.queueMode}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Redis Connected</p>
              <p className="font-semibold text-gray-900">{runtimeHealth.redisConnected ? 'Yes' : 'No'}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Environment</p>
              <p className="font-semibold text-gray-900">{runtimeHealth.environment}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Queue Strict Mode</p>
              <p className="font-semibold text-gray-900">{runtimeHealth.queueStrictMode ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Inline Workers</p>
              <p className="font-semibold text-gray-900">{runtimeHealth.inlineWorkersEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick replies (macros / playbooks) */}
      <motion.div className="glass-panel glow-border bg-white/80 p-8 rounded-xl border border-gray-200/80 shadow-sm space-y-6" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg"><MessageSquare className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick replies</h3>
            <p className="text-sm text-gray-500">Saved snippets agents can insert in Conversations (playbook macros).</p>
          </div>
        </div>
        <div className="space-y-3">
          {aiMacros.map(m => (
            <div key={m.id} className="flex gap-2 items-start p-3 border border-gray-100 rounded-lg bg-gray-50/80">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{m.label}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{m.content}</p>
              </div>
              <button
                type="button"
                onClick={() => setAiMacros(prev => prev.filter(x => x.id !== m.id))}
                className="text-xs font-semibold text-red-600 hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <label htmlFor="macro-label" className="sr-only">Macro label</label>
            <input
              id="macro-label"
              type="text"
              placeholder="Label (e.g. Shipping policy)"
              value={macroLabel}
              onChange={e => setMacroLabel(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!macroLabel.trim() || !macroContent.trim()) return;
                setAiMacros(prev => [...prev, { id: crypto.randomUUID(), label: macroLabel.trim(), content: macroContent.trim() }]);
                setMacroLabel('');
                setMacroContent('');
              }}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800"
            >
              Add macro
            </button>
          </div>
          <label htmlFor="macro-content" className="sr-only">Macro content</label>
          <textarea
            id="macro-content"
            rows={3}
            placeholder="Message text to insert…"
            value={macroContent}
            onChange={e => setMacroContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>
      </motion.div>

      {/* Email Notifications */}
      <motion.div className="glass-panel glow-border bg-white/80 p-8 rounded-xl border border-gray-200/80 shadow-sm space-y-6" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Mail className="w-6 h-6 text-indigo-600" /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Configure your email alert preferences.</p>
          </div>
        </div>
        <div className="space-y-5">
          {[
            { key: 'inquiries' as const, icon: Mail, bg: 'bg-blue-50', color: 'text-blue-600', title: 'New Customer Inquiries', desc: 'Get notified when a customer starts a new chat.' },
            { key: 'lowStock' as const, icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600', title: 'Low Stock Warnings', desc: 'Receive alerts when product inventory is low.' },
            { key: 'missedCalls' as const, icon: PhoneCall, bg: 'bg-rose-50', color: 'text-rose-600', title: 'Missed Calls', desc: 'Get an email summary of any missed customer calls.' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-4">
                <div className={cn('p-2 rounded-lg', item.bg)}><item.icon className={cn('w-5 h-5', item.color)} /></div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <motion.button
                aria-label={`Toggle ${item.title}`}
                onClick={() => toggle(item.key)}
                className={cn('w-12 h-6 rounded-full transition-colors relative', notifications[item.key] ? 'bg-indigo-600' : 'bg-gray-200')}
                whileTap={{ scale: 0.95 }}
              >
                <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-all', notifications[item.key] ? 'left-7' : 'left-1')} />
              </motion.button>
            </div>
          ))}
          <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
            <div className="p-2 bg-gray-50 rounded-lg"><Clock className="w-5 h-5 text-gray-600" /></div>
            <div className="flex-1">
              <label htmlFor="delivery-frequency" className="text-sm font-semibold text-gray-900 block mb-1">Delivery Frequency</label>
              <select id="delivery-frequency" value={notifications.frequency} onChange={e => setNotifications(prev => ({ ...prev, frequency: e.target.value }))}
                className="w-full max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="instant">Instant (Real-time)</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Clickable Sections */}
      <motion.div className="space-y-4" variants={staggerItem}>
        {sections.map(section => (
          <button key={section.label} onClick={() => setActivePanel(section.panel)}
            className="hover-lift w-full glass-panel glow-border bg-white/80 p-6 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between hover:bg-gray-50 hover:border-indigo-200 transition-all group">
            <div className="flex items-center gap-4 text-left">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-50 transition-colors">
                <section.icon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{section.label}</h4>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </button>
        ))}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center justify-between"
        variants={staggerItem}
      >
        <div>
          <h4 className="font-semibold text-red-900">Danger Zone</h4>
          <p className="text-sm text-red-700">Permanently delete your business account and all associated data.</p>
        </div>
        <button onClick={() => setDeleteModalOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          Delete Account
        </button>
      </motion.div>

      {/* Panels */}
      <AnimatePresence>
        {activePanel === 'integrations' && businessId && (
          <IntegrationsPanel businessId={businessId} business={business as any} onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'security' && (
          <SecurityPanel onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'billing' && (
          <BillingPanel onClose={() => setActivePanel(null)} />
        )}
        {activePanel === 'team' && businessId && (
          <TeamPanel businessId={businessId} onClose={() => setActivePanel(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saved && (
          <motion.div
            className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Settings saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              className="glass-panel glow-border bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="p-6 border-b border-gray-100 bg-red-600 text-white">
                <h3 className="text-xl font-bold">Delete Business Account</h3>
                <p className="text-sm text-red-100 mt-1">This action is permanent and cannot be undone.</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-700">
                  Deleting your account will remove your business profile, conversations, broadcasts, customers, and team data.
                </p>
                <p className="text-xs text-gray-500">
                  Make sure you have exported anything important before continuing.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deletingAccount}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deletingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
