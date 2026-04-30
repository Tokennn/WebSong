import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import CommunityPage from '@/pages/CommunityPage';
import DomeGalleryPage from '@/pages/DomeGalleryPage';
import HomePage from '@/pages/HomePage';
import AboutYouPage from '@/pages/AboutYouPage';
import PostAuthPage from '@/pages/PostAuthPage';
import SignInPage from '@/pages/SignInPage';

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
  const isSignInRoute = routeKey === '/sign-in';

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (isTouchDevice) return;

    const lenis = new Lenis({
      smoothWheel: true,
      syncTouch: false,
      syncTouchLerp: 0.08,
      touchInertiaExponent: 1.7,
      duration: 1.15,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1
    });

    let rafId = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-zinc-950">
      {!isSignInRoute ? (
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
      ) : null}

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
          <Route
            path="/about-you"
            element={
              <AnimatedPage>
                <AboutYouPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/sign-in"
            element={
              <AnimatedPage>
                <SignInPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/post-auth"
            element={
              <AnimatedPage>
                <PostAuthPage />
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
