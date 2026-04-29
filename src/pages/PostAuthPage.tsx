import { Link } from 'react-router-dom';

import { SplineSceneBasic } from '@/components/ui/spline-scene-basic';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';

export default function PostAuthPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute top-5 right-5 z-20 sm:top-8 sm:right-8">
        <div className="pointer-events-auto">
          <CraftButton asChild>
            <Link to="/community">
              <CraftButtonLabel>Go to community</CraftButtonLabel>
              <CraftButtonIcon>↗</CraftButtonIcon>
            </Link>
          </CraftButton>
        </div>
      </div>

      <SplineSceneBasic />
    </main>
  );
}
