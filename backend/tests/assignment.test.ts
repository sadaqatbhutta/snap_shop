import { describe, expect, it, vi, beforeEach } from 'vitest';

const loggerInfo = vi.fn();

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: (...a: unknown[]) => loggerInfo(...a), error: vi.fn(), warn: vi.fn() },
}));

let agentIds: string[] = [];
let openConversations: Array<{ assignedAgentId?: string }> = [];
const updateMock = vi.fn(async () => undefined);
let conversationData: Record<string, unknown> = {};

vi.mock('../src/config/firebase.js', () => ({
  db: {
    collection: (path: string) => {
      if (path.endsWith('/agents')) {
        return {
          get: async () => ({
            docs: agentIds.map((id) => ({ id })),
          }),
        };
      }
      if (path.endsWith('/conversations')) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.where = self;
        chain.orderBy = self;
        chain.limit = self;
        chain.get = async () => ({
          docs: openConversations.map((c, i) => ({
            id: `c${i}`,
            data: () => c,
          })),
        });
        return chain;
      }
      return { get: async () => ({ docs: [] }) };
    },
    doc: () => ({
      get: async () => ({
        exists: true,
        data: () => conversationData,
      }),
      update: (...args: unknown[]) => updateMock(...args),
    }),
  },
}));

describe('pickLeastLoadedAgent', () => {
  beforeEach(() => {
    agentIds = ['a1', 'a2', 'a3'];
    openConversations = [
      { assignedAgentId: 'a1' },
      { assignedAgentId: 'a1' },
      { assignedAgentId: 'a2' },
      { assignedAgentId: '' },
    ];
    updateMock.mockClear();
    conversationData = { assignedAgentId: '' };
  });

  it('picks the agent with fewest open chats', async () => {
    const { pickLeastLoadedAgent } = await import('../src/services/assignment.service.js');
    expect(await pickLeastLoadedAgent('biz-1')).toBe('a3');
  });

  it('returns null when there are no agents', async () => {
    agentIds = [];
    const { pickLeastLoadedAgent } = await import('../src/services/assignment.service.js');
    expect(await pickLeastLoadedAgent('biz-1')).toBeNull();
  });
});

describe('autoAssignIfUnassigned', () => {
  beforeEach(() => {
    agentIds = ['a1', 'a2'];
    openConversations = [{ assignedAgentId: 'a1' }];
    updateMock.mockClear();
    conversationData = { assignedAgentId: '' };
  });

  it('assigns least-loaded agent when unassigned', async () => {
    const { autoAssignIfUnassigned } = await import('../src/services/assignment.service.js');
    const id = await autoAssignIfUnassigned('biz-1', 'conv-1');
    expect(id).toBe('a2');
    expect(updateMock).toHaveBeenCalled();
    expect(updateMock.mock.calls[0]?.[0]).toMatchObject({ assignedAgentId: 'a2' });
  });

  it('does not overwrite an existing assignee', async () => {
    conversationData = { assignedAgentId: 'a1' };
    const { autoAssignIfUnassigned } = await import('../src/services/assignment.service.js');
    const id = await autoAssignIfUnassigned('biz-1', 'conv-1');
    expect(id).toBe('a1');
    expect(updateMock).not.toHaveBeenCalled();
  });
});
