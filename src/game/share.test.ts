import { afterEach, describe, expect, it } from 'vitest';
import { encodeSeed } from './seed';
import { SHARE_PARAM, shareUrl, takeSharedSeed } from './share';

const open = (path: string) => history.replaceState(null, '', path);

afterEach(() => {
  open('/');
});

describe('takeSharedSeed', () => {
  const seed = { difficulty: 'medium', seed: 4_242 } as const;

  it('is null without a shared game, and leaves the address alone', () => {
    open('/?other=1#top');
    expect(takeSharedSeed()).toBeNull();
    expect(location.search).toBe('?other=1');
    expect(location.hash).toBe('#top');
  });

  it('reads the seed from a shared link', () => {
    open(new URL(shareUrl(seed)).search);
    expect(takeSharedSeed()).toEqual(seed);
  });

  it('removes the parameter from the address, keeping the rest', () => {
    open(`/fluid-puzzle/?other=1&${SHARE_PARAM}=${encodeURIComponent(encodeSeed(seed))}#top`);
    takeSharedSeed();
    expect(location.pathname).toBe('/fluid-puzzle/');
    expect(location.search).toBe('?other=1');
    expect(location.hash).toBe('#top');
    expect(takeSharedSeed()).toBeNull();
  });

  it('ignores and removes an invalid code', () => {
    open(`/?${SHARE_PARAM}=nonsense`);
    expect(takeSharedSeed()).toBeNull();
    expect(location.search).toBe('');
  });
});
