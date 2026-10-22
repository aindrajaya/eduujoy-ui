import { afterEach, describe, expect, it, vi } from 'vitest';
import { keysWithPrefix, readJson, removeItem, writeJson } from './storage';

const isNumbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('storage', () => {
  it('round-trips validated JSON and lists keys by prefix', () => {
    expect(writeJson('quiz:u1:a', [1, 2])).toBe(true);
    writeJson('quiz:u2:b', [3]);
    writeJson('other', [4]);
    expect(readJson('quiz:u1:a', isNumbers)).toEqual([1, 2]);
    expect(keysWithPrefix('quiz:').sort()).toEqual(['quiz:u1:a', 'quiz:u2:b']);
    removeItem('quiz:u1:a');
    expect(readJson('quiz:u1:a', isNumbers)).toBeNull();
  });

  it('returns null for missing, corrupt or invalid values', () => {
    expect(readJson('missing', isNumbers)).toBeNull();
    window.localStorage.setItem('bad', '{not json');
    expect(readJson('bad', isNumbers)).toBeNull();
    window.localStorage.setItem('wrong', '"text"');
    expect(readJson('wrong', isNumbers)).toBeNull();
  });

  it('survives storage that throws (quota, private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(writeJson('k', [1])).toBe(false);
    expect(() => {
      removeItem('k');
    }).not.toThrow();
    expect(keysWithPrefix('k')).toEqual([]);
  });

  it('works when localStorage is entirely unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    expect(writeJson('k', [1])).toBe(false);
    expect(readJson('k', isNumbers)).toBeNull();
    expect(keysWithPrefix('k')).toEqual([]);
    expect(() => {
      removeItem('k');
    }).not.toThrow();
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});
