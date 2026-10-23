import { screen } from '@testing-library/react';

export const vials = () => screen.getAllByRole('button', { name: /vial/i });

/** Each vial's aria-label, which lists its contents; a readable snapshot of the board. */
export const boardLabels = () => vials().map((vial) => vial.getAttribute('aria-label'));

export const vialStates = () =>
  vials().map((vial) => [...vial.classList].find((name) => name.startsWith('vial--'))?.slice('vial--'.length));

export const stat = (label: 'Difficulty' | 'Time' | 'Pours') => screen.getByText(label, { selector: '.stat__label' }).nextElementSibling?.textContent;
