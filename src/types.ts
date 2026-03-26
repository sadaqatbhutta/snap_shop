/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'webchat';

export interface Business {
  id: string;
  name: string;
  description: string;
  aiContext: string;
  faqs: string[];
  ownerEmail: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  channel: Channel;
  externalId: string; // Phone number or social ID
  name: string;
  tags: string[];
  createdAt: string;
  lastInteractionAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  status: 'active' | 'human_escalated' | 'closed';
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  businessId: string;
  senderId: string; // Customer externalId or Agent ID or 'ai'
  senderType: 'customer' | 'agent' | 'ai';
  content: string;
  type: 'text' | 'image' | 'voice';
  timestamp: string;
}

export interface Agent {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
}
