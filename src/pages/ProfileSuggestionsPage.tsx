import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import RubixImageCube, { type RubixProfileItem } from '@/components/ui/rubix-image-cube';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { improveAvatarUrlQuality } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';

type ProfileSuggestionRow = {
  user_id: string;
  display_name: string;
  headline: string;
  avatar_url: string;
};

const FALLBACK_SUGGESTIONS: RubixProfileItem[] = [
  {
    id: 'fallback-1',
    displayName: 'Lina Moreau',
    headline: 'Curatrice house et electronica des sessions tardives.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-01/900/1200'
  },
  {
    id: 'fallback-2',
    displayName: 'Amir Bellamy',
    headline: 'Digge des pépites rnb/alt et des voix nouvelles.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-02/900/1200'
  },
  {
    id: 'fallback-3',
    displayName: 'Nora Vega',
    headline: 'Playlists chill, ambient et lo-fi pour la concentration.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-03/900/1200'
  },
  {
    id: 'fallback-4',
    displayName: 'Yassine K.',
    headline: 'Groove funk moderne, disco edits et basslines solaires.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-04/900/1200'
  },
  {
    id: 'fallback-5',
    displayName: 'Maya Solberg',
    headline: 'Découvertes pop alternative et songwriting cinématique.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-05/900/1200'
  },
  {
    id: 'fallback-6',
    displayName: 'Théo Marchand',
    headline: 'Rap FR, drill UK et sélections new-wave hybrides.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-06/900/1200'
  },
  {
    id: 'fallback-7',
    displayName: 'Elena Rossi',
    headline: 'Indie folk, soft rock et textures analogiques.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-07/900/1200'
  },
  {
    id: 'fallback-8',
    displayName: 'Samir Okafor',
    headline: 'Amapiano, afro-house et rythmes percussifs précis.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-08/900/1200'
  },
  {
    id: 'fallback-9',
    displayName: 'Clara Neves',
    headline: 'Sélections lounge, bossa moderne et neo-soul.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-09/900/1200'
  },
  {
    id: 'fallback-10',
    displayName: 'Jules Marceau',
    headline: 'Techno mentale, breaks et textures industrielles.',
    avatarUrl: 'https://picsum.photos/seed/websong-fallback-10/900/1200'
  }
];

function toSuggestionItem(row: ProfileSuggestionRow): RubixProfileItem {
  return {
    id: row.user_id,
    displayName: row.display_name,
    headline: row.headline,
    avatarUrl: improveAvatarUrlQuality(row.avatar_url)
  };
}

export default function ProfileSuggestionsPage() {
  const [items, setItems] = useState<RubixProfileItem[]>([]);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let active = true;

    void supabase
      .rpc('get_published_profile_suggestions', { limit_count: 14 })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setItems([]);
          return;
        }

        const mapped = ((data as ProfileSuggestionRow[] | null) ?? []).map(toSuggestionItem);
        setItems(mapped);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayItems = useMemo(() => {
    if (items.length === 0) return FALLBACK_SUGGESTIONS;
    if (items.length >= 12) return items;

    const existingIds = new Set(items.map(item => item.id));
    const filler = FALLBACK_SUGGESTIONS.filter(item => !existingIds.has(item.id)).slice(0, Math.max(0, 12 - items.length));
    return [...items, ...filler];
  }, [items]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
        <button
          type="button"
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="relative z-10 inline-flex items-center gap-6 text-[clamp(2rem,4.8vw,4.25rem)] leading-none font-semibold tracking-[-0.03em] text-zinc-100"
        >
          <span>Scroll to view</span>
          <span className="text-[0.95em] leading-none">↓</span>
        </button>
      </section>

      <div ref={resultsRef}>
        <RubixImageCube items={displayItems} />
      </div>

      <section className="bg-black px-6 pb-14 pt-8">
        <div className="mx-auto flex max-w-5xl justify-center">
          <CraftButton asChild>
            <Link to="/">
              <CraftButtonIcon>
                <ArrowLeftIcon className="size-3 stroke-2" />
              </CraftButtonIcon>
              <CraftButtonLabel>Home</CraftButtonLabel>
            </Link>
          </CraftButton>
        </div>
      </section>
    </main>
  );
}
