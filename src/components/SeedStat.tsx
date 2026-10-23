import { useEffect, useState } from 'react';
import { encodeSeed } from '../game/seed';
import type { GameSeed } from '../game/types';

export const COPIED_FEEDBACK_MS = 2000;

/**
 * Every code starts the same way (base64 of `{"difficulty":"`), so the header shows its end, which is
 * where seeds differ. Clicking still copies the whole code.
 */
export function shortSeedCode(code: string): string {
  return code.length > 12 ? `…${code.slice(-10)}` : code;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // No async clipboard (e.g. an insecure context, or permission denied): fall back to the old way.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}

/** The game's seed in the header; clicking copies it so the same game can be loaded again. */
export function SeedStat({ seed }: { seed: GameSeed }) {
  const code = encodeSeed(seed);
  // Bumped on every successful copy, so copying again restarts the 2 seconds.
  const [copied, setCopied] = useState(0);

  useEffect(() => {
    if (copied === 0) return;
    const timeout = setTimeout(() => setCopied(0), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <button
      type="button"
      className="stat stat--seed"
      title={`Copy seed ${code}`}
      aria-label={`Seed ${code}, ${copied ? 'copied' : 'click to copy'}`}
      onClick={async () => {
        if (await copyText(code)) setCopied((count) => count + 1);
      }}
    >
      <span className="stat__label" aria-live="polite">
        {copied ? 'Seed - copied!' : 'Seed'}
      </span>
      <span className="stat__value stat__value--seed">{shortSeedCode(code)}</span>
    </button>
  );
}
