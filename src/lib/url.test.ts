import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './url';

describe('safeExternalUrl', () => {
  it('keeps http and https URLs', () => {
    expect(safeExternalUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeExternalUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('drops missing, relative and script URLs', () => {
    expect(safeExternalUrl(undefined)).toBeUndefined();
    expect(safeExternalUrl('/relative')).toBeUndefined();
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('data:text/html,hi')).toBeUndefined();
  });
});
