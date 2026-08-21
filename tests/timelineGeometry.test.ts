import { describe, expect, it } from 'vitest';
import { formatTimecode, getRulerStepSeconds, parsePositionInput } from '../src/editor/timeline/utils/timelineGeometry';

describe('timeline geometry', () => {
  it('formats frames as HH:MM:SS', () => {
    expect(formatTimecode(0, 30)).toBe('00:00:00');
    expect(formatTimecode(3661 * 30, 30)).toBe('01:01:01');
  });

  it('parses frame numbers and timecodes', () => {
    expect(parsePositionInput('150', 30)).toBe(150);
    expect(parsePositionInput('01:30', 30)).toBe(2700);
    expect(parsePositionInput('01:02:03', 30)).toBe(111690);
    expect(parsePositionInput('invalid', 30)).toBeNull();
  });

  it('chooses readable ruler intervals', () => {
    expect(getRulerStepSeconds(15 * 30, 30)).toBe(5);
    expect(getRulerStepSeconds(2 * 60 * 30, 30)).toBe(10);
    expect(getRulerStepSeconds(10 * 60 * 30, 30)).toBe(30);
  });
});
