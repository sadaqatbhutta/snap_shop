import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/config/config.js', () => ({
  config: {
    META_ACCESS_TOKEN: 'test-token',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-123',
  },
}));

vi.mock('../src/config/firebase.js', () => ({
  db: {
    doc: vi.fn(),
    batch: vi.fn(),
    collection: vi.fn(),
  },
}));

vi.mock('../src/services/secrets.service.js', () => ({
  loadBusinessSecrets: vi.fn(async () => ({
    metaAccessToken: 'test-token',
    whatsappPhoneNumberId: 'phone-123',
  })),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../src/utils/retry.js', () => ({
  withRetry: async (fn: () => Promise<unknown>) => fn(),
}));

const axiosPost = vi.fn<[string, Record<string, unknown>], Promise<{ data: { messages: { id: string }[] } }>>(
  async () => ({ data: { messages: [{ id: 'wamid.1' }] } }),
);
vi.mock('axios', () => ({
  default: { post: axiosPost },
}));

describe('sendMessage WhatsApp Meta template', () => {
  beforeEach(() => {
    axiosPost.mockClear();
  });

  it('posts Graph type=template when waTemplate is provided', async () => {
    const { sendMessage } = await import('../src/services/channelSender.js');
    await sendMessage(
      'whatsapp',
      '+15551234567',
      'ignored for template',
      'biz-1',
      undefined,
      { name: 'order_update', languageCode: 'en', bodyParams: ['Ada', 'ORD-1'] },
    );

    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [, body] = axiosPost.mock.calls[0];
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '+15551234567',
      type: 'template',
      template: {
        name: 'order_update',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Ada' },
              { type: 'text', text: 'ORD-1' },
            ],
          },
        ],
      },
    });
  });

  it('posts Graph type=text when no waTemplate is provided', async () => {
    const { sendMessage } = await import('../src/services/channelSender.js');
    await sendMessage('whatsapp', '+15551234567', 'Hello', 'biz-1');

    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [, body] = axiosPost.mock.calls[0];
    expect(body).toMatchObject({
      type: 'text',
      text: { body: 'Hello' },
    });
  });
});
