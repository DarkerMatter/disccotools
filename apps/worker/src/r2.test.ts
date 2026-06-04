import { describe, expect, it } from 'vitest';
import { assetKey, extForMime, ownsKey, renderKey, thumbKey } from './r2.js';

describe('renderKey / thumbKey', () => {
  it('builds the canonical keys for a user + save', () => {
    expect(renderKey('u1', 'sv1')).toBe('saves/u1/sv1.png');
    expect(thumbKey('u1', 'sv1')).toBe('saves/u1/sv1_thumb.png');
  });
});

describe('ownsKey', () => {
  it('accepts saves/{userId}/...', () => {
    expect(ownsKey('u1', 'saves/u1/anything.png')).toBe(true);
  });

  it('accepts uploads/{userId}/... and assets/{userId}/...', () => {
    expect(ownsKey('u1', 'uploads/u1/x.png')).toBe(true);
    expect(ownsKey('u1', 'assets/u1/x.png')).toBe(true);
  });

  it('rejects another user’s key', () => {
    expect(ownsKey('u1', 'saves/u2/x.png')).toBe(false);
  });

  it('rejects unknown top-level dirs', () => {
    expect(ownsKey('u1', 'random/u1/x.png')).toBe(false);
  });
});

describe('assetKey', () => {
  it('builds assets/{userId}/{assetId}.{ext}', () => {
    expect(assetKey('u1', 'a1', 'png')).toBe('assets/u1/a1.png');
  });

  it('strips a leading dot from the extension and lowercases', () => {
    expect(assetKey('u1', 'a1', '.PNG')).toBe('assets/u1/a1.png');
  });
});

describe('extForMime', () => {
  it('maps allowed mimes', () => {
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/svg+xml')).toBe('svg');
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/webp')).toBe('webp');
  });

  it('falls back to bin for unknown', () => {
    expect(extForMime('application/octet-stream')).toBe('bin');
  });
});
