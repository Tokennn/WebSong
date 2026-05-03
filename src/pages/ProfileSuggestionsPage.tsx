import { useEffect, useMemo, useState } from 'react';

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
    displayName: 'WebSong Listener',
    headline: 'Curieux des nouvelles vibes électroniques.',
    avatarUrl: 'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=websong-one'
  },
  {
    id: 'fallback-2',
    displayName: 'Night Curator',
    headline: 'Sélections indie, soul et ambient pour les sessions de nuit.',
    avatarUrl: 'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=websong-two'
  },
  {
    id: 'fallback-3',
    displayName: 'Future Selector',
    headline: 'Toujours en recherche d’artistes émergents.',
    avatarUrl: 'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=websong-three'
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

  const displayItems = useMemo(() => (items.length > 0 ? items : FALLBACK_SUGGESTIONS), [items]);

  return (
    <main className="min-h-screen bg-black text-white">
      <ScrollFadeProfileSuggestions items={displayItems} />
      {infoMessage ? <p className="fixed top-4 left-4 z-40 max-w-sm text-sm text-amber-300">{infoMessage}</p> : null}
      {loading ? <p className="fixed top-4 right-4 z-40 text-sm text-zinc-400">Chargement des profils...</p> : null}
    </main>
  );
}
