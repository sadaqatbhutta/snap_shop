export type LeadPriority = 'hot' | 'warm' | 'cold';

const URGENT_KEYWORDS = [
  'refund',
  'complaint',
  'lawyer',
  'cancel order',
  'scam',
  'fraud',
  'terrible',
  'worst',
  'angry',
  'dispute',
  'chargeback',
];

const BUY_KEYWORDS = ['buy', 'purchase', 'order now', 'how much', 'price', 'checkout', 'payment', 'want to order'];

const POSITIVE_KEYWORDS = ['thanks', 'thank you', 'great', 'awesome', 'perfect', 'love it', 'appreciate'];

export type ConversationSignals = {
  leadScore: number;
  leadPriority: LeadPriority;
  sentimentTags: string[];
  needsHumanReview: boolean;
};

export function deriveConversationSignals(
  customerMessage: string,
  conversationStatus: 'active' | 'human_escalated',
  aiConfidence?: number,
  shouldEscalate?: boolean,
  extras?: {
    leadScoreHint?: number;
    buySignal?: boolean;
    workflowTags?: string[];
    leadPriorityBoost?: 'hot' | 'urgent';
  }
): ConversationSignals {
  const lower = customerMessage.toLowerCase();
  const sentimentTags: string[] = [...(extras?.workflowTags || [])];

  if (URGENT_KEYWORDS.some(k => lower.includes(k))) sentimentTags.push('urgent');
  if (POSITIVE_KEYWORDS.some(k => lower.includes(k))) sentimentTags.push('positive');
  if (BUY_KEYWORDS.some(k => lower.includes(k)) || extras?.buySignal) sentimentTags.push('buy_intent');
  if (conversationStatus === 'human_escalated' || shouldEscalate) sentimentTags.push('escalated');

  let score = 45;
  if (sentimentTags.includes('urgent')) score += 35;
  if (sentimentTags.includes('escalated')) score += 25;
  if (sentimentTags.includes('buy_intent')) score += 22;
  if (aiConfidence !== undefined && aiConfidence < 0.55) score += 15;
  if (sentimentTags.includes('positive')) score -= 12;
  if (extras?.leadPriorityBoost === 'hot') score += 18;
  if (extras?.leadPriorityBoost === 'urgent') score += 28;

  if (typeof extras?.leadScoreHint === 'number') {
    score = Math.round(score * 0.45 + extras.leadScoreHint * 0.55);
  }

  score = Math.max(0, Math.min(100, score));

  let leadPriority: LeadPriority = 'warm';
  if (score >= 72 || extras?.leadPriorityBoost === 'hot') leadPriority = 'hot';
  else if (score < 38) leadPriority = 'cold';

  const needsHumanReview =
    Boolean(sentimentTags.includes('urgent')) ||
    (aiConfidence !== undefined && aiConfidence < 0.55 && !shouldEscalate);

  return {
    leadScore: score,
    leadPriority,
    sentimentTags: [...new Set(sentimentTags)],
    needsHumanReview,
  };
}
