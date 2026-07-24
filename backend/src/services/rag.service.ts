import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebase.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
/** Current Gemini API embedding model (text-embedding-004 is not available on v1beta). */
const EMBED_MODELS = ['gemini-embedding-001', 'text-embedding-004'] as const;
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  source?: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

type KnowledgeChunk = {
  id: string;
  docId: string;
  title: string;
  text: string;
  embedding: number[];
};

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end >= cleaned.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function embedText(text: string): Promise<number[]> {
  let lastError: unknown;
  for (const model of EMBED_MODELS) {
    try {
      const response = await ai.models.embedContent({
        model,
        contents: text,
      });
      const values = response.embeddings?.[0]?.values;
      if (values?.length) return values;
      lastError = new Error(`Empty embedding from ${model}`);
    } catch (err) {
      lastError = err;
      logger.warn({ err, model }, 'Embedding model failed; trying next');
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to generate embedding: ${detail}`);
}

export async function upsertKnowledgeDocument(
  businessId: string,
  input: { title: string; content: string; source?: string; docId?: string }
): Promise<KnowledgeDoc> {
  const now = new Date().toISOString();
  const docId = input.docId || uuidv4();
  const chunks = chunkText(input.content);
  if (!chunks.length) {
    throw new Error('Knowledge content is empty');
  }

  const chunkDocs: KnowledgeChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    chunkDocs.push({
      id: `${docId}_${i}`,
      docId,
      title: input.title,
      text: chunks[i],
      embedding,
    });
  }

  const batch = db.batch();
  const knowledgeRef = db.doc(`businesses/${businessId}/knowledge/${docId}`);
  batch.set(knowledgeRef, {
    id: docId,
    title: input.title.trim(),
    content: input.content.trim(),
    source: input.source || 'manual',
    chunkCount: chunkDocs.length,
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  const existingChunks = await db.collection(`businesses/${businessId}/knowledge_chunks`)
    .where('docId', '==', docId)
    .get();
  existingChunks.docs.forEach(d => batch.delete(d.ref));

  for (const chunk of chunkDocs) {
    batch.set(db.doc(`businesses/${businessId}/knowledge_chunks/${chunk.id}`), chunk);
  }

  await batch.commit();

  logger.info({ businessId, docId, chunks: chunkDocs.length }, 'Knowledge document indexed');

  return {
    id: docId,
    title: input.title.trim(),
    content: input.content.trim(),
    source: input.source || 'manual',
    chunkCount: chunkDocs.length,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listKnowledgeDocuments(businessId: string): Promise<KnowledgeDoc[]> {
  const snap = await db.collection(`businesses/${businessId}/knowledge`).orderBy('updatedAt', 'desc').limit(100).get();
  return snap.docs.map(d => d.data() as KnowledgeDoc);
}

export async function deleteKnowledgeDocument(businessId: string, docId: string): Promise<void> {
  const batch = db.batch();
  batch.delete(db.doc(`businesses/${businessId}/knowledge/${docId}`));
  const chunks = await db.collection(`businesses/${businessId}/knowledge_chunks`).where('docId', '==', docId).get();
  chunks.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function retrieveRelevantKnowledge(
  businessId: string,
  query: string,
  topK = 4
): Promise<{ title: string; text: string; score: number }[]> {
  const snap = await db.collection(`businesses/${businessId}/knowledge_chunks`).limit(200).get();
  if (snap.empty) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch (err) {
    logger.warn({ err, businessId }, 'Embedding failed; falling back to keyword RAG');
    const lower = query.toLowerCase();
    return snap.docs
      .map(d => {
        const data = d.data() as KnowledgeChunk;
        const score = lower.split(/\s+/).filter(Boolean).some(w => data.text.toLowerCase().includes(w)) ? 0.5 : 0;
        return { title: data.title, text: data.text, score };
      })
      .filter(x => x.score > 0)
      .slice(0, topK);
  }

  return snap.docs
    .map(d => {
      const data = d.data() as KnowledgeChunk;
      return {
        title: data.title,
        text: data.text,
        score: cosineSimilarity(queryEmbedding, data.embedding || []),
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 0.35)
    .slice(0, topK);
}

export function formatKnowledgeForPrompt(chunks: { title: string; text: string; score: number }[]): string {
  if (!chunks.length) return 'No retrieved knowledge documents.';
  return chunks
    .map((c, i) => `[${i + 1}] (${c.title}, relevance=${c.score.toFixed(2)})\n${c.text}`)
    .join('\n\n');
}
