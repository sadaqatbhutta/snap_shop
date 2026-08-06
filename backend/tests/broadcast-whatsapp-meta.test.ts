import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendMessage = vi.fn<
  [string, string, string, string, string | undefined, Record<string, unknown> | undefined],
  Promise<void>
>(async () => undefined);
const loggerError = vi.fn();
const loggerInfo = vi.fn();

vi.mock('../src/services/channelSender.js', () => ({
  sendMessage,
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: (...a: unknown[]) => loggerInfo(...a), error: (...a: unknown[]) => loggerError(...a), warn: vi.fn() },
}));

vi.mock('../src/queues/queue.js', () => ({
  broadcastQueue: { add: vi.fn() },
  defaultJobOptions: {},
  connection: null,
}));

vi.mock('../src/services/usage.service.js', () => ({
  assertWithinPlanLimit: vi.fn(async () => undefined),
  incrementUsage: vi.fn(async () => undefined),
}));

const broadcastUpdate = vi.fn<[Record<string, unknown>], Promise<void>>(async () => undefined);
let templateData: Record<string, unknown> = {};
let segmentData: Record<string, unknown> = {};
let customerDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
let customerPageCalls = 0;

vi.mock('../src/config/firebase.js', () => ({
  db: {
    doc: (path: string) => ({
      get: async () => {
        if (path.includes('/templates/')) {
          return { exists: true, data: () => templateData };
        }
        if (path.includes('/segments/')) {
          return { exists: true, data: () => segmentData };
        }
        if (path.includes('/broadcasts/')) {
          return {
            exists: true,
            data: () => ({ templateId: 'tmpl-1', segmentId: 'seg-1' }),
          };
        }
        return { exists: false, data: () => undefined };
      },
      update: broadcastUpdate,
    }),
    collection: () => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.where = self;
      chain.orderBy = self;
      chain.limit = self;
      chain.startAfter = self;
      chain.get = async () => {
        customerPageCalls += 1;
        // First page returns customers; later pages empty so the do/while exits.
        if (customerPageCalls > 1) {
          return { empty: true, docs: [] };
        }
        return {
          empty: customerDocs.length === 0,
          docs: customerDocs,
        };
      };
      return chain;
    },
  },
}));

describe('resolveWhatsAppMetaFromTemplate', () => {
  it('returns null for internal templates without metaTemplateName', async () => {
    const { resolveWhatsAppMetaFromTemplate } = await import('../src/services/broadcast.service.js');
    expect(resolveWhatsAppMetaFromTemplate({ channelScope: 'internal' })).toBeNull();
    expect(resolveWhatsAppMetaFromTemplate({})).toBeNull();
  });

  it('returns Meta payload when metaTemplateName is set', async () => {
    const { resolveWhatsAppMetaFromTemplate } = await import('../src/services/broadcast.service.js');
    expect(
      resolveWhatsAppMetaFromTemplate({
        channelScope: 'whatsapp_meta',
        metaTemplateName: 'order_update',
        metaLanguageCode: 'en_US',
        metaBodyParams: ['Ada'],
      }),
    ).toEqual({
      name: 'order_update',
      languageCode: 'en_US',
      bodyParams: ['Ada'],
    });
  });
});

describe('processBroadcastJob WhatsApp Meta guard', () => {
  beforeEach(() => {
    sendMessage.mockClear();
    loggerError.mockClear();
    loggerInfo.mockClear();
    broadcastUpdate.mockClear();
    customerPageCalls = 0;
    templateData = { content: 'Promo text', channelScope: 'internal' };
    segmentData = { criteria: { channel: 'whatsapp' } };
    customerDocs = [
      {
        id: 'c1',
        data: () => ({ channel: 'whatsapp', externalId: '+15550001111', createdAt: '2026-01-01T00:00:00.000Z' }),
      },
    ];
  });

  it('skips WhatsApp recipients when template has no Meta fields (does not send plain text)', async () => {
    const { processBroadcastJob } = await import('../src/services/broadcast.service.js');
    const result = await processBroadcastJob({ broadcastId: 'bc-1', businessId: 'biz-1' });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.reach).toBe(0);
    expect(loggerError).toHaveBeenCalled();
    const errArg = loggerError.mock.calls[0]?.[0] as { error?: string };
    expect(String(errArg?.error || '')).toMatch(/Meta-approved template/i);
  });

  it('sends WhatsApp via Meta template when metaTemplateName is present', async () => {
    templateData = {
      content: 'note',
      channelScope: 'whatsapp_meta',
      metaTemplateName: 'order_update',
      metaLanguageCode: 'en',
    };
    const { processBroadcastJob } = await import('../src/services/broadcast.service.js');
    const result = await processBroadcastJob({ broadcastId: 'bc-1', businessId: 'biz-1' });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0]?.[5]).toMatchObject({
      name: 'order_update',
      languageCode: 'en',
    });
    expect(result.reach).toBe(1);
    expect(result.failed).toBe(0);
  });
});
