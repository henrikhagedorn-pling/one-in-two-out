import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Schriften lokal gebündelt (SIL OFL), nur die benötigten Schnitte, keine externen Requests
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-500.css';
import '@fontsource/newsreader/latin-400-italic.css';
import '@fontsource/hanken-grotesk/latin-400.css';
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';

import './styles/tokens.css';
import './styles/app.css';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
