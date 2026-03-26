/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Users,
  FileText,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Link } from 'react-router-dom';

const broadcasts = [
  { 
    id: '1', 
    name: 'Eid Special Offer', 
    template: 'Eid Mubarak Discount', 
    segment: 'All Customers', 
    status: 'sent', 
    sentAt: '2026-03-20 10:00 AM',
    reach: 1250,
    engagement: '15%'
  },
  { 
    id: '2', 
    name: 'New Collection Launch', 
    template: 'Spring 2026 Launch', 
    segment: 'VIP Customers', 
    status: 'scheduled', 
    scheduledAt: '2026-03-28 09:00 AM',
    reach: 450,
    engagement: '-'
  },
  { 
    id: '3', 
    name: 'Flash Sale Reminder', 
    template: 'Sale Ending Soon', 
    segment: 'Inactive Users', 
    status: 'draft', 
    createdAt: '2026-03-24 02:30 PM',
    reach: 800,
    engagement: '-'
  }
];

export default function Broadcasts() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-500">Send bulk messages to your customer segments.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/segments"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Segments
          </Link>
          <Link 
            to="/templates"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Templates
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Broadcast
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Megaphone className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Broadcasts</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Messages Sent</p>
              <p className="text-2xl font-bold text-gray-900">12,450</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Engagement</p>
              <p className="text-2xl font-bold text-gray-900">18.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search broadcasts..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-300">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['all', 'sent', 'scheduled', 'draft'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                  activeTab === tab 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Broadcast List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Broadcast Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template & Segment</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule/Sent At</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reach</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Engagement</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {broadcasts.map((broadcast) => (
              <tr key={broadcast.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{broadcast.name}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" />
                      {broadcast.template}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      {broadcast.segment}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                    broadcast.status === 'sent' ? "bg-green-100 text-green-700" :
                    broadcast.status === 'scheduled' ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {broadcast.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                    {broadcast.status === 'scheduled' && <Clock className="w-3 h-3" />}
                    {broadcast.status === 'draft' && <AlertCircle className="w-3 h-3" />}
                    {broadcast.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {broadcast.sentAt || broadcast.scheduledAt || broadcast.createdAt}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {broadcast.reach.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {broadcast.engagement}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
