/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Send, 
  User, 
  Bot, 
  MoreVertical,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const conversations = [
  { id: '1', name: 'Sadaqat Bhutta', lastMessage: 'Price kya hai?', time: '2m ago', unread: 2, status: 'active', channel: 'whatsapp' },
  { id: '2', name: 'Ali Khan', lastMessage: 'Order status?', time: '15m ago', unread: 0, status: 'human_escalated', channel: 'instagram' },
  { id: '3', name: 'Zainab Ahmed', lastMessage: 'Thanks!', time: '1h ago', unread: 0, status: 'closed', channel: 'facebook' },
];

const messages = [
  { id: '1', sender: 'customer', content: 'Price kya hai?', time: '10:00 AM' },
  { id: '2', sender: 'ai', content: 'Assalam-o-Alaikum! Hamare products ki prices $10 se start hoti hain. Aapko kis product ki price chahiye?', time: '10:01 AM' },
  { id: '3', sender: 'customer', content: 'Is red dress ki price?', time: '10:02 AM' },
];

export default function Conversations() {
  const [selectedId, setSelectedId] = useState('1');
  const [input, setInput] = useState('');

  const selectedConversation = conversations.find(c => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-160px)] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Conversation List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-indigo-600">
              <Filter className="w-3 h-3" />
              Filter
            </button>
            <span className="text-xs text-gray-400">3 active</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {conversations.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => setSelectedId(chat.id)}
              className={cn(
                "p-4 cursor-pointer transition-colors hover:bg-gray-50",
                selectedId === chat.id && "bg-indigo-50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-gray-900">{chat.name}</h4>
                <span className="text-xs text-gray-400">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate max-w-[180px]">{chat.lastMessage}</p>
                {chat.unread > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {selectedConversation?.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{selectedConversation?.name}</h4>
              <p className="text-xs text-green-500 font-medium">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-indigo-600"><Phone className="w-5 h-5" /></button>
            <button className="hover:text-indigo-600"><Video className="w-5 h-5" /></button>
            <button className="hover:text-indigo-600"><Info className="w-5 h-5" /></button>
            <button className="hover:text-indigo-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex items-end gap-3",
                msg.sender === 'customer' ? "flex-row" : "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white",
                msg.sender === 'customer' ? "bg-gray-400" : "bg-indigo-600"
              )}>
                {msg.sender === 'customer' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "max-w-[70%] p-3 rounded-2xl text-sm shadow-sm",
                msg.sender === 'customer' 
                  ? "bg-white text-gray-800 rounded-bl-none" 
                  : "bg-indigo-600 text-white rounded-br-none"
              )}>
                <p>{msg.content}</p>
                <p className={cn(
                  "text-[10px] mt-1",
                  msg.sender === 'customer' ? "text-gray-400" : "text-indigo-200"
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setInput('');
            }}
            className="flex items-center gap-3"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..." 
              className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              type="submit"
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Customer Info Sidebar */}
      <div className="w-72 border-l border-gray-200 bg-white p-6 space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Customer Info</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Channel</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                WhatsApp
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Phone</p>
              <p className="text-sm font-medium text-gray-900">+92 300 1234567</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Tags</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Hot Lead</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Repeat Buyer</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">AI Guardrails</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">AI Handling</span>
              <div className="w-8 h-4 bg-indigo-600 rounded-full relative">
                <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Confidence</span>
              <span className="text-xs font-bold text-green-600">92%</span>
            </div>
            <button className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
              Escalate to Human
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
