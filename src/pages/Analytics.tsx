/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  Calendar,
  ChevronDown
} from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            Last 30 Days
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-800">Conversation Volume</h4>
            <BarChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end gap-2">
            {[40, 65, 45, 90, 55, 70, 85, 50, 60, 75, 80, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-100 rounded-t hover:bg-indigo-600 transition-colors group relative">
                <div style={{ height: `${h}%` }} className="w-full bg-indigo-500 rounded-t"></div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
            <span>Nov</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-800">Sales Conversion Rate</h4>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 relative">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <path 
                d="M0,150 Q50,130 100,140 T200,80 T300,110 T400,40" 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="3" 
                strokeLinecap="round"
              />
              <path 
                d="M0,150 Q50,130 100,140 T200,80 T300,110 T400,40 V200 H0 Z" 
                fill="url(#gradient)" 
                opacity="0.1"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-6">Channel Distribution</h4>
          <div className="flex items-center justify-center h-48 relative">
            <div className="w-32 h-32 rounded-full border-[12px] border-indigo-500 border-r-indigo-200 border-b-indigo-300 border-l-indigo-400 rotate-45"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">85%</span>
              <span className="text-[10px] text-gray-400 uppercase">WhatsApp</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-gray-600">WhatsApp</span>
              </div>
              <span className="font-semibold text-gray-900">85%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                <span className="text-gray-600">Instagram</span>
              </div>
              <span className="font-semibold text-gray-900">10%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
                <span className="text-gray-600">Others</span>
              </div>
              <span className="font-semibold text-gray-900">5%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-6">Intent Analysis</h4>
          <div className="space-y-6">
            {[
              { label: 'Product Inquiry', value: 65, color: 'bg-indigo-500' },
              { label: 'Order Request', value: 45, color: 'bg-green-500' },
              { label: 'Complaints', value: 15, color: 'bg-red-500' },
              { label: 'Greetings', value: 85, color: 'bg-yellow-500' },
            ].map((intent) => (
              <div key={intent.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{intent.label}</span>
                  <span className="font-bold text-gray-900">{intent.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", intent.color)} style={{ width: `${intent.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from '@/src/lib/utils';
