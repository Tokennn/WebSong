import RippleGrid from './components/RippleGrid';
import CraftButtonDemo from '@/components/shadcn-studio/button/button-49';

function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="relative min-h-screen overflow-hidden">
        <RippleGrid
          enableRainbow={false}
          gridColor="#8ee6ff"
          rippleIntensity={0.12}
          gridSize={9}
          gridThickness={12}
          fadeDistance={1.45}
          vignetteStrength={2.15}
          glowIntensity={0.24}
          opacity={0.95}
          mouseInteraction
          mouseInteractionRadius={0.85}
        />

        <div className="relative z-10 flex min-h-screen items-center px-6 pt-16 pb-28 sm:px-10 sm:pb-32 lg:px-16 lg:pb-40">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-cyan-200/80">
              WebSong
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-none text-white sm:text-7xl">
              Sound made visible.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
              An illustration of the playlists and artists on my Spotify.
            </p>
          </div>
        </div>

        <div className="absolute right-6 bottom-6 z-20 sm:right-10 sm:bottom-10 lg:right-16 lg:bottom-16">
          <CraftButtonDemo />
        </div>
      </section>
    </main>
  );
}

export default App;
