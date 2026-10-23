import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { takeSharedSeed } from './game/share';
import './styles.css';

// Read once, before rendering: it also cleans the address bar, so it can't run again on a re-render.
const sharedSeed = takeSharedSeed();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App sharedSeed={sharedSeed} />
  </StrictMode>,
);
