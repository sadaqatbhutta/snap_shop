import { describe, expect, it } from 'vitest';
import { bindingDocId } from '../src/services/tenantResolver.service.js';

describe('tenantResolver', () => {
  it('builds stable binding document ids', () => {
    expect(bindingDocId('whatsapp', ' 12345 ')).toBe('whatsapp:12345');
    expect(bindingDocId('facebook', 'page-9')).toBe('facebook:page-9');
    expect(bindingDocId('instagram', 'ig-1')).toBe('instagram:ig-1');
    expect(bindingDocId('tiktok', 'tt-1')).toBe('tiktok:tt-1');
  });
});
