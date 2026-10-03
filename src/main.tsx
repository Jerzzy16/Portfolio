import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import '@/index.css';

import App from '@/App';
import { applyTheme, pickTheme, verifyTheme } from '@/lib/palette';

// The theme rotates on every page load. Nothing is written to storage, so a
// refresh always lands on a different hue, canvas included. Painted before the
// first render so the page never flashes the default lime.
applyTheme(pickTheme());
verifyTheme();

const container = document.getElementById('root');

if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);