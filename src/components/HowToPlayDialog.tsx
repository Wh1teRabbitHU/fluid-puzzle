import { FLUID_COLORS } from '../game/colors';
import type { Vial } from '../game/types';
import { Dialog } from './Dialog';

interface HowToPlayDialogProps {
  onClose: () => void;
}

/** A tiny, non-interactive vial for the illustrations. */
function MiniVial({ vial, capped = false }: { vial: Vial; capped?: boolean }) {
  return (
    <span className={`howto__vial${capped ? ' howto__vial--capped' : ''}`}>
      {vial.map((color, index) => (
        <span key={index} style={{ background: FLUID_COLORS[color] }} />
      ))}
    </span>
  );
}

/** The main rules in short; RULES.md has the full version. */
export function HowToPlayDialog({ onClose }: HowToPlayDialogProps) {
  return (
    <Dialog
      title="How to play"
      wide
      onCancel={onClose}
      actions={
        <button className="menu__button menu__button--primary" onClick={onClose} autoFocus>
          Got it
        </button>
      }
    >
      <div className="howto">
        <section>
          <h3>Goal</h3>
          <p>
            Sort the fluids so every vial holds a <strong>single color</strong>. You win when each vial is either
            empty or full with all 4 units of one color.
          </p>
          <div className="howto__figure" aria-hidden="true">
            <MiniVial vial={['red', 'sky', 'red', 'lime']} />
            <MiniVial vial={['sky', 'lime', 'sky', 'red']} />
            <span className="howto__arrow">→</span>
            <MiniVial vial={['red', 'red', 'red', 'red']} capped />
            <MiniVial vial={['sky', 'sky', 'sky', 'sky']} capped />
          </div>
        </section>

        <section>
          <h3>Pouring</h3>
          <ol>
            <li>Tap a vial to pick it up, then tap the vial to pour into.</li>
            <li>
              Only the <strong>top color</strong> pours, all of its units at once, as many as fit.
            </li>
            <li>
              It can land on the <strong>same color</strong> or in an <strong>empty vial</strong>.
            </li>
            <li>
              A vial full of one color gets a <strong>cap</strong> and is locked.
            </li>
          </ol>
        </section>

        <section>
          <h3>Buttons</h3>
          <dl className="howto__terms">
            <dt>Revert</dt>
            <dd>Takes back the last pour.</dd>
            <dt>Reset</dt>
            <dd>Starts this board over from the beginning.</dd>
            <dt>New game</dt>
            <dd>Deals a fresh board on the same difficulty.</dd>
          </dl>
        </section>

        <section>
          <h3>Score</h3>
          <p>
            The clock starts with your first pour. You start at <strong>10,000</strong> points and lose 5 for every
            second and 20 for every pour (reverted ones too), but a solve is always worth at least 100.
          </p>
          <p className="howto__note">If no pour is possible anymore, the game is over: you can retry the same board or start a new one.</p>
        </section>
      </div>
    </Dialog>
  );
}
