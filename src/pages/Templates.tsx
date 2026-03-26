/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Copy,
  ChevronLeft,
  Layout,
  Type,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

const templates = [
  { 
    id: '1', 
    name: 'Eid Mubarak Discount', 
    content: 'Eid Mubarak! Get 20% off on all items using code EID20. Shop now: [Link]', 
    type: 'text', 
    usageCount: 12,
    lastUsed: '2026-03-20'
  },
  { 
    id: '2', 
    name: 'Spring 2026 Launch', 
    content: 'Our new Spring collection is here! Check out the latest trends and styles. [Link]', 
    type: 'image', 
    usageCount: 5,
    lastUsed: '2026-03-22'
  },
  { 
    id: '3', 
    name: 'Sale Ending Soon', 
    content: 'Hurry! Our flash sale ends in 2 hours. Grab your favorites before they are gone! [Link]', 
    type: 'text', 
    usageCount: 8,
    lastUsed: '2026-03-24'
  }
];

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/broadcasts" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-500">Manage pre-defined messages for your broadcasts.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search templates..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full"
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

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-300 transition-all">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    template.type === 'text' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  )}>
                    {template.type === 'text' ? <Type className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                  {template.content}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Used {template.usageCount} times
                </div>
                <div>Last used: {template.lastUsed}</div>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Copy className="w-3 h-3" />
                Duplicate
              </button>
              <button className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <Layout className="w-3 h-3" />
                Preview
              </button>
            </div>
          </div>
        ))}
        
        {/* Add New Card */}
        <button className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 flex flex-col items-center justify-center gap-3 hover:bg-gray-100 hover:border-indigo-300 transition-all group">
          <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Add New Template</p>
            <p className="text-xs text-gray-500">Create a reusable message</p>
          </div>
        </button>
      </div>
    </div>
  );
}
