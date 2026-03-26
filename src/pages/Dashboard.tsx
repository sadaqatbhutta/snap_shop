/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone
} from 'lucide-react';

const stats = [
  { label: 'Total Conversations', value: '1,234', change: '+12%', trend: 'up', icon: MessageSquare },
  { label: 'Active Customers', value: '856', change: '+5%', trend: 'up', icon: Users },
  { label: 'Avg. Response Time', value: '1.2m', change: '-15%', trend: 'down', icon: Clock },
  { label: 'Sales Generated', value: '$12,450', change: '+20%', trend: 'up', icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                stat.trend === 'up' ? "text-green-600" : "text-red-600"
              )}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Conversations</h3>
              <Link to="/conversations" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                      C{i}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Customer {i}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">Latest message from the customer...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">2m ago</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Recent Broadcasts</h3>
              <Link to="/broadcasts" className="text-sm text-indigo-600 font-medium hover:underline">View all</Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Megaphone className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Eid Special Offer</p>
                    <p className="text-xs text-gray-500">Sent to 1,250 customers</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Sent</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">New Collection Launch</p>
                    <p className="text-xs text-gray-500">Scheduled for March 28</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                to="/broadcasts"
                className="block w-full py-2 px-4 bg-indigo-600 text-white text-center rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Broadcast Message
              </Link>
              <Link 
                to="/ai-settings"
                className="block w-full py-2 px-4 border border-indigo-600 text-indigo-600 text-center rounded-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                Add New FAQ
              </Link>
              <button className="w-full py-2 px-4 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Export CRM Data
              </button>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-xl shadow-lg text-white">
            <h3 className="font-semibold mb-2">AI Status: Online</h3>
            <p className="text-sm text-indigo-100 mb-4">
              SnapShop AI is currently handling 8 active conversations.
            </p>
            <div className="w-full bg-indigo-500 rounded-full h-2">
              <div className="bg-white h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-indigo-100 mt-2">75% capacity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from '@/src/lib/utils';
