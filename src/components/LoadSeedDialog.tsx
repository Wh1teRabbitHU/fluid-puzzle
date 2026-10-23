import { useState } from 'react';
import { decodeSeed } from '../game/seed';
import type { GameSeed } from '../game/types';
import { Dialog } from './Dialog';

interface LoadSeedDialogProps {
  onLoad: (seed: GameSeed) => void;
  onCancel: () => void;
}

export function LoadSeedDialog({ onLoad, onCancel }: LoadSeedDialogProps) {
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);

  function load() {
    const seed = decodeSeed(code);
    if (seed) onLoad(seed);
    else setInvalid(true);
  }

  return (
    <Dialog
      title="Load seed"
      onCancel={onCancel}
      onSubmit={load}
      actions={
        <>
          <button type="button" className="menu__button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="menu__button menu__button--primary" disabled={code.trim() === ''}>
            Load
          </button>
        </>
      }
    >
      <p>Paste the seed of a game to play the same puzzle.</p>
      <input
        className="dialog__input"
        aria-label="Seed"
        aria-invalid={invalid}
        aria-describedby={invalid ? 'seed-error' : undefined}
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setInvalid(false);
        }}
        placeholder="Seed"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      {invalid && (
        <p id="seed-error" className="dialog__error" role="alert">
          That isn't a valid seed.
        </p>
      )}
    </Dialog>
  );
}
