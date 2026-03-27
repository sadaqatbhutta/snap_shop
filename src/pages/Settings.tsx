/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Bell, Lock, Globe, CreditCard,
  ChevronRight, Mail, AlertTriangle, PhoneCall, Clock, Save, Loader2, CheckCircle2
} from 'lucide-react';
import { useBusiness } from '@/src/context/BusinessContext';
import { db } from '@/src/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const sections = [
  { icon: Lock, label: 'Security', description: 'Manage your password and account security.' },
  { icon: Globe, label: 'Integrations', description: 'Connect WhatsApp, Instagram, and other channels.' },
  { icon: CreditCard, label: 'Billing', description: 'Manage your subscription and payment methods.' },
];

export default function Settings() {
  const { business, businessId, refreshBusiness } = useBusiness();
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [notifications, setNotifications] = useState({
    inquiries: true, lowStock: false, missedCalls: true, frequency: 'instant',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setBusinessEmail(business.ownerEmail || '');
    }
  }, [business]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    await updateDoc(doc(db, 'businesses', businessId), {
      name: businessName,
    });
    await refreshBusiness();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: 'inquiries' | 'lowStock' | 'missedCalls') => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* General Settings */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
              <p className="text-sm text-gray-500">Manage your business profile and preferences.</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Business Email</label>
            <input
              type="email"
              value={businessEmail}
              disabled
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Webhook Info */}
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-2">Your Business ID (for webhook integration)</p>
          <code className="text-xs text-indigo-900 bg-white px-3 py-1.5 rounded border border-indigo-200 block break-all">
            {businessId || 'Loading...'}
          </code>
          <p className="text-xs text-indigo-500 mt-2">Include this as <code>business_id</code> in your webhook payloads.</p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Mail className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Configure your email alert preferences and frequency.</p>
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
                <div className={`p-2 ${item.bg} rounded-lg`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`w-12 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications[item.key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900 block mb-1">Delivery Frequency</label>
                <select
                  value={notifications.frequency}
                  onChange={e => setNotifications(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="instant">Instant (Real-time)</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map(section => (
          <button
            key={section.label}
            className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors group"
          >
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
      </div>

      <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-red-900">Danger Zone</h4>
          <p className="text-sm text-red-700">Permanently delete your business account and all associated data.</p>
        </div>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
