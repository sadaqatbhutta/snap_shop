/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Globe, 
  CreditCard,
  ChevronRight,
  Mail,
  AlertTriangle,
  PhoneCall,
  Clock
} from 'lucide-react';

const sections = [
  { icon: Bell, label: 'Notifications', description: 'Configure how you receive alerts and updates.' },
  { icon: Lock, label: 'Security', description: 'Manage your password and account security.' },
  { icon: Globe, label: 'Integrations', description: 'Connect WhatsApp, Instagram, and other channels.' },
  { icon: CreditCard, label: 'Billing', description: 'Manage your subscription and payment methods.' },
];

export default function Settings() {
  const [notifications, setNotifications] = useState({
    inquiries: true,
    lowStock: false,
    missedCalls: true,
    frequency: 'instant'
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    if (key === 'frequency') return;
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* General Settings */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
            <p className="text-sm text-gray-500">Manage your business profile and preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Business Name</label>
            <input type="text" defaultValue="SnapShop" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Business Email</label>
            <input type="email" defaultValue="contact@snapshop.com" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Mail className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Configure your email alert preferences and frequency.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">New Customer Inquiries</h4>
                <p className="text-xs text-gray-500">Get notified when a customer starts a new chat.</p>
              </div>
            </div>
            <button 
              onClick={() => toggleNotification('inquiries')}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications.inquiries ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.inquiries ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Low Stock Warnings</h4>
                <p className="text-xs text-gray-500">Receive alerts when product inventory is low.</p>
              </div>
            </div>
            <button 
              onClick={() => toggleNotification('lowStock')}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications.lowStock ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.lowStock ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-rose-50 rounded-lg">
                <PhoneCall className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Missed Calls</h4>
                <p className="text-xs text-gray-500">Get an email summary of any missed customer calls.</p>
              </div>
            </div>
            <button 
              onClick={() => toggleNotification('missedCalls')}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications.missedCalls ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.missedCalls ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900 block mb-1">Delivery Frequency</label>
                <select 
                  value={notifications.frequency}
                  onChange={(e) => setNotifications(prev => ({ ...prev, frequency: e.target.value }))}
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
        {sections.map((section) => (
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
