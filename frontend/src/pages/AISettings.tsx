/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Save, Plus, X, Info, ShieldCheck, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '../lib/animations';

export default function AISettings() {
  const { business, businessId, refreshBusiness } = useBusiness();
  const [businessContext, setBusinessContext] = useState('');
  const [faqs, setFaqs] = useState<string[]>([]);
  const [newFaq, setNewFaq] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessContext(business.aiContext || '');
      setFaqs(business.faqs || []);
      setThreshold(Math.round((business.confidenceThreshold ?? 0.7) * 100));
    }
  }, [business]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    await updateDoc(doc(db, 'businesses', businessId), {
      aiContext: businessContext,
      faqs,
      confidenceThreshold: threshold / 100,
    });
    await refreshBusiness();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addFaq = () => {
    if (newFaq.trim()) {
      setFaqs([...faqs, newFaq.trim()]);
      setNewFaq('');
    }
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div className="glass-panel glow-border p-8 rounded-xl border border-gray-200/80 shadow-sm space-y-6" variants={staggerItem}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Bot className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Personality & Context</h3>
              <p className="text-sm text-gray-500">Define how your AI assistant behaves and what it knows.</p>
            </div>
          </div>
          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="hover-lift flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </motion.button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Business Context</label>
          <textarea
            value={businessContext}
            onChange={e => setBusinessContext(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
            placeholder="Describe your business, products, and services..."
          />
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p>The AI uses this context to answer customer questions. Be as detailed as possible about your offerings, location, and brand voice.</p>
          </div>
        </div>
      </motion.div>

      <motion.div className="glass-panel glow-border p-8 rounded-xl border border-gray-200/80 shadow-sm space-y-6" variants={staggerItem}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Plus className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions (FAQs)</h3>
            <p className="text-sm text-gray-500">Add specific Q&A pairs to help the AI handle common inquiries.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFaq}
              onChange={e => setNewFaq(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFaq()}
              placeholder="e.g., What are your store timings? - We are open from 10 AM to 10 PM."
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
            />
            <button onClick={addFaq} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Add FAQ
            </button>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                <p className="text-sm text-gray-700">{faq}</p>
                <button
                  onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                  className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {faqs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No FAQs yet. Add some above.</p>}
          </div>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={staggerItem}>
        <div className="glass-panel glow-border p-6 rounded-xl border border-gray-200/80 shadow-sm hover-lift">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">AI Guardrails</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confidence Threshold</span>
              <span className="text-sm font-bold text-indigo-600">{threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-xs text-gray-400">AI will escalate to a human if its confidence falls below this level.</p>
          </div>
        </div>

        <div className="glass-panel glow-border p-6 rounded-xl border border-gray-200/80 shadow-sm hover-lift">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900">Webhook Endpoint</h4>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Send messages to these endpoints to trigger AI processing:</p>
            {['whatsapp', 'instagram', 'facebook', 'webchat'].map(ch => (
              <div key={ch} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600 capitalize">{ch}</span>
                <code className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  POST /api/webhook/{ch}
                </code>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

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
    </motion.div>
  );
}
