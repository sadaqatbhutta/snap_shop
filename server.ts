/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer as createViteServer } from "vite";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Firebase Admin init (uses Application Default Credentials or service account)
if (!getApps().length) {
  initializeApp();
}
const adminDb = getFirestore();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// In-memory deduplication cache (message_id → timestamp)
const processedIds = new Map<string, number>();
const DEDUP_TTL_MS = 60_000;

function isDuplicate(id: string): boolean {
  const now = Date.now();
  // Cleanup old entries
  for (const [k, v] of processedIds) {
    if (now - v > DEDUP_TTL_MS) processedIds.delete(k);
  }
  if (processedIds.has(id)) return true;
  processedIds.set(id, now);
  return false;
}

async function processMessageWithAI(
  message: string,
  businessId: string,
  conversationHistory: { role: "user" | "model"; content: string }[]
) {
  // Load business context from Firestore
  const bizDoc = await adminDb.doc(`businesses/${businessId}`).get();
  const biz = bizDoc.data();
  if (!biz) return null;

  const systemInstruction = `You are a business assistant for ${biz.name}.
RULES:
- Only answer from the provided context and FAQs.
- Be concise and professional.
- Reply in the user's language (Urdu, English, Arabic, or Roman Urdu).
- If you don't know the answer, or if the user asks for a human agent, set shouldEscalate to true.
- Do not hallucinate or make up information.
- Confidence should be between 0 and 1.

CONTEXT:
${biz.aiContext || ""}

FAQs:
${(biz.faqs || []).join("\n")}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      ...conversationHistory.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          language: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          reply: { type: Type.STRING },
          shouldEscalate: { type: Type.BOOLEAN },
        },
        required: ["intent", "language", "confidence", "reply", "shouldEscalate"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  const threshold = biz.confidenceThreshold ?? 0.7;
  return {
    intent: result.intent || "unknown",
    language: result.language || "unknown",
    confidence: result.confidence ?? 0,
    reply: result.reply || "Let me connect you with a human agent.",
    shouldEscalate: result.shouldEscalate || (result.confidence ?? 0) < threshold,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // ─── Webhook Entry Gateway ───────────────────────────────────────────────────
  app.post("/api/webhook/:channel", async (req, res) => {
    const { channel } = req.params;
    const body = req.body;

    const msgId = body.message_id || body.id || uuidv4();

    // Step 1: Deduplication
    if (isDuplicate(msgId)) {
      return res.json({ status: "duplicate", id: msgId });
    }

    const businessId = body.business_id || "default";
    const userId = body.user_id || body.from || "unknown";
    const content = body.message || body.text || "";
    const now = new Date().toISOString();

    // Step 2: Find or create customer
    const customersRef = adminDb.collection(`businesses/${businessId}/customers`);
    const custSnap = await customersRef
      .where("externalId", "==", userId)
      .where("channel", "==", channel)
      .limit(1)
      .get();

    let customerId: string;
    if (custSnap.empty) {
      customerId = uuidv4();
      await customersRef.doc(customerId).set({
        id: customerId,
        businessId,
        channel,
        externalId: userId,
        name: body.name || userId,
        tags: [],
        createdAt: now,
        lastInteractionAt: now,
      });
    } else {
      customerId = custSnap.docs[0].id;
      await custSnap.docs[0].ref.update({ lastInteractionAt: now });
    }

    // Step 3: Find or create conversation
    const convsRef = adminDb.collection(`businesses/${businessId}/conversations`);
    const convSnap = await convsRef
      .where("customerId", "==", customerId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    let conversationId: string;
    let isEscalated = false;
    if (convSnap.empty) {
      conversationId = uuidv4();
      await convsRef.doc(conversationId).set({
        id: conversationId,
        businessId,
        customerId,
        customerName: body.name || userId,
        channel,
        lastMessage: content,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      conversationId = convSnap.docs[0].id;
      isEscalated = convSnap.docs[0].data().status === "human_escalated";
      await convSnap.docs[0].ref.update({ lastMessage: content, updatedAt: now });
    }

    // Step 4: Store customer message
    const messagesRef = adminDb.collection(
      `businesses/${businessId}/conversations/${conversationId}/messages`
    );
    const customerMsgId = uuidv4();
    await messagesRef.doc(customerMsgId).set({
      id: customerMsgId,
      conversationId,
      businessId,
      senderId: userId,
      senderType: "customer",
      content,
      type: body.type || "text",
      timestamp: now,
    });

    // Step 5: Load conversation history (last 10 messages)
    const historySnap = await messagesRef.orderBy("timestamp", "desc").limit(10).get();
    const history = historySnap.docs
      .reverse()
      .filter((d) => d.id !== customerMsgId)
      .map((d) => ({
        role: (d.data().senderType === "customer" ? "user" : "model") as "user" | "model",
        content: d.data().content,
      }));

    // Step 6: AI Decision Engine (skip if human escalated)
    let aiReply = "Let me connect you with a human agent.";
    let aiIntent = "unknown";
    let aiConfidence = 0;

    if (!isEscalated) {
      try {
        const aiResult = await processMessageWithAI(content, businessId, history);
        if (aiResult) {
          aiReply = aiResult.reply;
          aiIntent = aiResult.intent;
          aiConfidence = aiResult.confidence;

          if (aiResult.shouldEscalate) {
            await convsRef.doc(conversationId).update({ status: "human_escalated" });
          }

          // Store AI response message
          const aiMsgId = uuidv4();
          await messagesRef.doc(aiMsgId).set({
            id: aiMsgId,
            conversationId,
            businessId,
            senderId: "ai",
            senderType: "ai",
            content: aiReply,
            type: "text",
            intent: aiIntent,
            timestamp: new Date().toISOString(),
          });

          // Update conversation with AI confidence
          await convsRef.doc(conversationId).update({ aiConfidence, updatedAt: new Date().toISOString() });
        }
      } catch (err) {
        console.error("AI processing error:", err);
      }
    }

    console.log(`[${channel}] ${userId}: "${content}" → AI: "${aiReply}" (${aiConfidence})`);

    res.json({
      status: "processed",
      id: msgId,
      conversationId,
      reply: aiReply,
      intent: aiIntent,
      confidence: aiConfidence,
    });
  });

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── Vite Dev / Static Prod ───────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnapShop server running on http://localhost:${PORT}`);
  });
}

startServer();
