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
  confidenceThreshold: number;
}

export interface Customer {
  id: string;
  businessId: string;
  channel: Channel;
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  lastInteractionAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  channel: Channel;
  status: 'active' | 'human_escalated' | 'closed';
  assignedAgentId?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  businessId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'ai';
  content: string;
  type: 'text' | 'image' | 'voice';
  intent?: string;
  timestamp: string;
}

export interface Agent {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
}

export interface Template {
  id: string;
  businessId: string;
  name: string;
  content: string;
  type: 'text' | 'image';
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  businessId: string;
  name: string;
  description: string;
  criteria: {
    channel?: string;
    tags?: string[];
    tagLogic?: 'AND' | 'OR';
    excludedTags?: string[];
    lastInteraction?: string;
  };
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface Broadcast {
  id: string;
  businessId: string;
  name: string;
  templateId: string;
  templateName: string;
  segmentId: string;
  segmentName: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  reach: number;
  engagement?: number;
  createdAt: string;
}
