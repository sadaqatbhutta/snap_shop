/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal,
  Mail,
  Phone,
  Tag,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Edit2,
  Check,
  X,
  MessageSquare,
  Package,
  History,
  FileText,
  ExternalLink,
  User,
  Calendar,
  Clock as ClockIcon
} from 'lucide-react';

const initialCustomersData = [
  { 
    id: '1', 
    name: 'Sadaqat Bhutta', 
    email: 'sadaqat@example.com', 
    phone: '+92 300 1234567', 
    channel: 'WhatsApp', 
    tags: ['Hot Lead', 'Repeat Buyer'], 
    lastSeen: '2m ago', 
    lastSeenValue: 2,
    history: [
      { date: '2026-03-25 14:30', type: 'Message', content: 'Inquired about product availability' },
      { date: '2026-03-24 10:15', type: 'Call', content: 'Follow-up on previous order' },
      { date: '2026-03-20 16:45', type: 'Order', content: 'Purchased Premium Subscription' },
    ],
    orders: [
      { id: 'ORD-9921', date: '2026-03-20', status: 'Delivered', total: '$149.00' },
      { id: 'ORD-8812', date: '2026-02-15', status: 'Delivered', total: '$89.00' },
    ],
    notes: 'Prefers WhatsApp for communication. Interested in upcoming summer collection.'
  },
  { 
    id: '2', 
    name: 'Ali Khan', 
    email: 'ali@example.com', 
    phone: '+92 301 7654321', 
    channel: 'Instagram', 
    tags: ['Inquiry'], 
    lastSeen: '15m ago', 
    lastSeenValue: 15,
    history: [
      { date: '2026-03-26 09:00', type: 'Message', content: 'Asked for pricing details' },
    ],
    orders: [],
    notes: 'New lead from Instagram ad campaign.'
  },
  { 
    id: '3', 
    name: 'Zainab Ahmed', 
    email: 'zainab@example.com', 
    phone: '+92 302 1122334', 
    channel: 'Facebook', 
    tags: ['Closed'], 
    lastSeen: '1h ago', 
    lastSeenValue: 60,
    history: [
      { date: '2026-03-25 11:20', type: 'Message', content: 'Confirmed receipt of order' },
    ],
    orders: [
      { id: 'ORD-7734', date: '2026-03-22', status: 'Delivered', total: '$55.00' },
    ],
    notes: 'Regular customer. Always provides positive feedback.'
  },
  { 
    id: '4', 
    name: 'Omar Farooq', 
    email: 'omar@example.com', 
    phone: '+92 303 5566778', 
    channel: 'Web Chat', 
    tags: ['New'], 
    lastSeen: '3h ago', 
    lastSeenValue: 180,
    history: [
      { date: '2026-03-26 08:15', type: 'Message', content: 'Started a new session' },
    ],
    orders: [],
    notes: 'Browsing for electronics. No purchase yet.'
  },
];

type Customer = typeof initialCustomersData[0];

type SortConfig = {
  key: keyof Customer | null;
  direction: 'asc' | 'desc';
};

export default function CRM() {
  const [customers, setCustomers] = useState(initialCustomersData);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSort = (key: keyof Customer) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...customers];
    
    if (searchQuery) {
      sortableItems = sortableItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery)
      );
    }

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [sortConfig, searchQuery, customers]);

  const startEditingTags = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setEditingTagsId(customer.id);
    setTagInput(customer.tags.join(', '));
  };

  const saveTags = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    if ('stopPropagation' in e) e.stopPropagation();
    const newTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '');
    
    setCustomers(prev => prev.map(c => 
      c.id === id ? { ...c, tags: newTags } : c
    ));
    setEditingTagsId(null);
  };

  const SortIcon = ({ column }: { column: keyof Customer }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-1 text-indigo-600" /> : 
      <ChevronDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th 
                className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Customer
                  <SortIcon column="name" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center">
                  Contact
                  <SortIcon column="email" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('channel')}
              >
                <div className="flex items-center">
                  Channel
                  <SortIcon column="channel" />
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('lastSeenValue')}
              >
                <div className="flex items-center">
                  Last Interaction
                  <SortIcon column="lastSeenValue" />
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedCustomers.map((customer) => (
              <tr 
                key={customer.id} 
                className="hover:bg-gray-50 transition-colors group cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {customer.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {customer.channel}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-[200px]">
                  {editingTagsId === customer.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveTags(e, customer.id)}
                        className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="Tag1, Tag2..."
                      />
                      <button onClick={(e) => saveTags(e, customer.id)} className="text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTagsId(null); }} className="text-red-600 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 items-center">
                      {customer.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-medium border border-indigo-100">
                          {tag}
                        </span>
                      ))}
                      <button 
                        onClick={(e) => startEditingTags(e, customer)}
                        className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit Tags"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {customer.lastSeen}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {selectedCustomer.email}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedCustomer.phone}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details & Notes */}
              <div className="lg:col-span-2 space-y-8">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                    <MessageSquare className="w-4 h-4" />
                    Initiate Conversation
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all active:scale-95">
                    <Edit2 className="w-4 h-4" />
                    Edit Details
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all active:scale-95">
                    <Tag className="w-4 h-4" />
                    Add Tags
                  </button>
                </div>

                {/* Contact History */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <History className="w-5 h-5 text-indigo-600" />
                    <h3>Contact History</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedCustomer.history.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                          {item.type === 'Message' ? <MessageSquare className="w-5 h-5 text-blue-500" /> : 
                           item.type === 'Call' ? <Phone className="w-5 h-5 text-green-500" /> : 
                           <Package className="w-5 h-5 text-amber-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-900">{item.type}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" /> {item.date}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{item.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Past Orders */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <h3>Past Orders</h3>
                  </div>
                  {selectedCustomer.orders.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-bold text-gray-600">Order ID</th>
                            <th className="px-4 py-3 font-bold text-gray-600">Date</th>
                            <th className="px-4 py-3 font-bold text-gray-600">Status</th>
                            <th className="px-4 py-3 font-bold text-gray-600 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedCustomer.orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-indigo-600">{order.id}</td>
                              <td className="px-4 py-3 text-gray-500">{order.date}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{order.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No orders found for this customer.</p>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Metadata & Notes */}
              <div className="space-y-8">
                {/* Customer Info Card */}
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Customer Info</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-indigo-600 font-medium">Channel</span>
                      <span className="font-bold text-indigo-900">{selectedCustomer.channel}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-indigo-600 font-medium">Last Seen</span>
                      <span className="font-bold text-indigo-900">{selectedCustomer.lastSeen}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCustomer.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3>Internal Notes</h3>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900 leading-relaxed italic">
                    "{selectedCustomer.notes}"
                  </div>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add new note
                  </button>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
