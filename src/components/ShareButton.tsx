import { useEffect, useState } from 'react';
import { shareUrl } from '../game/share';
import type { GameSeed } from '../game/types';
import { COPIED_FEEDBACK_MS, copyText } from './SeedStat';

/**
 * Phones and tablets, whose main pointer is a finger. Desktop browsers have share sheets too, but their Copy
 * option copies the text along with the link, so there the link is copied directly.
 */
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

/** Shares a link that opens this game: through the system share sheet on touch devices, otherwise by copying it. */
export function ShareButton({ seed }: { seed: GameSeed }) {
  // Bumped on every successful copy, so copying again restarts the feedback.
  const [copied, setCopied] = useState(0);

  useEffect(() => {
    if (copied === 0) return;
    const timeout = setTimeout(() => setCopied(0), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function share() {
    const url = shareUrl(seed);
    if (navigator.share && isTouchDevice()) {
      try {
        await navigator.share({ title: 'Fluid Puzzle', text: 'Can you solve this Fluid Puzzle?', url });
        return;
      } catch (error) {
        // The player closed the share sheet.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    if (await copyText(url)) setCopied((count) => count + 1);
  }

  return (
    <button className="play__action" onClick={share} aria-live="polite">
      {copied ? 'Link copied!' : 'Share'}
    </button>
  );
}
