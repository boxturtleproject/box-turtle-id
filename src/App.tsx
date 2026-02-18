// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';

type Page = 'welcome' | 'instructions' | 'match';

function App() {
  const [page, setPage] = useState<Page>('welcome');

  if (page === 'match') {
    return (
      <MatchProfilePage
        onBack={() => setPage('instructions')}
        onNotMyTurtle={() => setPage('instructions')}
      />
    );
  }

  if (page === 'instructions') {
    return (
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => setPage('match')}
      />
    );
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
