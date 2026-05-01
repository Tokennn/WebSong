import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

import RippleGrid from '@/components/RippleGrid';
import SequentialCarousel from '@/components/SequentialCarousel';
import CraftButtonDemo from '@/components/shadcn-studio/button/button-49';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import image1 from '@/assets/create/1.png';
import image2 from '@/assets/create/2.jpg';
import image3 from '@/assets/create/3.jpg';
import image4 from '@/assets/create/4.jpg';
import { supabase } from '@/lib/supabase';
import {
  clearSpotifyAuth,
  fetchSpotifyCarouselItems,
  finalizeSpotifyAuthFromUrl,
  hasSpotifyAuth,
  isSpotifyConfigured,
  searchSpotifyItems,
  startSpotifyAuth,
  type SpotifyCardItem,
  type SpotifySelectableItem,
  type SpotifySelectableType
} from '@/lib/spotify';

type CardItem = {
  image: string;
  title: string;
  subtitle: string;
  externalUrl?: string;
};

type CreateCardRow = {
  user_id: string;
  slot_index: number;
  spotify_type: SpotifySelectableType;
  spotify_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  external_url: string;
  updated_at?: string;
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

const EMPTY_SLOTS: Array<SpotifySelectableItem | null> = [null, null, null, null, null];
const SPOTIFY_OWNER_STORAGE_KEY = 'websong.spotify.owner.v1';

function isMissingCreateCardsTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('create_cards') &&
    (message.includes('does not exist') || message.includes('relation') || message.includes('schema cache'))
  );
}

function selectableToCard(item: SpotifySelectableItem): CardItem {
  return {
    image: item.imageUrl,
    title: item.title,
    subtitle: item.subtitle,
    externalUrl: item.externalUrl
  };
}

function spotifyCardToCard(item: SpotifyCardItem): CardItem {
  return {
    image: item.imageUrl,
    title: item.title,
    subtitle: item.subtitle,
    externalUrl: item.externalUrl
  };
}

function rowToSelectable(row: CreateCardRow): SpotifySelectableItem {
  return {
    spotifyType: row.spotify_type,
    spotifyId: row.spotify_id,
    imageUrl: row.image_url,
    title: row.title,
    subtitle: row.subtitle,
    externalUrl: row.external_url
  };
}

function buildSlotsFromRows(rows: CreateCardRow[]): Array<SpotifySelectableItem | null> {
  const slots: Array<SpotifySelectableItem | null> = [...EMPTY_SLOTS];
  for (const row of rows) {
    const index = row.slot_index - 1;
    if (index < 0 || index >= slots.length) continue;
    slots[index] = rowToSelectable(row);
  }
  return slots;
}

function getSpotifyOwnerId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SPOTIFY_OWNER_STORAGE_KEY);
}

function setSpotifyOwnerId(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPOTIFY_OWNER_STORAGE_KEY, userId);
}

function clearSpotifyOwnerId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SPOTIFY_OWNER_STORAGE_KEY);
}

export default function CreatePage() {
  const [user, setUser] = useState<User | null>(null);

  const [spotifyCards, setSpotifyCards] = useState<SpotifyCardItem[]>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [loadingSpotify, setLoadingSpotify] = useState(false);

  const [dbReady, setDbReady] = useState(true);
  const [slots, setSlots] = useState<Array<SpotifySelectableItem | null>>(EMPTY_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifySelectableItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);

  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const spotifyAvailable = isSpotifyConfigured();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
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
        setSpotifyError('Spotify connecté, mais aucune donnée trouvée (artistes suivis / albums / titres aimés).');
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
        try {
          const items = await fetchSpotifyCarouselItems(5);
          if (!active) return;
          setSpotifyCards(items);
          if (items.length === 0) {
            setSpotifyError('Spotify connecté, mais aucune donnée trouvée (artistes suivis / albums / titres aimés).');
          }
        } catch (error) {
          if (!active) return;
          setSpotifyCards([]);
          setSpotifyConnected(false);
          setSpotifyError(error instanceof Error ? error.message : 'Impossible de charger les données Spotify.');
        }
      }

      if (active) {
        setLoadingSpotify(false);
      }
    };

    void initSpotify();

    return () => {
      active = false;
    };
  }, [spotifyAvailable]);

  useEffect(() => {
    if (!user) {
      setSlots([...EMPTY_SLOTS]);
      setDbReady(true);
      setInfoMessage('Connecte-toi à ton compte WebSong pour sauvegarder tes 5 cards.');
      clearSpotifyAuth();
      clearSpotifyOwnerId();
      setSpotifyConnected(false);
      setSpotifyCards([]);
      setSearchResults([]);
      return;
    }

    const spotifyOwnerId = getSpotifyOwnerId();
    if (spotifyOwnerId && spotifyOwnerId !== user.id) {
      clearSpotifyAuth();
      clearSpotifyOwnerId();
      setSpotifyConnected(false);
      setSpotifyCards([]);
      setSearchResults([]);
      setSpotifyError('Spotify déconnecté: connecte le Spotify de ce compte utilisateur.');
    }

    let active = true;
    setLoadingSlots(true);

    void supabase
      .from('create_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('slot_index', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          if (isMissingCreateCardsTableError(error)) {
            setDbReady(false);
            setInfoMessage("Table 'create_cards' absente. Exécute docs/create_cards.sql sur Supabase.");
          } else {
            setInfoMessage(error.message);
          }
          setSlots([...EMPTY_SLOTS]);
          setLoadingSlots(false);
          return;
        }

        setDbReady(true);
        setInfoMessage(null);
        setSlots(buildSlotsFromRows((data as CreateCardRow[]) ?? []));
        setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleConnectSpotify = useCallback(async () => {
    if (!user) {
      setInfoMessage('Connecte-toi à ton compte WebSong avant de connecter Spotify.');
      return;
    }

    setSpotifyError(null);
    setSpotifyOwnerId(user.id);
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
    setSearchResults([]);
  }, []);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setSpotifyError(null);
    try {
      const results = await searchSpotifyItems(query, 12);
      setSearchResults(results);
      if (results.length === 0) {
        setSpotifyError('Aucun résultat Spotify pour cette recherche.');
      }
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : 'Recherche Spotify impossible.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleAssignSlot = useCallback(
    async (slotIndex: number, item: SpotifySelectableItem) => {
      if (!user) {
        setInfoMessage('Connecte-toi à ton compte WebSong pour sauvegarder tes choix.');
        return;
      }
      if (!dbReady) return;

      setSavingSlot(slotIndex);
      setInfoMessage(null);

      const payload: CreateCardRow = {
        user_id: user.id,
        slot_index: slotIndex,
        spotify_type: item.spotifyType,
        spotify_id: item.spotifyId,
        title: item.title,
        subtitle: item.subtitle,
        image_url: item.imageUrl,
        external_url: item.externalUrl
      };

      const { data, error } = await supabase
        .from('create_cards')
        .upsert(payload, { onConflict: 'user_id,slot_index' })
        .select()
        .single();

      setSavingSlot(null);

      if (error) {
        if (isMissingCreateCardsTableError(error)) {
          setDbReady(false);
          setInfoMessage("Table 'create_cards' absente. Exécute docs/create_cards.sql sur Supabase.");
        } else {
          setInfoMessage(error.message);
        }
        return;
      }

      const updated = rowToSelectable(data as CreateCardRow);
      setSlots(current => {
        const next = [...current];
        next[slotIndex - 1] = updated;
        return next;
      });
    },
    [dbReady, user]
  );

  const handleClearSlot = useCallback(
    async (slotIndex: number) => {
      if (!user) return;

      setSavingSlot(slotIndex);
      const { error } = await supabase
        .from('create_cards')
        .delete()
        .eq('user_id', user.id)
        .eq('slot_index', slotIndex);
      setSavingSlot(null);

      if (error) {
        if (isMissingCreateCardsTableError(error)) {
          setDbReady(false);
          setInfoMessage("Table 'create_cards' absente. Exécute docs/create_cards.sql sur Supabase.");
        } else {
          setInfoMessage(error.message);
        }
        return;
      }

      setSlots(current => {
        const next = [...current];
        next[slotIndex - 1] = null;
        return next;
      });
    },
    [user]
  );

  const activeCardItems = useMemo(() => {
    const hasCustomSlots = slots.some(Boolean);
    if (hasCustomSlots) {
      return slots.map((slot, index) => (slot ? selectableToCard(slot) : DEFAULT_CARD_ITEMS[index]));
    }

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
  }, [slots, spotifyCards]);

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
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <RippleGrid
        enableRainbow={false}
        gridColor="#8ee6ff"
        rippleIntensity={0.12}
        gridSize={9}
        gridThickness={12}
        fadeDistance={1.45}
        vignetteStrength={2.15}
        glowIntensity={0.24}
        opacity={0.92}
        mouseInteraction
        mouseInteractionRadius={0.85}
      />

      <div className="pointer-events-none absolute top-6 left-6 z-20 max-w-xl sm:top-10 sm:left-10 lg:top-14 lg:left-16">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-cyan-200/80">Create</p>
        <h1 className="max-w-2xl text-4xl leading-none font-semibold text-white sm:text-5xl lg:text-6xl">
          Sound made visible.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-200 sm:text-base">
          Connect Spotify and choose the artists, albums, or tracks you want in your 5 carousel cards.
        </p>
      </div>

      <div className="relative z-30 flex min-h-screen w-full flex-col">
        <div className="px-4 pt-40 pb-2 sm:pt-52">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
            {spotifyAvailable ? (
              spotifyConnected ? (
                <>
                  <CraftButton
                    onClick={() => {
                      void loadSpotifyCards();
                    }}
                    disabled={loadingSpotify}
                    className="bg-white text-black"
                  >
                    <CraftButtonLabel>{loadingSpotify ? 'Refreshing...' : 'Refresh Spotify Cards'}</CraftButtonLabel>
                    <CraftButtonIcon>↻</CraftButtonIcon>
                  </CraftButton>
                  <button
                    type="button"
                    onClick={handleDisconnectSpotify}
                    className="rounded-full border border-white/30 px-4 py-2 text-sm text-white transition hover:border-white"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <CraftButton onClick={() => void handleConnectSpotify()} disabled={loadingSpotify} className="bg-white text-black">
                  <CraftButtonLabel>{loadingSpotify ? 'Connecting...' : 'Connect Spotify'}</CraftButtonLabel>
                  <CraftButtonIcon>↗</CraftButtonIcon>
                </CraftButton>
              )
            ) : (
              <p className="text-sm text-zinc-300">Configure `VITE_SPOTIFY_CLIENT_ID` pour activer la connexion Spotify.</p>
            )}

            {!user ? (
              <Link to="/sign-in" className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm text-cyan-200 hover:border-cyan-200">
                Sign in to save cards
              </Link>
            ) : null}
          </div>

          {spotifyConnected ? (
            <div className="mx-auto mt-3 w-full max-w-6xl rounded-2xl border border-white/15 bg-black/35 p-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map(slotNumber => (
                  <button
                    key={slotNumber}
                    type="button"
                    onClick={() => setSelectedSlot(slotNumber)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      selectedSlot === slotNumber ? 'bg-white text-black' : 'border border-white/25 text-white'
                    }`}
                  >
                    Slot {slotNumber}
                  </button>
                ))}
                {loadingSlots ? <span className="text-xs text-zinc-300">Loading saved slots…</span> : null}
                {savingSlot ? <span className="text-xs text-zinc-300">Saving slot {savingSlot}…</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {slots.map((slot, index) => (
                  <div key={`slot-preview-${index + 1}`} className="flex items-center gap-2 rounded-xl border border-white/20 px-2 py-1">
                    <span className="text-xs text-zinc-300">{index + 1}</span>
                    <span className="max-w-[180px] truncate text-xs text-white">{slot ? slot.title : 'Empty'}</span>
                    {slot ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleClearSlot(index + 1);
                        }}
                        className="text-xs text-amber-300 hover:text-amber-200"
                      >
                        clear
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                  placeholder="Search artist, album, or track"
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSearch();
                  }}
                  disabled={searching}
                  className="rounded-xl bg-white px-4 py-2 text-sm text-black disabled:opacity-60"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="mt-3 grid max-h-52 grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map(result => (
                    <button
                      key={`${result.spotifyType}:${result.spotifyId}`}
                      type="button"
                      onClick={() => {
                        void handleAssignSlot(selectedSlot, result);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 p-2 text-left transition hover:border-cyan-300"
                    >
                      <img src={result.imageUrl} alt={result.title} className="h-12 w-12 rounded-md object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{result.title}</span>
                        <span className="block truncate text-xs text-zinc-300">{result.subtitle}</span>
                      </span>
                      <span className="text-xs text-cyan-300">Use</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {spotifyError ? <p className="px-2 pt-2 text-center text-xs text-amber-300">{spotifyError}</p> : null}
          {infoMessage ? <p className="px-2 pt-1 text-center text-xs text-zinc-300">{infoMessage}</p> : null}
        </div>

        <div className="min-h-0 flex-1">
          <SequentialCarousel
            cards={cards}
            backgroundColor="transparent"
            hideBackground
            cardGap={280}
            animationDuration={600}
            sequenceDelay={80}
            animationOrigin={0}
            fadeStartIndex={2}
          />
        </div>

        <div className="pointer-events-none absolute right-6 bottom-6 z-40 sm:right-10 sm:bottom-10 lg:right-16 lg:bottom-16">
          <div className="pointer-events-auto">
            <CraftButtonDemo />
          </div>
        </div>
      </div>
    </main>
  );
}
