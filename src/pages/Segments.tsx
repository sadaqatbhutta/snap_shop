/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ChevronLeft,
  UserPlus,
  Tag,
  Hash,
  CheckCircle2,
  ChevronRight,
  X,
  Calendar,
  MessageCircle,
  AlertCircle,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const initialSegments = [
  { 
    id: '1', 
    name: 'All Customers', 
    description: 'Every customer in your database.', 
    criteria: 'All', 
    count: 1250,
    lastUpdated: '2026-03-20'
  },
  { 
    id: '2', 
    name: 'VIP Customers', 
    description: 'Customers with more than 5 purchases.', 
    criteria: 'Tags: (vip AND high-value)', 
    count: 450,
    lastUpdated: '2026-03-22'
  },
  { 
    id: '3', 
    name: 'Inactive Users', 
    description: 'Customers who haven\'t interacted in 30 days.', 
    criteria: 'Last Interaction > 30 days', 
    count: 800,
    lastUpdated: '2026-03-24'
  }
];

export default function Segments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [segments, setSegments] = useState(initialSegments);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channel: 'all',
    tags: '',
    tagLogic: 'AND',
    excludedTags: '',
    lastInteraction: 'any'
  });

  const handleCreateSegment = (e: React.FormEvent) => {
    e.preventDefault();
    
    let criteriaParts = [];
    if (formData.channel !== 'all') criteriaParts.push(`Channel: ${formData.channel}`);
    
    if (formData.tags) {
      const tagList = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagList.length > 1) {
        criteriaParts.push(`Tags: (${tagList.join(` ${formData.tagLogic} `)})`);
      } else {
        criteriaParts.push(`Tag: ${tagList[0]}`);
      }
    }

    if (formData.excludedTags) {
      const excludedList = formData.excludedTags.split(',').map(t => t.trim()).filter(t => t);
      criteriaParts.push(`Exclude: ${excludedList.join(', ')}`);
    }

    if (formData.lastInteraction !== 'any') {
      criteriaParts.push(`Last Interaction: ${formData.lastInteraction}`);
    }

    const newSegment = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      description: formData.description,
      criteria: criteriaParts.join(' | ') || 'All',
      count: Math.floor(Math.random() * 1000),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setSegments([newSegment, ...segments]);
    setIsModalOpen(false);
    setFormData({ 
      name: '', 
      description: '', 
      channel: 'all', 
      tags: '', 
      tagLogic: 'AND', 
      excludedTags: '', 
      lastInteraction: 'any' 
    });
  };

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/broadcasts" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Customer Segments</h1>
            <p className="text-gray-500">Group your customers for targeted broadcasts.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Segment
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search segments..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Segment List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criteria</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Customers</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {segments.map((segment) => (
              <tr key={segment.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-sm font-medium">{segment.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-500 line-clamp-1">{segment.description}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 max-w-xs overflow-hidden">
                    <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-xs font-medium text-gray-600 truncate">{segment.criteria}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-semibold">{segment.count.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {segment.lastUpdated}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Empty State / Add New */}
      <div 
        onClick={() => setIsModalOpen(true)}
        className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center gap-4 hover:bg-gray-100 hover:border-indigo-300 transition-all group cursor-pointer"
      >
        <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
          <UserPlus className="w-8 h-8 text-indigo-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Create a Custom Segment</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Target specific groups of customers based on their behavior, tags, or communication channel.
          </p>
        </div>
        <button className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Get Started
        </button>
      </div>

      {/* Create Segment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Create New Segment
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSegment} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Segment Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. High-Value WhatsApp Users"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea 
                      rows={2}
                      placeholder="What is this segment for?"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-600" />
                    Define Criteria
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Channel</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-sm"
                          value={formData.channel}
                          onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                        >
                          <option value="all">All Channels</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="webchat">Web Chat</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Interaction</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white text-sm"
                          value={formData.lastInteraction}
                          onChange={(e) => setFormData({ ...formData, lastInteraction: e.target.value })}
                        >
                          <option value="any">Any Time</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                          <option value="90d">Last 90 Days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Include Tags</label>
                      <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {['AND', 'OR'].map((logic) => (
                          <button
                            key={logic}
                            type="button"
                            onClick={() => setFormData({ ...formData, tagLogic: logic })}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                              formData.tagLogic === logic 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            {logic}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. vip, lead, interested"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                      {formData.tagLogic === 'AND' 
                        ? "Customers must have ALL of these tags." 
                        : "Customers must have AT LEAST ONE of these tags."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Exclude Tags</label>
                    <div className="relative">
                      <X className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. unsubscribed, blacklisted"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        value={formData.excludedTags}
                        onChange={(e) => setFormData({ ...formData, excludedTags: e.target.value })}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                      Customers with ANY of these tags will be removed from the segment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    Save Segment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
