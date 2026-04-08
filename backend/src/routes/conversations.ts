import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/firebase.js';
import { sendMessage } from '../services/channelSender.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { buildError } from '../utils/errors.js';

export const conversationsRouter = Router();

const SendMessageSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  businessId: z.string().min(1, 'businessId is required'),
  content: z.string().min(1, 'content is required'),
  senderId: z.string().min(1, 'senderId is required'), // Agent UID from Firebase Auth
});

/**
 * POST /api/conversations/send
 *
 * Send an agent message to a customer via their channel (WhatsApp/Instagram/Facebook).
 * This is called from the frontend when an agent types a reply in the dashboard.
 *
 * Body:
 * {
 *   "conversationId": "conv-uuid",
 *   "businessId": "biz-uuid",
 *   "content": "Hello, how can I help?",
 *   "senderId": "agent-firebase-uid"
 * }
 */
conversationsRouter.post('/send', async (req, res, next) => {
  try {
    const { conversationId, businessId, content, senderId } = SendMessageSchema.parse(req.body);

    // ─── Fetch Conversation ───────────────────────────────────────────────
    const convRef = db.doc(`businesses/${businessId}/conversations/${conversationId}`);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      throw buildError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    }

    const conversation = convSnap.data() as any;

    if (conversation.status === 'closed') {
      throw buildError('CONVERSATION_CLOSED', 'Cannot send message to closed conversation', 400);
    }

    const { customerId, channel } = conversation;

    // ─── Fetch Customer ───────────────────────────────────────────────────
    const customerSnap = await db.doc(`businesses/${businessId}/customers/${customerId}`).get();
    if (!customerSnap.exists) {
      throw buildError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    }

    const customer = customerSnap.data() as any;
    const recipientId = customer.externalId;

    // ─── Store Agent Message in Firestore ────────────────────────────────
    const now = new Date().toISOString();
    const messageId = uuidv4();
    const messagesRef = db.collection(`businesses/${businessId}/conversations/${conversationId}/messages`);

    await messagesRef.doc(messageId).set({
      id: messageId,
      conversationId,
      businessId,
      senderId,
      senderType: 'agent',
      content,
      type: 'text',
      timestamp: now,
    });

    // ─── Update Conversation ──────────────────────────────────────────────
    await convRef.update({
      lastMessage: content,
      updatedAt: now,
    });

    // ─── Send Message to Customer via Channel ─────────────────────────────
    await sendMessage(channel, recipientId, content, businessId);

    logger.info({
      conversationId,
      businessId,
      channel,
      recipientId,
      senderId,
    }, 'Agent message sent to customer');

    res.json({
      status: 'sent',
      messageId,
      conversationId,
      timestamp: now,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/conversations/:conversationId/messages
 *
 * Fetch all messages for a conversation (optional, for API clients).
 */
conversationsRouter.get('/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { businessId } = req.query;

    if (!businessId || typeof businessId !== 'string') {
      throw buildError('MISSING_BUSINESS_ID', 'businessId query parameter is required', 400);
    }

    const messagesSnap = await db
      .collection(`businesses/${businessId}/conversations/${conversationId}/messages`)
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ conversationId, messages });
  } catch (err) {
    next(err);
  }
});
