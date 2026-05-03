import { Link } from 'react-router-dom';

import { SplineSceneBasic } from '@/components/ui/spline-scene-basic';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { RobotStaggered3DGrid } from '@/components/ui/robot-staggered-3d-grid';

export default function PostAuthPage() {
  return (
    <main className="relative min-h-screen w-full bg-black text-white">
      <div className="pointer-events-none fixed top-8 right-8 z-30 hidden sm:block">
        <div className="pointer-events-auto">
          <CraftButton asChild>
            <Link to="/community">
              <CraftButtonLabel>Go to community</CraftButtonLabel>
              <CraftButtonIcon>↗</CraftButtonIcon>
            </Link>
          </CraftButton>
        </div>
      </div>

      <section className="h-dvh">
        <SplineSceneBasic />
      </section>

      <section className="bg-black">
        <RobotStaggered3DGrid />
      </section>

      <section className="bg-black px-4 pt-10 pb-24 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1720px] justify-center">
          <CraftButton type="button" aria-label="Discover">
            <CraftButtonLabel>Discover</CraftButtonLabel>
            <CraftButtonIcon>↗</CraftButtonIcon>
          </CraftButton>
        </div>
      </section>
    </main>
  );
}
