import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pour } from '../game/logic';
import type { GameState } from '../game/types';
import { MID_GAME, ONE_POUR_FROM_SOLVED, ONE_POUR_FROM_STUCK, gameOf } from '../test/boards';
import { stat, vialStates, vials } from '../test/queries';
import { PlayField } from './PlayField';
import { POUR_DURATION_MS } from './VialView';

function renderPlayField(initial: GameState) {
  const props = { onChange: vi.fn(), onNewGame: vi.fn(), onRetry: vi.fn(), onExit: vi.fn() };
  // PlayField is controlled; this stands in for App, which owns the state.
  function Harness() {
    const [game, setGame] = useState(initial);
    return (
      <PlayField
        {...props}
        game={game}
        onChange={(next) => {
          props.onChange(next);
          setGame(next);
        }}
      />
    );
  }
  render(<Harness />);
  return props;
}

const click = (index: number) => fireEvent.click(vials()[index]);
const pourAndSettle = (from: number, to: number) => {
  click(from);
  click(to);
  act(() => vi.advanceTimersByTime(POUR_DURATION_MS));
};
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

describe('selecting', () => {
  it('marks vials with fluid as selectable and empty ones as idle', () => {
    renderPlayField(gameOf(MID_GAME));
    expect(vialStates()).toEqual([...Array(10).fill('selectable'), 'idle', 'idle']);
  });

  it('selects a clicked vial and marks every vial it can pour into as a target', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    // Vial 0 has blue on top: vial 1 (blue) and the empty vials accept it; the full blue vial 6 doesn't.
    expect(vialStates()).toEqual(['selected', 'target', ...Array(8).fill('selectable'), 'target', 'target']);
    expect(vials()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('deselects when the selected vial is clicked again', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(0);
    expect(vialStates()).not.toContain('selected');
  });

  it('switches the selection to a vial that is not a target', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(2);
    expect(vialStates()[2]).toBe('selected');
    expect(vialStates()[0]).toBe('selectable');
  });

  it('does not select an empty vial', () => {
    renderPlayField(gameOf(MID_GAME));
    click(10);
    expect(vialStates()).not.toContain('selected');
  });
});

describe('pouring', () => {
  it('pours into a target and reports the new state', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    expect(onChange).toHaveBeenLastCalledWith(gameOf(MID_GAME, { board: pour(MID_GAME, 0, 1), pours: 1 }));
    expect(stat('Pours')).toBe('1');
  });

  it('animates the pour, then settles', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);

    // The source still shows the units that are draining away; the target already holds the arriving ones.
    expect(vials()[0].querySelectorAll('.vial__unit')).toHaveLength(4);
    expect(vials()[0].querySelectorAll('.vial__unit--drain')).toHaveLength(3);
    expect(vials()[1].querySelectorAll('.vial__unit--fill')).toHaveLength(3);

    advance(POUR_DURATION_MS);
    expect(vials()[0].querySelectorAll('.vial__unit')).toHaveLength(1);
    expect(document.querySelectorAll('.vial__unit--drain, .vial__unit--fill')).toHaveLength(0);
  });

  it('ignores clicks while a pour is animating', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    expect(vialStates().every((state) => state === 'idle')).toBe(true);

    click(1);
    click(10);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(vialStates()).not.toContain('selected');
  });
});

describe('clock', () => {
  it('waits for the first pour', () => {
    renderPlayField(gameOf(MID_GAME));
    advance(5_000);
    expect(stat('Time')).toBe('00:00');
  });

  it('runs after the first pour', () => {
    renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(65_000);
    expect(stat('Time')).toBe('01:05');
  });

  it('resumes a saved game where it left off', () => {
    renderPlayField(gameOf(MID_GAME, { pours: 4, elapsedMs: 83_000 }));
    expect(stat('Time')).toBe('01:23');
    advance(2_000);
    expect(stat('Time')).toBe('01:25');
  });

  it('records the time with each pour', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    pourAndSettle(0, 10);
    advance(3_000);
    pourAndSettle(0, 11);
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(3_000 + POUR_DURATION_MS);
  });

  it('pauses while the page is hidden', () => {
    const { onChange } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(2_000);

    setHidden(true);
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(2_000);
    advance(10_000);
    expect(stat('Time')).toBe('00:02');

    setHidden(false);
    advance(3_000);
    expect(stat('Time')).toBe('00:05');
  });

  it('pauses and saves the time when leaving for the menu', () => {
    const { onChange, onExit } = renderPlayField(gameOf(MID_GAME));
    click(0);
    click(1);
    advance(4_000);
    fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(onChange.mock.lastCall?.[0].elapsedMs).toBe(4_000);
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe('end of game', () => {
  it('congratulates once the solving pour has finished animating', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 9, elapsedMs: 59_000 }));
    advance(1_000);
    click(1);
    click(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    advance(POUR_DURATION_MS);
    const dialog = screen.getByRole('dialog', { name: 'Congratulations!' });
    expect(dialog).toHaveTextContent('You solved the puzzle.');
    expect(dialog).toHaveTextContent('Time01:00');
    expect(dialog).toHaveTextContent('Pours10');
    expect(dialog).toHaveTextContent(`Score${(10_000 - 5 * 60 - 20 * 10).toLocaleString()}`);
  });

  it('offers a new game or the menu after solving, but no retry', () => {
    const { onNewGame, onExit } = renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 1 }));
    pourAndSettle(1, 0);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('stops the clock when the puzzle is solved', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_SOLVED, { pours: 1 }));
    advance(1_000);
    pourAndSettle(1, 0);
    advance(30_000);
    expect(stat('Time')).toBe('00:01');
  });

  it('ends the game when no legal pour is left', () => {
    const { onNewGame, onRetry, onExit } = renderPlayField(gameOf(ONE_POUR_FROM_STUCK, { pours: 1 }));
    pourAndSettle(11, 10);

    const dialog = screen.getByRole('dialog', { name: 'Game over' });
    expect(dialog).toHaveTextContent('No more legal moves left.');

    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onNewGame).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('shows the end dialog straight away when resuming a finished game', () => {
    renderPlayField(gameOf(ONE_POUR_FROM_STUCK, { board: pour(ONE_POUR_FROM_STUCK, 11, 10), pours: 3 }));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeInTheDocument();
  });
});
