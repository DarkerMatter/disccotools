import { describe, expect, it } from 'vitest';
import { API_VERSION } from './index.js';

describe('shared/index', () => {
  it('exports a numeric API_VERSION', () => {
    expect(typeof API_VERSION).toBe('number');
    expect(API_VERSION).toBeGreaterThanOrEqual(1);
  });
});
