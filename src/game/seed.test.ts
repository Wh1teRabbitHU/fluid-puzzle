import { describe, expect, it } from 'vitest';
import { decodeSeed, encodeSeed, isGameSeed, randomSeed, seededRandom } from './seed';
import type { GameSeed } from './types';

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRandom(123);
    const b = seededRandom(123);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('differs between seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  it('stays in [0, 1)', () => {
    const random = seededRandom(2 ** 32 - 1);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(2 ** 32 - 1);
  });
});

describe('encodeSeed / decodeSeed', () => {
  const seed: GameSeed = { difficulty: 'medium', seed: 3_141_592_653 };

  it('encodes the difficulty and seed as base64 JSON', () => {
    expect(JSON.parse(atob(encodeSeed(seed)))).toEqual({ difficulty: 'medium', seed: 3_141_592_653 });
  });

  it('round-trips', () => {
    expect(decodeSeed(encodeSeed(seed))).toEqual(seed);
  });

  it('ignores surrounding whitespace from copying', () => {
    expect(decodeSeed(`  ${encodeSeed(seed)}\n`)).toEqual(seed);
  });

  it('drops unknown fields', () => {
    expect(decodeSeed(btoa(JSON.stringify({ ...seed, extra: true })))).toEqual(seed);
  });

  it.each([
    ['empty input', ''],
    ['not base64', '%%%'],
    ['base64 of non-JSON', btoa('hello')],
    ['JSON that is not an object', btoa('42')],
    ['an unknown difficulty', btoa(JSON.stringify({ difficulty: 'expert', seed: 1 }))],
    ['a missing seed', btoa(JSON.stringify({ difficulty: 'easy' }))],
    ['a negative seed', btoa(JSON.stringify({ difficulty: 'easy', seed: -1 }))],
    ['a fractional seed', btoa(JSON.stringify({ difficulty: 'easy', seed: 1.5 }))],
    ['a seed above 32 bits', btoa(JSON.stringify({ difficulty: 'easy', seed: 2 ** 32 }))],
    ['a seed given as a string', btoa(JSON.stringify({ difficulty: 'easy', seed: '1' }))],
  ])('rejects %s', (_, code) => {
    expect(decodeSeed(code)).toBeNull();
  });
});

describe('isGameSeed', () => {
  it('accepts the bounds', () => {
    expect(isGameSeed({ difficulty: 'easy', seed: 0 })).toBe(true);
    expect(isGameSeed({ difficulty: 'hard', seed: 2 ** 32 - 1 })).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isGameSeed(null)).toBe(false);
    expect(isGameSeed('easy')).toBe(false);
  });
});
