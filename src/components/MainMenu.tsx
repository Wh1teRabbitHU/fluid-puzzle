import { useState } from 'react';
import { FLUID_COLORS } from '../game/colors';
import { ConfirmDialog } from './ConfirmDialog';
import { HowToPlayDialog } from './HowToPlayDialog';

interface MainMenuProps {
  hasSavedGame: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}

export function MainMenu({ hasSavedGame, onContinue, onNewGame }: MainMenuProps) {
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const [showingHelp, setShowingHelp] = useState(false);

  return (
    <main className="menu">
      <div className="menu__logo" aria-hidden="true">
        {Object.values(FLUID_COLORS).map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </div>
      <h1 className="menu__title">Fluid Puzzle</h1>
      <p className="menu__subtitle">Sort every color into its own vial.</p>

      <nav className="menu__items">
        {hasSavedGame && (
          <button className="menu__button menu__button--primary" onClick={onContinue}>
            Continue
          </button>
        )}
        <button
          className={`menu__button${hasSavedGame ? '' : ' menu__button--primary'}`}
          onClick={() => (hasSavedGame ? setConfirmingNewGame(true) : onNewGame())}
        >
          New game
        </button>
        <button className="menu__button" onClick={() => setShowingHelp(true)}>
          How to play
        </button>
        <button className="menu__button" disabled>
          Scores <span className="menu__soon">soon</span>
        </button>
        <button className="menu__button" disabled>
          Options <span className="menu__soon">soon</span>
        </button>
      </nav>

      {showingHelp && <HowToPlayDialog onClose={() => setShowingHelp(false)} />}

      {confirmingNewGame && (
        <ConfirmDialog
          title="Start a new game?"
          message="Your current game will be lost. This can't be undone."
          confirmLabel="New game"
          onConfirm={onNewGame}
          onCancel={() => setConfirmingNewGame(false)}
        />
      )}
    </main>
  );
}
