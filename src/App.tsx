// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';
import { PossibleMatchPage, type CandidateTurtle } from './pages/PossibleMatchPage';

type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match';

// Hardcoded candidates for demo — replace with algorithm output when ready
const DEMO_CANDIDATES: CandidateTurtle[] = [
  { turtleNickname: 'T106', confidence: 'high' },
  { turtleNickname: 'T107', confidence: 'medium' },
  { turtleNickname: 'T108', confidence: 'low' },
];

function App() {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  if (page === 'match') {
    return (
      <MatchProfilePage
        onBack={() => setPage('instructions')}
        onNotMyTurtle={() => setPage('instructions')}
        mode="confirmed"
      />
    );
  }

  if (page === 'possible-match') {
    if (selectedCandidate) {
      return (
        <MatchProfilePage
          turtleNickname={selectedCandidate}
          onBack={() => setSelectedCandidate(null)}
          onNotMyTurtle={() => { setSelectedCandidate(null); }}
          mode="review"
        />
      );
    }
    return (
      <PossibleMatchPage
        candidates={DEMO_CANDIDATES}
        onBack={() => setPage('instructions')}
        onSelectCandidate={(nickname) => setSelectedCandidate(nickname)}
        onNoMatch={() => setPage('no-match')}
      />
    );
  }

  if (page === 'instructions') {
    return (
      <InstructionPage
        onBack={() => setPage('welcome')}
        onIdentify={() => setPage('possible-match')}
      />
    );
  }

  return <WelcomePage onGetStarted={() => setPage('instructions')} />;
}

export default App;
