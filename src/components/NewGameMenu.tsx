import { useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABELS, SHUFFLE_STEPS, randomSeed } from '../game/seed';
import type { GameSeed } from '../game/types';
import { LoadSeedDialog } from './LoadSeedDialog';

interface NewGameMenuProps {
  onStart: (seed: GameSeed) => void;
  onBack: () => void;
}

export function NewGameMenu({ onStart, onBack }: NewGameMenuProps) {
  const [loadingSeed, setLoadingSeed] = useState(false);

  return (
    <main className="menu">
      <h1 className="menu__title">New game</h1>
      <p className="menu__subtitle">Pick a difficulty, or replay a game from its seed.</p>

      <nav className="menu__items">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            className="menu__button menu__button--difficulty"
            onClick={() => onStart({ difficulty, seed: randomSeed() })}
          >
            {DIFFICULTY_LABELS[difficulty]}{' '}
            <span className="menu__hint">{SHUFFLE_STEPS[difficulty]} shuffles</span>
          </button>
        ))}
        <button className="menu__button" onClick={() => setLoadingSeed(true)}>
          Load seed
        </button>
        <button className="menu__link" onClick={onBack}>
          Back
        </button>
      </nav>

      {loadingSeed && <LoadSeedDialog onLoad={onStart} onCancel={() => setLoadingSeed(false)} />}
    </main>
  );
}
