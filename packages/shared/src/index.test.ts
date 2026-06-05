import { describe, expect, it } from 'vitest';
import { API_VERSION } from './index.js';

describe('shared/index', () => {
  it('exports a semver API_VERSION string', () => {
    expect(typeof API_VERSION).toBe('string');
    expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
