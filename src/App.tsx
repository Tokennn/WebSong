import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import CommunityPage from '@/pages/CommunityPage';
import DomeGalleryPage from '@/pages/DomeGalleryPage';
import HomePage from '@/pages/HomePage';
import AboutYouPage from '@/pages/AboutYouPage';
import PostAuthPage from '@/pages/PostAuthPage';
import SignInPage from '@/pages/SignInPage';
import CreatePage from '@/pages/CreatePage';

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
    <div className="relative min-h-screen overflow-x-clip bg-white">
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
        <Route
          path="/create"
          element={
            <AnimatedPage>
              <CreatePage />
            </AnimatedPage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
