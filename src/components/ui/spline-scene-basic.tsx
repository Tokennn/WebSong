'use client';

import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { LandingHero } from '@/components/ui/demo';
import { SplineScene } from '@/components/ui/splite';
import { Spotlight } from '@/components/ui/spotlight';

export function SplineSceneBasic() {
  return (
    <Card className="relative h-dvh w-full overflow-hidden rounded-none border-0 bg-black text-white shadow-none">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="hidden h-full lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 min-h-0 overflow-hidden">
          <div className="h-full overflow-hidden">
            <LandingHero />
          </div>
        </div>

        <div className="relative min-h-0">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
        </div>
      </div>

      <div className="relative flex h-full flex-col lg:hidden">
        <div className="relative min-h-0 flex-1">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-28 bg-gradient-to-t from-black via-black/75 to-transparent" />
        </div>

        <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/85 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] backdrop-blur-md">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">Make your page fancy.</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Explore interactive scenes, then continue to your community profile.
          </p>
          <div className="mt-4 flex gap-2">
            <CraftButton asChild className="h-11 flex-1 rounded-xl">
              <Link to="/about-you">
                <CraftButtonLabel>About You</CraftButtonLabel>
                <CraftButtonIcon>↗</CraftButtonIcon>
              </Link>
            </CraftButton>
            <CraftButton asChild className="h-11 flex-1 rounded-xl">
              <Link to="/community">
                <CraftButtonLabel>Community</CraftButtonLabel>
                <CraftButtonIcon>↗</CraftButtonIcon>
              </Link>
            </CraftButton>
          </div>
        </div>
      </div>
    </Card>
  );
}
