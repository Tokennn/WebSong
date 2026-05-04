import { Link } from 'react-router-dom';

import { SplineSceneBasic } from '@/components/ui/spline-scene-basic';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';

export default function PostAuthPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black text-white">
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
    </main>
  );
}
