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
  shouldEscalate?: boolean
): ConversationSignals {
  const lower = customerMessage.toLowerCase();
  const sentimentTags: string[] = [];

  if (URGENT_KEYWORDS.some(k => lower.includes(k))) sentimentTags.push('urgent');
  if (POSITIVE_KEYWORDS.some(k => lower.includes(k))) sentimentTags.push('positive');
  if (conversationStatus === 'human_escalated' || shouldEscalate) sentimentTags.push('escalated');

  let score = 45;
  if (sentimentTags.includes('urgent')) score += 35;
  if (sentimentTags.includes('escalated')) score += 25;
  if (aiConfidence !== undefined && aiConfidence < 0.55) score += 15;
  if (sentimentTags.includes('positive')) score -= 12;

  score = Math.max(0, Math.min(100, score));

  let leadPriority: LeadPriority = 'warm';
  if (score >= 72) leadPriority = 'hot';
  else if (score < 38) leadPriority = 'cold';

  const needsHumanReview =
    Boolean(sentimentTags.includes('urgent')) ||
    (aiConfidence !== undefined && aiConfidence < 0.55 && !shouldEscalate);

  return { leadScore: score, leadPriority, sentimentTags, needsHumanReview };
}
