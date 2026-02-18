// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';

type Page = 'welcome' | 'instructions';

function App() {
  const [page, setPage] = useState<Page>('welcome');

  if (page === 'instructions') {
    return <InstructionPage onBack={() => setPage('welcome')} />;
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
