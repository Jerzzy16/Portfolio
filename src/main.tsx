import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import '@/index.css';

import App from '@/App';
import { applyPalette, pickPalette, verifyPalette } from '@/lib/palette';

// The accent rotates on every page load. Nothing is written to storage, so a
// refresh always lands on a different hue. Paint before first render so the
// page never flashes the default lime.
applyPalette(pickPalette());
verifyPalette();

const container = document.getElementById('root');

if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);