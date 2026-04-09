/**
 * Frontend Gemini Service
 * 
 * SECURITY NOTE: This file should NOT contain the Gemini API key.
 * All AI processing happens on the backend for security.
 * 
 * This service is kept for potential future client-side AI features
 * that use a separate, restricted API key with proper CORS/domain restrictions.
 */

export interface AIResponse {
  intent: string;
  language: string;
  confidence: number;
  reply: string;
  shouldEscalate: boolean;
}

/**
 * Process message via backend API (secure)
 * 
 * This is the correct way to use AI - through the backend where the API key is secure.
 */
export async function processMessageViaBackend(
  message: string,
  conversationId: string,
  businessId: string
): Promise<AIResponse> {
  const response = await fetch('/api/ai/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId, businessId }),
  });

  if (!response.ok) {
    throw new Error('Failed to process message');
  }

  return response.json();
}

/**
 * DEPRECATED: Direct AI processing from frontend
 * 
 * This function is kept for reference but should NOT be used.
 * It would expose the API key in the frontend bundle.
 * 
 * Use processMessageViaBackend() instead.
 */
export function processMessage(): never {
  throw new Error(
    'Direct AI processing from frontend is disabled for security. ' +
    'Use processMessageViaBackend() or let the webhook handler process messages.'
  );
}
