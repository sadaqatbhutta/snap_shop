import { describe, expect, it } from 'vitest';
import { PLAN_DEFINITIONS, isWithinLimit } from '../../shared/plans.js';

describe('plan limits', () => {
  it('defines free/growth/scale/enterprise plans', () => {
    expect(PLAN_DEFINITIONS.free.limits.messagesPerMonth).toBeGreaterThan(0);
    expect(PLAN_DEFINITIONS.growth.priceMonthlyUsd).toBe(79);
    expect(PLAN_DEFINITIONS.scale.priceMonthlyUsd).toBe(149);
    expect(PLAN_DEFINITIONS.enterprise.limits.messagesPerMonth).toBe(-1);
  });

  it('treats -1 as unlimited', () => {
    expect(isWithinLimit(1_000_000, -1)).toBe(true);
    expect(isWithinLimit(10, 10)).toBe(false);
    expect(isWithinLimit(9, 10)).toBe(true);
  });
});
