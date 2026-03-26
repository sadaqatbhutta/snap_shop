/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bot, 
  Save, 
  Plus, 
  X, 
  Info,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function AISettings() {
  const [businessContext, setBusinessContext] = useState(
    "SnapShop is a clothing brand specializing in modern ethnic wear. We offer high-quality fabrics and unique designs for men and women. Our main store is located in Lahore, Pakistan."
  );
  const [faqs, setFaqs] = useState([
    "What are your delivery charges? - Delivery is free on orders above $50. Otherwise, it's $5.",
    "Do you offer international shipping? - Yes, we ship worldwide via DHL.",
    "What is your return policy? - You can return any item within 14 days of purchase."
  ]);
  const [newFaq, setNewFaq] = useState('');

  const addFaq = () => {
    if (newFaq.trim()) {
      setFaqs([...faqs, newFaq]);
      setNewFaq('');
    }
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
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
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Business Context</label>
          <textarea 
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            placeholder="Describe your business, products, and services..."
          />
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p>The AI uses this context to answer customer questions. Be as detailed as possible about your offerings, location, and brand voice.</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6">
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
              onChange={(e) => setNewFaq(e.target.value)}
              placeholder="e.g., What are your store timings? - We are open from 10 AM to 10 PM."
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <button 
              onClick={addFaq}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Add FAQ
            </button>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                <p className="text-sm text-gray-700">{faq}</p>
                <button 
                  onClick={() => removeFaq(index)}
                  className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">AI Guardrails</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confidence Threshold</span>
              <span className="text-sm font-bold text-indigo-600">70%</span>
            </div>
            <input type="range" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <p className="text-xs text-gray-400">AI will escalate to a human if its confidence falls below this level.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900">Auto-Responses</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Handle Greetings</span>
              <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Handle Out-of-Scope</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
