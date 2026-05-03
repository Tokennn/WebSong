import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export type ProfileSuggestionItem = {
  id: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
};

function ScrollFadeProfileRow({ item, index }: { item: ProfileSuggestionItem; index: number }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: rowRef,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.24, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.93, 1, 0.94]);
  const y = useTransform(scrollYProgress, [0, 1], [90, -70]);

  return (
    <section ref={rowRef} className="relative h-[88vh]">
      <motion.article
        style={{ opacity, scale, y }}
        className="sticky top-[8vh] mx-auto flex h-[76vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 bg-black/70 shadow-[0_35px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <div className="relative min-h-full flex-1 overflow-hidden">
          <img src={item.avatarUrl} alt={item.displayName} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />
        </div>

        <div className="relative flex w-[40%] min-w-[260px] flex-col justify-between bg-gradient-to-b from-zinc-950/95 via-zinc-900/90 to-zinc-900/95 p-8 sm:p-10">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-400 uppercase">Suggestion #{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold text-white sm:text-4xl">{item.displayName}</h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-300">{item.headline}</p>
          </div>

          <div className="inline-flex w-fit rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs tracking-[0.2em] text-zinc-200 uppercase">
            WebSong Profile
          </div>
        </div>
      </motion.article>
    </section>
  );
}

export default function ScrollFadeProfileSuggestions({ items }: { items: ProfileSuggestionItem[] }) {
  const dedupedItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter(item => {
      if (!item.avatarUrl || !item.displayName) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      {dedupedItems.map((item, index) => (
        <ScrollFadeProfileRow key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}
