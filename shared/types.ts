/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'webchat' | 'tiktok';

export interface OnboardingProgress {
  faqsAdded: boolean;
  aiContextFilled: boolean;
  teamInvited: boolean;
  channelReviewed: boolean;
  firstTestChat: boolean;
}

export interface AIMacro {
  id: string;
  label: string;
  content: string;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  aiContext: string;
  faqs: string[];
  ownerEmail: string;
  createdAt: string;
  confidenceThreshold: number;
  onboarding?: OnboardingProgress;
  aiMacros?: AIMacro[];
  /** Prompt A/B test variant for AI tone */
  aiPromptVariant?: 'A' | 'B';
  /** Non-secret AI integration endpoints (tokens stay in private credentials) */
  aiIntegrations?: {
    orderLookupUrl?: string;
    stockLookupUrl?: string;
    bookingUrl?: string;
    shopifyStoreDomain?: string;
    wooBaseUrl?: string;
  };
  /** Public routing ids only — access tokens live in private/credentials (Admin SDK). */
  whatsappPhoneNumberId?: string | null;
  facebookPageId?: string | null;
  instagramPageId?: string | null;
  metaPageId?: string | null;
  tiktokBusinessId?: string | null;
  integrationsConfigured?: {
    meta?: boolean;
    whatsapp?: boolean;
    facebook?: boolean;
    instagram?: boolean;
    tiktok?: boolean;
    shopify?: boolean;
    woo?: boolean;
  };
  notifications?: {
    inquiries?: boolean;
    escalations?: boolean;
    frequency?: 'instant' | 'daily' | 'weekly' | string;
  };
  /** Server-owned — readable for UI, not client-writable (Firestore rules). */
  billing?: {
    plan?: 'free' | 'growth' | 'scale' | 'enterprise';
    status?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: string | null;
  };
  usage?: {
    periodStart?: string;
    messages?: number;
    aiCalls?: number;
    broadcasts?: number;
  };
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

export type LeadPriority = 'hot' | 'warm' | 'cold';

export interface InternalNote {
  id: string;
  text: string;
  createdAt: string;
  authorUid?: string;
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
  leadPriority?: LeadPriority;
  leadScore?: number;
  sentimentTags?: string[];
  needsHumanReview?: boolean;
  assignedQueue?: 'sales' | 'support' | 'billing' | string;
  internalNotes?: InternalNote[];
  threadSummary?: string;
  threadSummaryNextAction?: string;
  lastCustomerMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'audio' 
  | 'video' 
  | 'document' 
  | 'sticker' 
  | 'location' 
  | 'contacts' 
  | 'interactive' 
  | 'voice';

export interface Message {
  id: string;
  conversationId: string;
  businessId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'ai';
  content: string;
  type: MessageType;
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
  /** internal = free-form content; whatsapp_meta = Meta-approved HSM for WA broadcasts */
  channelScope?: 'internal' | 'whatsapp_meta';
  metaTemplateName?: string;
  metaLanguageCode?: string;
  /** Optional body parameter placeholders for Meta template components */
  metaBodyParams?: string[];
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
    channel?: Channel;
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
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  reach: number;
  engagement?: number;
  createdAt: string;
}
