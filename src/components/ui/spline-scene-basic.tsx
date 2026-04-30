'use client';

import { Card } from '@/components/ui/card';
import { LandingHero } from '@/components/ui/demo';
import { SplineScene } from '@/components/ui/splite';
import { Spotlight } from '@/components/ui/spotlight';

export function SplineSceneBasic() {
  return (
    <Card className="relative h-screen w-screen overflow-hidden rounded-none border-0 bg-black text-white shadow-none">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="grid h-full grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 h-full overflow-hidden">
          <LandingHero />
        </div>

        <div className="relative min-h-[340px] h-full lg:min-h-0">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
        </div>
      </div>
    </Card>
  );
}
