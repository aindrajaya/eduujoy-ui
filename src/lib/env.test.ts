import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './env';

describe('resolveApiUrl', () => {
  it('falls back per mode when unset or blank', () => {
    expect(resolveApiUrl(undefined, false)).toBe('http://localhost:3000');
    expect(resolveApiUrl('  ', true)).toBe('https://api.eduujoy.aindrajaya.my.id');
  });

  it('normalises to the origin', () => {
    expect(resolveApiUrl('https://api.example.com/', true)).toBe('https://api.example.com');
  });

  it('rejects non-http URLs and garbage', () => {
    expect(() => resolveApiUrl('ftp://x.y', true)).toThrow(/http\(s\)/);
    expect(() => resolveApiUrl('not a url', true)).toThrow();
  });
});
