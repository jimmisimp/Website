import '@/lib/assets/stylesheet.sass';
import { Suspense, lazy, memo, type ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from '@/app/pages';

const Wedding = lazy(() =>
  import('@/app/pages/wedding').then(mod => ({ default: mod.Wedding }))
);
const Resume = lazy(() =>
  import('@/app/pages/resume').then(mod => ({ default: mod.Resume }))
);

const PageShell = memo(({
  wrapper,
  children,
}: {
  wrapper: string;
  children: ReactNode;
}) => (
  <div className={`page-shell ${wrapper}`}>
    {children}
  </div>
));

const ScrollToTop = memo(() => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
});

export const Main = memo(() => (
  <Router>
    <Suspense fallback={<PageShell wrapper="page-shell--loading">Loading...</PageShell>}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PageShell wrapper="page-shell--home"><Home /></PageShell>} />
        <Route path="/mindmeld" element={<Navigate to="/" replace />} />
        <Route
          path="/wedding"
          element={
            <PageShell wrapper="page-shell--wedding">
              <Wedding />
            </PageShell>
          }
        />
        <Route
          path="/resume"
          element={
            <PageShell wrapper="page-shell--resume">
              <Resume />
            </PageShell>
          }
        />
      </Routes>
    </Suspense>
  </Router>
));
