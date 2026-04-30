import { Link } from 'react-router-dom';

import { SplineSceneBasic } from '@/components/ui/spline-scene-basic';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { RobotBentoGallery } from '@/components/ui/robot-bento-gallery';
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

      <section className="bg-black pt-10 pb-16">
        <RobotBentoGallery />
      </section>
    </main>
  );
}
