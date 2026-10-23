import { useState } from 'react';
import { formatDateTime, formatTime } from '../game/format';
import { DIFFICULTY_LABELS, encodeSeed } from '../game/seed';
import { loadHistory, loadStats } from '../game/storage';
import type { GameSeed } from '../game/types';
import { ConfirmDialog } from './ConfirmDialog';
import { shortSeedCode } from './SeedStat';

/** How many games are listed at first, and added by every Load older games. */
export const SCORES_PAGE_SIZE = 10;

interface ScoresScreenProps {
  /** A game in progress would be replaced by playing one from the list, so that asks first. */
  hasSavedGame: boolean;
  onPlay: (seed: GameSeed) => void;
  onBack: () => void;
}

export function ScoresScreen({ hasSavedGame, onPlay, onBack }: ScoresScreenProps) {
  // Nothing is solved while this screen is open, so reading the storage once is enough.
  const [history] = useState(() => loadHistory().reverse());
  const [stats] = useState(loadStats);
  const [shown, setShown] = useState(SCORES_PAGE_SIZE);
  const [confirming, setConfirming] = useState<GameSeed | null>(null);

  return (
    <main className="scores">
      <header className="scores__header">
        <button className="icon-button" onClick={onBack} aria-label="Back to menu">
          ←
        </button>
        <h1 className="scores__title">Scores</h1>
      </header>

      <dl className="scores__stats">
        <div>
          <dt>Finished games</dt>
          <dd>{stats.finishedGames}</dd>
        </div>
        <div>
          <dt>Fastest solve</dt>
          <dd>{stats.fastestMs === null ? '–' : formatTime(stats.fastestMs)}</dd>
        </div>
        <div>
          <dt>Fewest pours</dt>
          <dd>{stats.fewestPours ?? '–'}</dd>
        </div>
        <div>
          <dt>Overall score</dt>
          <dd>{stats.totalScore.toLocaleString()}</dd>
        </div>
      </dl>

      {history.length === 0 ? (
        <p className="scores__empty">No solved games yet. Solve a puzzle and it shows up here.</p>
      ) : (
        <div className="scores__table-wrap">
          <table className="scores__table">
            <thead>
              <tr>
                <th scope="col">Finished at</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Time</th>
                <th scope="col">Pours</th>
                <th scope="col">Seed</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, shown).map((record, index) => {
                const code = encodeSeed(record.seed);
                return (
                  <tr key={history.length - index}>
                    <td>{formatDateTime(record.finishedAt)}</td>
                    <td>{DIFFICULTY_LABELS[record.seed.difficulty]}</td>
                    <td>{formatTime(record.elapsedMs)}</td>
                    <td>{record.pours}</td>
                    <td>
                      <button
                        className="scores__seed"
                        title={`Play ${code}`}
                        aria-label={`Play game ${code}`}
                        onClick={() => (hasSavedGame ? setConfirming(record.seed) : onPlay(record.seed))}
                      >
                        {shortSeedCode(code)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shown < history.length && (
        <button className="menu__button scores__more" onClick={() => setShown((count) => count + SCORES_PAGE_SIZE)}>
          Load older games
        </button>
      )}

      {confirming !== null && (
        <ConfirmDialog
          title="Play this game?"
          message="Your current game will be lost. This can't be undone."
          confirmLabel="Play"
          onConfirm={() => onPlay(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </main>
  );
}
