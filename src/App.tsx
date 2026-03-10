// src/App.tsx
import { useState } from 'react';
import { WelcomePage } from './pages/WelcomePage';
import { InstructionPage } from './pages/InstructionPage';
import type { SubmittedPhotos } from './pages/InstructionPage';
import { MatchProfilePage } from './pages/MatchProfilePage';
import { PossibleMatchPage, type CandidateTurtle } from './pages/PossibleMatchPage';
import { DevRoutingModal } from './components/DevRoutingModal';
import { NoMatchPage } from './pages/NoMatchPage';
import { NewTurtleSubmissionPage } from './pages/NewTurtleSubmissionPage';
import { AboutPage } from './pages/AboutPage';
import { MatchEncounterPage } from './pages/MatchEncounterPage';
import { ThankYouPage } from './pages/ThankYouPage';

type Page = 'welcome' | 'instructions' | 'match' | 'possible-match' | 'no-match' | 'new-turtle' | 'about' | 'match-encounter' | 'thank-you';

export type Site = 'patuxent' | 'wallkill';

const SITE_NAMES: Record<Site, string> = {
  patuxent: 'Patuxent Research Refuge',
  wallkill: 'Wallkill Valley Land Trust',
};

// Hardcoded candidates for demo — replace with algorithm output when ready
const DEMO_CANDIDATES: CandidateTurtle[] = [
  { turtleNickname: 'T106', confidence: 'high' },
  { turtleNickname: 'T107', confidence: 'medium' },
  { turtleNickname: 'T108', confidence: 'low' },
];

function App() {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [submittedPhotos, setSubmittedPhotos] = useState<SubmittedPhotos | null>(null);
  const [returnPage, setReturnPage] = useState<Page>('welcome');
  const [confirmedTurtle, setConfirmedTurtle] = useState<string | null>(null);

  const siteName = selectedSite ? SITE_NAMES[selectedSite] : '';

  const handleAbout = () => {
    setReturnPage(page);
    setPage('about');
  };

  const handleWelcome = () => {
    setSelectedCandidate(null);
    setConfirmedTurtle(null);
    setPage('welcome');
  };

  if (page === 'about') {
    return <AboutPage onBack={() => setPage(returnPage)} />;
  }

  if (page === 'match') {
    const matchNickname = 'T106'; // TODO: replace with real match result
    return (
      <MatchProfilePage
        turtleNickname={matchNickname}
        onBack={() => setPage('instructions')}
        onConfirm={() => { setConfirmedTurtle(matchNickname); setPage('match-encounter'); }}
        onNotMyTurtle={() => setPage('instructions')}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        siteName={siteName}
        site={selectedSite!}
      />
    );
  }

  if (page === 'possible-match') {
    if (selectedCandidate) {
      return (
        <MatchProfilePage
          turtleNickname={selectedCandidate}
          onBack={() => setSelectedCandidate(null)}
          onConfirm={() => { setConfirmedTurtle(selectedCandidate); setPage('match-encounter'); }}
          onNotMyTurtle={() => setSelectedCandidate(null)}
          onAbout={handleAbout}
          onWelcome={handleWelcome}
          siteName={siteName}
          site={selectedSite!}
        />
      );
    }
    return (
      <PossibleMatchPage
        candidates={DEMO_CANDIDATES}
        onBack={() => setPage('instructions')}
        onSelectCandidate={(nickname) => setSelectedCandidate(nickname)}
        onNoMatch={() => setPage('no-match')}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        siteName={siteName}
        site={selectedSite!}
      />
    );
  }

  if (page === 'new-turtle') {
    return (
      <NewTurtleSubmissionPage
        photos={submittedPhotos}
        onBack={() => setPage('no-match')}
        onSubmitted={() => setPage('thank-you')}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        siteName={siteName}
        site={selectedSite!}
      />
    );
  }

  if (page === 'match-encounter') {
    return (
      <MatchEncounterPage
        // confirmedTurtle is always set by onConfirm before this page renders
        turtleNickname={confirmedTurtle!}
        onBack={() => {
          if (selectedCandidate) {
            setPage('possible-match');
          } else {
            setPage('match');
          }
        }}
        onSubmitted={() => setPage('thank-you')}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        siteName={siteName}
        site={selectedSite!}
      />
    );
  }

  if (page === 'thank-you') {
    return (
      <ThankYouPage
        onDone={() => {
          setSelectedCandidate(null);
          setConfirmedTurtle(null);
          setPage('instructions');
        }}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        site={selectedSite!}
      />
    );
  }

  if (page === 'no-match') {
    return (
      <NoMatchPage
        onRetakePhotos={() => setPage('instructions')}
        onSubmitNewTurtle={() => setPage('new-turtle')}
        onAbout={handleAbout}
        onWelcome={handleWelcome}
        siteName={siteName}
        site={selectedSite!}
      />
    );
  }

  if (page === 'instructions') {
    return (
      <>
        <InstructionPage
          onBack={() => setPage('welcome')}
          onIdentify={(photos) => {
            setSubmittedPhotos(photos);
            if (import.meta.env.DEV) {
              setShowDevModal(true);
            } else {
              setPage('possible-match');
            }
          }}
          siteName={siteName}
          site={selectedSite!}
          onAbout={handleAbout}
          onWelcome={handleWelcome}
        />
        {import.meta.env.DEV && showDevModal && (
          <DevRoutingModal
            onConfirmedMatch={() => {
              setShowDevModal(false);
              setPage('match');
            }}
            onPossibleMatch={() => {
              setShowDevModal(false);
              setPage('possible-match');
            }}
            onNoMatch={() => {
              setShowDevModal(false);
              setPage('no-match');
            }}
            onDismiss={() => setShowDevModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <WelcomePage
      onSelectSite={(site) => {
        setSelectedSite(site);
        setPage('instructions');
      }}
      onAbout={handleAbout}
    />
  );
}

export default App;
