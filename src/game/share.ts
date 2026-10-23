import { decodeSeed, encodeSeed } from './seed';
import type { GameSeed } from './types';

/** The URL parameter a shared link carries the game's seed code in. */
export const SHARE_PARAM = 'game_hash';

/** A link to this page that opens the game made from `seed`. */
export function shareUrl(seed: GameSeed, href = location.href): string {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(SHARE_PARAM, encodeSeed(seed));
  return url.toString();
}

/**
 * The seed a shared link opened the page with, or null. The parameter is removed from the address bar either
 * way, so reloading or bookmarking the page doesn't start the shared game over.
 */
export function takeSharedSeed(): GameSeed | null {
  const url = new URL(location.href);
  const code = url.searchParams.get(SHARE_PARAM);
  if (code === null) return null;
  url.searchParams.delete(SHARE_PARAM);
  history.replaceState(history.state, '', url);
  return decodeSeed(code);
}
