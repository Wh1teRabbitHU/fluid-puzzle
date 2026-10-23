import { useEffect, useState } from 'react';
import { canPour, gameStatus, pour, score } from '../game/logic';
import type { GameState, Vial } from '../game/types';
import { Dialog } from './Dialog';
import { POUR_DURATION_MS, VialView, type VialState } from './VialView';

interface PlayFieldProps {
  game: GameState;
  /** Called with the new state after every pour (and when the clock pauses); the owner persists it. */
  onChange: (game: GameState) => void;
  onNewGame: () => void;
  onRetry: () => void;
  onExit: () => void;
}

/** A pour being animated: `source` is the source vial as it was before the pour. */
interface PourAnimation {
  from: number;
  to: number;
  amount: number;
  source: Vial;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PlayField({ game, onChange, onNewGame, onRetry, onExit }: PlayFieldProps) {
  const { board, pours } = game;
  const status = gameStatus(board);
  const [selected, setSelected] = useState<number | null>(null);
  const [animation, setAnimation] = useState<PourAnimation | null>(null);

  // The clock runs from the first pour until the game ends, paused while the page is hidden or the
  // player is in the menu. `runningSince` is when the current stretch started; null while paused.
  const canRun = () => pours > 0 && status === 'playing' && !document.hidden;
  const [runningSince, setRunningSince] = useState<number | null>(() => (canRun() ? Date.now() : null));
  const [now, setNow] = useState(Date.now);
  const elapsedAt = (time: number) => game.elapsedMs + (runningSince === null ? 0 : Math.max(0, time - runningSince));

  function pauseClock() {
    if (runningSince === null) return;
    onChange({ ...game, elapsedMs: elapsedAt(Date.now()) });
    setRunningSince(null);
  }

  useEffect(() => {
    if (runningSince === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [runningSince]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) pauseClock();
      else if (canRun()) setRunningSince(Date.now());
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  });

  useEffect(() => {
    if (animation === null) return;
    const timeout = setTimeout(() => setAnimation(null), POUR_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [animation]);

  function vialState(index: number): VialState {
    if (animation !== null) return 'idle';
    if (index === selected) return 'selected';
    if (selected !== null && canPour(board, selected, index)) return 'target';
    if (board[index].length > 0) return 'selectable';
    return 'idle';
  }

  function handleClick(index: number) {
    if (animation !== null) return;
    if (selected !== null && canPour(board, selected, index)) {
      const next = pour(board, selected, index);
      const time = Date.now();
      setAnimation({ from: selected, to: index, amount: board[selected].length - next[selected].length, source: board[selected] });
      setRunningSince(gameStatus(next) === 'playing' ? time : null);
      setNow(time);
      setSelected(null);
      onChange({ ...game, board: next, pours: pours + 1, elapsedMs: elapsedAt(time) });
    } else if (index === selected || board[index].length === 0) {
      setSelected(null);
    } else {
      setSelected(index);
    }
  }

  const elapsed = elapsedAt(now);

  return (
    <main className="play">
      <header className="play__header">
        <button
          className="icon-button"
          onClick={() => {
            pauseClock();
            onExit();
          }}
          aria-label="Back to menu"
        >
          ←
        </button>
        <div className="play__stats">
          <div className="stat">
            <span className="stat__label">Time</span>
            <span className="stat__value">{formatTime(elapsed)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Pours</span>
            <span className="stat__value">{pours}</span>
          </div>
        </div>
      </header>

      <section className="board">
        {board.map((vial, index) => {
          let vialAnimation;
          if (animation?.from === index) vialAnimation = { kind: 'drain', amount: animation.amount } as const;
          if (animation?.to === index) vialAnimation = { kind: 'fill', amount: animation.amount } as const;
          return (
            <VialView
              key={index}
              vial={animation?.from === index ? animation.source : vial}
              state={vialState(index)}
              animation={vialAnimation}
              onClick={() => handleClick(index)}
            />
          );
        })}
      </section>

      {animation === null && status === 'solved' && (
        <Dialog
          title="Congratulations!"
          actions={
            <>
              <button className="menu__button menu__button--primary" onClick={onNewGame} autoFocus>
                New game
              </button>
              <button className="menu__button" onClick={onExit}>
                Menu
              </button>
            </>
          }
        >
          <p>You solved the puzzle.</p>
          <dl className="dialog__stats">
            <div>
              <dt>Time</dt>
              <dd>{formatTime(game.elapsedMs)}</dd>
            </div>
            <div>
              <dt>Pours</dt>
              <dd>{pours}</dd>
            </div>
            <div>
              <dt>Score</dt>
              <dd>{score(game.elapsedMs, pours).toLocaleString()}</dd>
            </div>
          </dl>
        </Dialog>
      )}

      {animation === null && status === 'stuck' && (
        <Dialog
          title="Game over"
          actions={
            <>
              <button className="menu__button menu__button--primary" onClick={onNewGame} autoFocus>
                New game
              </button>
              <button className="menu__button" onClick={onRetry}>
                Retry
              </button>
              <button className="menu__button" onClick={onExit}>
                Menu
              </button>
            </>
          }
        >
          <p>No more legal moves left.</p>
        </Dialog>
      )}
    </main>
  );
}
