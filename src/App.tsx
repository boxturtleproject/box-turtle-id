import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { WelcomePage } from './public/WelcomePage';
import { InstructionPage } from './public/InstructionPage';
import { PossibleMatchPage } from './public/PossibleMatchPage';
import { MatchProfilePage } from './public/MatchProfilePage';
import { MatchEncounterPage } from './public/MatchEncounterPage';
import { NoMatchPage } from './public/NoMatchPage';
import { NewTurtleSubmissionPage } from './public/NewTurtleSubmissionPage';
import { ThankYouPage } from './public/ThankYouPage';
import { AboutPage } from './public/AboutPage';

// Lazy-load admin routes
const AdminDashboard = lazy(() => import('./admin/Dashboard'));
const AdminCompare = lazy(() => import('./admin/Compare'));
const AdminSearch = lazy(() => import('./admin/Search'));
const AdminTurtleProfile = lazy(() => import('./admin/TurtleProfile'));
const AdminSettings = lazy(() => import('./admin/Settings'));
const AdminSync = lazy(() => import('./admin/Sync'));
const AdminMap = lazy(() => import('./admin/Map'));
const AdminEncounters = lazy(() => import('./admin/Encounters'));

function AdminFallback() {
  return <div className="p-8 text-gray-500">Loading...</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/instructions" element={<InstructionPage />} />
      <Route path="/results" element={<PossibleMatchPage />} />
      <Route path="/results/no-match" element={<NoMatchPage />} />
      <Route path="/results/new-turtle" element={<NewTurtleSubmissionPage />} />
      <Route path="/results/:turtleId" element={<MatchProfilePage />} />
      <Route path="/encounter" element={<MatchEncounterPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Admin routes (lazy-loaded) */}
      <Route
        path="/admin"
        element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>}
      />
      <Route
        path="/admin/compare"
        element={<Suspense fallback={<AdminFallback />}><AdminCompare /></Suspense>}
      />
      <Route
        path="/admin/search"
        element={<Suspense fallback={<AdminFallback />}><AdminSearch /></Suspense>}
      />
      <Route
        path="/admin/turtles/:id"
        element={<Suspense fallback={<AdminFallback />}><AdminTurtleProfile /></Suspense>}
      />
      <Route
        path="/admin/settings"
        element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>}
      />
      <Route
        path="/admin/sync"
        element={<Suspense fallback={<AdminFallback />}><AdminSync /></Suspense>}
      />
      <Route
        path="/admin/map"
        element={<Suspense fallback={<AdminFallback />}><AdminMap /></Suspense>}
      />
      <Route
        path="/admin/encounters"
        element={<Suspense fallback={<AdminFallback />}><AdminEncounters /></Suspense>}
      />
    </Routes>
  );
}
