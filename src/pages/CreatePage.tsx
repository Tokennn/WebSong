import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowUpRightIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import SequentialCarousel from '@/components/SequentialCarousel';
import image1 from '@/assets/create/1.png';
import image2 from '@/assets/create/2.jpg';
import image3 from '@/assets/create/3.jpg';
import image4 from '@/assets/create/4.jpg';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { supabase } from '@/lib/supabase';
import {
  clearSpotifyAuth,
  fetchSpotifyCarouselItems,
  finalizeSpotifyAuthFromUrl,
  hasSpotifyAuth,
  isSpotifyConfigured,
  startSpotifyAuth,
  type SpotifyCardItem
} from '@/lib/spotify';

type CardItem = {
  image: string;
  title: string;
  subtitle: string;
  externalUrl?: string;
};

type PublishedProfileRow = {
  user_id: string;
};

const DEFAULT_CARD_ITEMS: CardItem[] = [
  {
    image: 'https://framerusercontent.com/images/9R8HmP4k64b7LiIOGJZKnCoGLAI.jpeg?width=1200&height=1600',
    title: 'Quora AirBeat',
    subtitle: 'Default visual'
  },
  {
    image: image1,
    title: 'Card 2',
    subtitle: 'Default visual'
  },
  {
    image: image2,
    title: 'Card 3',
    subtitle: 'Default visual'
  },
  {
    image: image3,
    title: 'Card 4',
    subtitle: 'Default visual'
  },
  {
    image: image4,
    title: 'Card 5',
    subtitle: 'Default visual'
  }
];

const SPOTIFY_OWNER_STORAGE_KEY = 'websong.spotify.owner.v2';
const SPOTIFY_OWNER_STORAGE_KEY_LEGACY = 'websong.spotify.owner.v1';

function isMissingPublishedProfilesTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('published_profiles') &&
    (message.includes('does not exist') || message.includes('relation') || message.includes('schema cache'))
  );
}

function spotifyCardToCard(item: SpotifyCardItem): CardItem {
  return {
    image: item.imageUrl,
    title: item.title,
    subtitle: item.subtitle,
    externalUrl: item.externalUrl
  };
}

function getUserSyncOwnerKey(user: User): string {
  const email = user.email?.trim().toLowerCase();
  return email && email.length > 0 ? `email:${email}` : `id:${user.id}`;
}

function getSpotifyOwnerId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SPOTIFY_OWNER_STORAGE_KEY) ?? localStorage.getItem(SPOTIFY_OWNER_STORAGE_KEY_LEGACY);
}

function setSpotifyOwnerId(ownerKey: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPOTIFY_OWNER_STORAGE_KEY, ownerKey);
  localStorage.removeItem(SPOTIFY_OWNER_STORAGE_KEY_LEGACY);
}

function clearSpotifyOwnerId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SPOTIFY_OWNER_STORAGE_KEY);
  localStorage.removeItem(SPOTIFY_OWNER_STORAGE_KEY_LEGACY);
}

export default function CreatePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [spotifyCards, setSpotifyCards] = useState<SpotifyCardItem[]>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const spotifyAvailable = isSpotifyConfigured();

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadSpotifyCards = useCallback(async () => {
    setLoadingSpotify(true);
    setSpotifyError(null);

    try {
      const items = await fetchSpotifyCarouselItems(5);
      setSpotifyCards(items);
      setSpotifyConnected(hasSpotifyAuth());

      if (items.length === 0) {
        setSpotifyError('Spotify connecté, mais aucune écoute récente trouvée.');
      }
    } catch (error) {
      setSpotifyConnected(false);
      setSpotifyCards([]);
      setSpotifyError(error instanceof Error ? error.message : 'Impossible de charger les données Spotify.');
    } finally {
      setLoadingSpotify(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initSpotify = async () => {
      if (!spotifyAvailable) return;

      setLoadingSpotify(true);
      const result = await finalizeSpotifyAuthFromUrl();
      if (!active) return;

      if (result.error) {
        setSpotifyError(result.error);
      }

      const connected = result.connected || hasSpotifyAuth();
      setSpotifyConnected(connected);

      if (connected) {
        await loadSpotifyCards();
      } else if (active) {
        setLoadingSpotify(false);
      }
    };

    void initSpotify();

    return () => {
      active = false;
    };
  }, [loadSpotifyCards, spotifyAvailable]);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setInfoMessage('Connecte-toi à ton compte WebSong pour voir tes 5 derniers artistes écoutés.');
      clearSpotifyAuth();
      clearSpotifyOwnerId();
      setSpotifyConnected(false);
      setSpotifyCards([]);
      setSpotifyError(null);
      return;
    }

    const spotifyOwnerId = getSpotifyOwnerId();
    const spotifyAuthExists = hasSpotifyAuth();
    const expectedOwnerKey = getUserSyncOwnerKey(user);

    if (spotifyAuthExists && spotifyOwnerId !== expectedOwnerKey) {
      clearSpotifyAuth();
      clearSpotifyOwnerId();
      setSpotifyConnected(false);
      setSpotifyCards([]);
      setSpotifyError('Spotify déconnecté: connecte le Spotify de ce compte utilisateur.');
      return;
    }

    setInfoMessage(null);

    if (spotifyAuthExists) {
      void loadSpotifyCards();
    }
  }, [authReady, loadSpotifyCards, user]);

  const handleConnectSpotify = useCallback(async () => {
    if (!user) {
      setInfoMessage('Connecte-toi à ton compte WebSong avant de connecter Spotify.');
      return;
    }

    setSpotifyError(null);
    setSpotifyOwnerId(getUserSyncOwnerKey(user));
    try {
      await startSpotifyAuth();
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : 'Impossible de démarrer la connexion Spotify.');
    }
  }, [user]);

  const handleDisconnectSpotify = useCallback(() => {
    clearSpotifyAuth();
    clearSpotifyOwnerId();
    setSpotifyCards([]);
    setSpotifyConnected(false);
    setSpotifyError(null);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!user) {
      setInfoMessage('Connecte-toi à ton compte WebSong avant de publier ton profil.');
      return;
    }

    if (!spotifyConnected) {
      setInfoMessage('Connecte Spotify avant de publier ton profil.');
      return;
    }

    setPublishing(true);
    setInfoMessage(null);

    const { error } = await supabase
      .from('published_profiles')
      .upsert(({ user_id: user.id } satisfies PublishedProfileRow), { onConflict: 'user_id' });

    setPublishing(false);

    if (error) {
      if (isMissingPublishedProfilesTableError(error)) {
        setInfoMessage("Table 'published_profiles' absente. Exécute docs/published_profiles.sql sur Supabase.");
      } else {
        setInfoMessage(error.message);
      }
      return;
    }

    navigate('/profile-suggestions');
  }, [navigate, spotifyConnected, user]);

  const activeCardItems = useMemo(() => {
    if (spotifyCards.length > 0) {
      const fromSpotify = spotifyCards.map(spotifyCardToCard);
      const merged: CardItem[] = [...fromSpotify];
      let fallbackCursor = 0;
      while (merged.length < 5) {
        merged.push(DEFAULT_CARD_ITEMS[fallbackCursor % DEFAULT_CARD_ITEMS.length]);
        fallbackCursor += 1;
      }
      return merged.slice(0, 5);
    }

    return DEFAULT_CARD_ITEMS;
  }, [spotifyCards]);

  const cards = useMemo(
    () =>
      activeCardItems.map((card, index) => {
        const cardKey = `${card.image}-${card.title}-${index}`;
        const content = (
          <article
            style={{
              width: 320,
              height: 420,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              background: '#000000'
            }}
          >
            <img
              src={card.image}
              alt={card.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 18,
                right: 18,
                bottom: 16,
                color: 'white',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{card.subtitle}</p>
              <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 600 }}>{card.title}</p>
            </div>
          </article>
        );

        return card.externalUrl ? (
          <a key={cardKey} href={card.externalUrl} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          <div key={cardKey}>{content}</div>
        );
      }),
    [activeCardItems]
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative h-[100dvh] overflow-hidden">
        <div className="relative z-30 h-full w-full">
          <div className="pointer-events-none absolute top-6 left-1/2 z-40 -translate-x-1/2 sm:top-10">
            <div className="pointer-events-auto flex items-center gap-3">
              <CraftButton
                onClick={spotifyConnected ? handleDisconnectSpotify : handleConnectSpotify}
                disabled={loadingSpotify || !spotifyAvailable}
                hoverTheme="spotify"
                className="h-11 px-5"
              >
                <CraftButtonLabel>{loadingSpotify ? 'Connexion...' : spotifyConnected ? 'Se deconnecter' : 'Se connecter'}</CraftButtonLabel>
                <CraftButtonIcon>
                  <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                </CraftButtonIcon>
              </CraftButton>
              <CraftButton asChild className="h-11 px-5">
                <Link to="/post-auth">
                  <CraftButtonLabel>Présentation</CraftButtonLabel>
                  <CraftButtonIcon>
                    <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                  </CraftButtonIcon>
                </Link>
              </CraftButton>
            </div>
          </div>

          <div className="absolute inset-0">
            <SequentialCarousel
              cards={cards}
              backgroundColor="#000000"
              cardGap={280}
              animationDuration={600}
              sequenceDelay={80}
              animationOrigin={0}
              fadeStartIndex={2}
              showNavigation
            />
          </div>

          {user && spotifyConnected ? (
            <div className="pointer-events-none absolute bottom-8 left-1/2 z-40 -translate-x-1/2">
              <div className="pointer-events-auto">
                <CraftButton type="button" onClick={handlePublish} disabled={publishing} className="h-12 px-7">
                  <CraftButtonLabel>{publishing ? 'Publishing...' : 'Publish'}</CraftButtonLabel>
                  <CraftButtonIcon>
                    <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                  </CraftButtonIcon>
                </CraftButton>
              </div>
            </div>
          ) : null}

          {infoMessage || spotifyError ? (
            <div className="pointer-events-none absolute right-4 bottom-3 left-4 z-40 mx-auto max-w-2xl rounded-xl border border-white/15 bg-black/55 px-4 py-2 text-center text-xs text-white/80 backdrop-blur-md">
              {infoMessage ? <p className="m-0 text-amber-300">{infoMessage}</p> : null}
              {spotifyError ? <p className="m-0 text-red-300">{spotifyError}</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
