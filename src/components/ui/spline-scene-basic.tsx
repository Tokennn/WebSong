'use client';

import { Music2, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { SplineScene } from '@/components/ui/splite';
import { Spotlight } from '@/components/ui/spotlight';

const ARTIST_IMAGE_ONE =
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=80';
const ARTIST_IMAGE_TWO =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80';

export function SplineSceneBasic() {
  return (
    <Card className="relative h-screen w-screen overflow-hidden rounded-none border-0 bg-black text-white shadow-none">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="flex h-full flex-col lg:flex-row">
        <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
            <Music2 className="h-3.5 w-3.5" />
            WebSong
          </div>
          <h1 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Interactive 3D
          </h1>
          <p className="mt-4 max-w-lg text-neutral-300">
            Bring your UI to life with beautiful 3D scenes. Create immersive experiences that capture attention and
            enhance your design.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <img
              src={ARTIST_IMAGE_ONE}
              alt="Live concert lights"
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-600"
            />
            <img
              src={ARTIST_IMAGE_TWO}
              alt="Music performance crowd"
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-600"
            />
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-200">
              <Sparkles className="h-3.5 w-3.5" />
              3D Live Mode
            </span>
          </div>
        </div>

        <div className="relative min-h-[320px] flex-1 lg:min-h-0">
          <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="h-full w-full" />
        </div>
      </div>
    </Card>
  );
}
