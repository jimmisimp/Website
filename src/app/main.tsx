import '@/lib/assets/stylesheet.sass';
import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const TextGenerator = lazy(() =>
  import('@/app/components/text-generator').then(mod => ({ default: mod.TextGenerator }))
);

const MindMeld = lazy(() =>
  import('@/app/pages/mind-meld').then(mod => ({ default: mod.MindMeld }))
);

const Wedding = lazy(() =>
  import('@/app/pages/wedding').then(mod => ({ default: mod.Wedding }))
);

const PageShell = ({
  wrapper,
  children,
}: {
  wrapper: string;
  children: ReactNode;
}) => (
  <div className={`center-wrapper ${wrapper}`}>
    {children}
  </div>
);

export const Main = () => (
  <Router>
    <Suspense fallback={<PageShell wrapper="main-wrapper">Loading...</PageShell>}>
      <Routes>
        <Route
          path="/"
          element={
            <PageShell wrapper="main-wrapper">
              <img src="guy_white.svg" className="guy" alt="Website logo" />
              <div className="name">adam yuras</div>
              <div className="subheader">is creating ai-powered experiences</div>
              <TextGenerator />
            </PageShell>
          }
        />
        <Route
          path="/mindmeld"
          element={
            <PageShell wrapper="mind-meld-wrapper">
              <MindMeld />
            </PageShell>
          }
        />
        <Route
          path="/wedding"
          element={
            <PageShell wrapper="wedding-wrapper">
              <Wedding />
            </PageShell>
          }
        />
      </Routes>
    </Suspense>
  </Router>
);
