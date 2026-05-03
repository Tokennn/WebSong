import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import ScrollFadeProfileSuggestions, { type ProfileSuggestionItem } from '@/components/ScrollFadeProfileSuggestions';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
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
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(29,185,84,0.22),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(80,70,255,0.2),transparent_40%),#040404] px-4 pt-24 pb-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs tracking-[0.32em] text-zinc-400 uppercase">WebSong Discover</p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold sm:text-6xl">Profils recommandés pour ta prochaine découverte.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Ce flux reprend les profils publiés par les membres connectés à la plateforme et les affiche avec un effet scroll/fade.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CraftButton asChild className="h-11 px-5">
              <Link to="/create">
                <CraftButtonLabel>Retour Create</CraftButtonLabel>
                <CraftButtonIcon>
                  <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                </CraftButtonIcon>
              </Link>
            </CraftButton>
            <CraftButton asChild className="h-11 px-5">
              <Link to="/community">
                <CraftButtonLabel>Community</CraftButtonLabel>
                <CraftButtonIcon>
                  <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                </CraftButtonIcon>
              </Link>
            </CraftButton>
          </div>

          {infoMessage ? <p className="mt-6 text-sm text-amber-300">{infoMessage}</p> : null}
          {loading ? <p className="mt-6 text-sm text-zinc-400">Chargement des profils...</p> : null}
        </div>
      </section>

      <section className="pt-10">
        <ScrollFadeProfileSuggestions items={displayItems} />
      </section>
    </main>
  );
}
