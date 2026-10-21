import { describe, expect, it } from 'vitest';
import { formatTimestamp, parseTimestamp } from './time';

describe('timestamps', () => {
  it.each([
    ['4:10', 250],
    ['07:45', 465],
    ['1:02:03', 3723],
  ])('parses %s', (value, seconds) => {
    expect(parseTimestamp(value)).toBe(seconds);
  });

  it.each([undefined, null, '', '4', '4:1', 'abc', '1:2:3:4'])('rejects %j', (value) => {
    expect(parseTimestamp(value)).toBeUndefined();
  });

  it('formats seconds', () => {
    expect(formatTimestamp(250)).toBe('04:10');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });
});
