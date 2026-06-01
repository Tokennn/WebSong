import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

const CommunityPage = lazy(() => import('@/pages/CommunityPage'));
const DomeGalleryPage = lazy(() => import('@/pages/DomeGalleryPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const AboutYouPage = lazy(() => import('@/pages/AboutYouPage'));
const PostAuthPage = lazy(() => import('@/pages/PostAuthPage'));
const SignInPage = lazy(() => import('@/pages/SignInPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));
const CreatePage = lazy(() => import('@/pages/CreatePage'));
const ProfileSuggestionsPage = lazy(() => import('@/pages/ProfileSuggestionsPage'));

function AnimatedPage({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reducedMotion ? 0.12 : 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="min-h-screen min-h-svh min-h-dvh will-change-[opacity]"
    >
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();
  const routeKey = location.pathname;
  const shouldReduceAnimations = useMemo(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    return prefersReducedMotion || isTouchDevice;
  }, []);

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
    <div className="relative min-h-screen min-h-svh min-h-dvh overflow-x-clip bg-white">
      <Suspense fallback={<div className="min-h-screen min-h-svh min-h-dvh w-full bg-white" />}>
        <Routes location={location} key={routeKey}>
          <Route
            path="/"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <HomePage />
              </AnimatedPage>
            }
          />
          <Route
            path="/dome-gallery"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <DomeGalleryPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/community"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <CommunityPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/about-you"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <AboutYouPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/about-you/:userId"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <AboutYouPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/sign-in"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <SignInPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/sign-up"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <SignUpPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/post-auth"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <PostAuthPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/create"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <CreatePage />
              </AnimatedPage>
            }
          />
          <Route
            path="/profile-suggestions"
            element={
              <AnimatedPage reducedMotion={shouldReduceAnimations}>
                <ProfileSuggestionsPage />
              </AnimatedPage>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
