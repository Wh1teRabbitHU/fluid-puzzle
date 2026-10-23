import type { CSSProperties } from 'react';
import { FLUID_COLORS } from '../game/colors';
import type { Vial } from '../game/types';

/** `selectable`: has fluid and can be picked up. `target`: the selected vial can pour into it. */
/** How long a pour animates, however many units it moves. */
export const POUR_DURATION_MS = 300;

export type VialState = 'idle' | 'selectable' | 'selected' | 'target';

/** `drain`: the top `amount` units shrink away. `fill`: the top `amount` units grow in. */
export interface VialAnimation {
  kind: 'drain' | 'fill';
  amount: number;
}

/** A complete vial is capped; `new` drops the cap in with an animation. */
export type VialCap = 'none' | 'shown' | 'new';

interface VialViewProps {
  vial: Vial;
  state: VialState;
  animation?: VialAnimation;
  cap?: VialCap;
  onClick: () => void;
}

export function VialView({ vial, state, animation, cap = 'none', onClick }: VialViewProps) {
  const firstAnimated = animation ? vial.length - animation.amount : vial.length;
  const stepMs = animation ? POUR_DURATION_MS / animation.amount : 0;

  // Units move one at a time so the level falls (or rises) steadily: a drain empties the topmost unit
  // first, a fill fills the lowest new unit first.
  function unitStyle(index: number): CSSProperties | undefined {
    if (!animation || index < firstAnimated) return undefined;
    const order = animation.kind === 'drain' ? vial.length - 1 - index : index - firstAnimated;
    return { animationDuration: `${stepMs}ms`, animationDelay: `${order * stepMs}ms` };
  }

  return (
    <button
      type="button"
      className={`vial vial--${state}`}
      onClick={onClick}
      aria-pressed={state === 'selected'}
      aria-label={vial.length > 0 ? `Vial with ${vial.join(', ')} (bottom to top)` : 'Empty vial'}
    >
      {cap !== 'none' && (
        <div
          className={`vial__cap${cap === 'new' ? ' vial__cap--new' : ''}`}
          style={{ background: FLUID_COLORS[vial[0]] }}
        />
      )}
      <div className="vial__glass">
        {vial.map((color, index) => (
          <div
            key={index}
            className={`vial__unit${animation && index >= firstAnimated ? ` vial__unit--${animation.kind}` : ''}`}
            style={{ background: FLUID_COLORS[color], ...unitStyle(index) }}
          />
        ))}
      </div>
    </button>
  );
}
