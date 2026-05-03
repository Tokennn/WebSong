import { Link } from 'react-router-dom';

import { SplineSceneBasic } from '@/components/ui/spline-scene-basic';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { RobotLiquidImage } from '@/components/ui/robot-liquid-image';
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
        <div className="mx-auto w-full max-w-[1720px] rounded-[18px] border border-white/10 bg-black/60 p-2 sm:p-4">
          <div className="h-[48vh] min-h-[260px] w-full overflow-hidden rounded-[14px] sm:h-[62vh]">
            <RobotLiquidImage
              image={{
                src: 'https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/components/L2g2etirT4tdjBaE4xrO/liquid-image-D7KkaJDtqD7nibKLhEzzQtKsEc02iM',
                alt: 'Liquid image effect'
              }}
              strength={0.15}
              speed={0.18}
              borderRadius={14}
            />
          </div>
          <div className="mt-4 flex justify-center sm:mt-5">
            <CraftButton asChild>
              <Link to="/dome-gallery">
                <CraftButtonLabel>Discover</CraftButtonLabel>
                <CraftButtonIcon>↗</CraftButtonIcon>
              </Link>
            </CraftButton>
          </div>
        </div>
      </section>
    </main>
  );
}
