import { useEffect, useMemo, useRef, useState } from 'react';

import ScrollFadeProfileSuggestions, { type ProfileSuggestionItem } from '@/components/ScrollFadeProfileSuggestions';
import { supabase } from '@/lib/supabase';

type ProfileSuggestionRow = {
  user_id: string;
  display_name: string;
  headline: string;
  avatar_url: string;
};

const FALLBACK_SUGGESTIONS: ProfileSuggestionItem[] = [
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

function isMissingSuggestionsRpcError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return message.includes('get_published_profile_suggestions') || message.includes('published_profiles');
}

function toSuggestionItem(row: ProfileSuggestionRow): ProfileSuggestionItem {
  return {
    id: row.user_id,
    displayName: row.display_name,
    headline: row.headline,
    avatarUrl: row.avatar_url
  };
}

export default function ProfileSuggestionsPage() {
  const [items, setItems] = useState<ProfileSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void supabase
      .rpc('get_published_profile_suggestions', { limit_count: 14 })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          if (isMissingSuggestionsRpcError(error)) {
            setInfoMessage("Suggestions non configurées. Exécute docs/published_profiles.sql sur Supabase.");
          } else {
            setInfoMessage(error.message);
          }
          setItems([]);
          setLoading(false);
          return;
        }

        const mapped = ((data as ProfileSuggestionRow[] | null) ?? []).map(toSuggestionItem);
        setItems(mapped);
        setInfoMessage(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayItems = useMemo(() => {
    if (items.length === 0) return FALLBACK_SUGGESTIONS;
    if (items.length >= 8) return items;

    const existingIds = new Set(items.map(item => item.id));
    const filler = FALLBACK_SUGGESTIONS.filter(item => !existingIds.has(item.id)).slice(0, Math.max(0, 8 - items.length));
    return [...items, ...filler];
  }, [items]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.06),transparent_42%),linear-gradient(180deg,#0b0d14_0%,#090b10_100%)]" />
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
        <ScrollFadeProfileSuggestions items={displayItems} />
      </div>
      {infoMessage ? <p className="fixed top-4 left-4 z-40 max-w-sm text-sm text-amber-300">{infoMessage}</p> : null}
      {loading ? <p className="fixed top-4 right-4 z-40 text-sm text-zinc-400">Chargement des profils...</p> : null}
    </main>
  );
}
