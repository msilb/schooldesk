// Static public preview: only this client entry and authored fictional fixtures
// are bundled. It cannot include API routes, accounts, storage or school access.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from '../app/dashboard';
import Theme from '../app/theme-provider';
import { demoCatalogue } from '../lib/demo';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme>
      <Dashboard
        initial={{ catalogue: demoCatalogue(), version: 1, publishedAt: null }}
        initialNotes={[]}
        initialRuns={[]}
        mode="demo"
        access={null}
      />
    </Theme>
  </StrictMode>,
);
