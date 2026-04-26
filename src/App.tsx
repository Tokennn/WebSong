import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import CommunityPage from '@/pages/CommunityPage';
import DomeGalleryPage from '@/pages/DomeGalleryPage';
import HomePage from '@/pages/HomePage';

function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="min-h-screen will-change-[opacity]"
    >
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();
  const routeKey = location.pathname;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-zinc-950">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={`overlay-${routeKey}`}
          className="pointer-events-none fixed inset-0 z-[70] bg-gradient-to-b from-black/30 via-black/10 to-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.22, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], times: [0, 0.45, 1] }}
        />
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={routeKey}>
          <Route
            path="/"
            element={
              <AnimatedPage>
                <HomePage />
              </AnimatedPage>
            }
          />
          <Route
            path="/dome-gallery"
            element={
              <AnimatedPage>
                <DomeGalleryPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/community"
            element={
              <AnimatedPage>
                <CommunityPage />
              </AnimatedPage>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
