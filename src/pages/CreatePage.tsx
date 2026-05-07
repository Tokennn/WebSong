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

type PublishedProfileRow = {
  user_id: string;
};

type CustomSection = {
  id: string;
  title: string;
  draftItem: string;
  items: string[];
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
const SPOTIFY_OWNER_STORAGE_KEY = 'websong.spotify.owner.v2';
const SPOTIFY_OWNER_STORAGE_KEY_LEGACY = 'websong.spotify.owner.v1';

function isMissingCreateCardsTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('create_cards') &&
    (message.includes('does not exist') || message.includes('relation') || message.includes('schema cache'))
  );
}

function isMissingPublishedProfilesTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('published_profiles') &&
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

  const [dbReady, setDbReady] = useState(true);
  const [slots, setSlots] = useState<Array<SpotifySelectableItem | null>>(EMPTY_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifySelectableItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(1);

  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

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
    if (!authReady) return;

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
    const spotifyAuthExists = hasSpotifyAuth();
    const expectedOwnerKey = getUserSyncOwnerKey(user);

    if (spotifyAuthExists && spotifyOwnerId !== expectedOwnerKey) {
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
  }, [authReady, user]);

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

  const handleCreateCustomSection = useCallback(() => {
    if (!user) {
      setInfoMessage('Connecte-toi à ton compte WebSong pour créer des sections personnalisées.');
      return;
    }

    const trimmedTitle = newSectionTitle.trim();
    setCustomSections(current => {
      const fallbackTitle = `Nouvelle section ${current.length + 1}`;
      return [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          title: trimmedTitle || fallbackTitle,
          draftItem: '',
          items: []
        }
      ];
    });
    setNewSectionTitle('');
  }, [newSectionTitle, user]);

  const handleSectionTitleChange = useCallback((sectionId: string, value: string) => {
    setCustomSections(current => current.map(section => (section.id === sectionId ? { ...section, title: value } : section)));
  }, []);

  const handleSectionDraftChange = useCallback((sectionId: string, value: string) => {
    setCustomSections(current => current.map(section => (section.id === sectionId ? { ...section, draftItem: value } : section)));
  }, []);

  const handleAddSectionItem = useCallback((sectionId: string) => {
    setCustomSections(current =>
      current.map(section => {
        if (section.id !== sectionId) return section;
        const nextItem = section.draftItem.trim();
        if (!nextItem) return section;
        return {
          ...section,
          items: [...section.items, nextItem],
          draftItem: ''
        };
      })
    );
  }, []);

  const handleRemoveSectionItem = useCallback((sectionId: string, itemIndex: number) => {
    setCustomSections(current =>
      current.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.filter((_, index) => index !== itemIndex)
        };
      })
    );
  }, []);

  const handleRemoveSection = useCallback((sectionId: string) => {
    setCustomSections(current => current.filter(section => section.id !== sectionId));
  }, []);

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

      {user ? (
        <section className="border-t border-white/10 bg-[#050505] px-4 py-14 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="new-custom-section" className="mb-2 block text-xs tracking-[0.18em] text-white/60 uppercase">
                  Nouvelle section
                </label>
                <input
                  id="new-custom-section"
                  value={newSectionTitle}
                  onChange={event => setNewSectionTitle(event.target.value)}
                  placeholder="Ex: Artistes à suivre, Albums du moment, etc."
                  className="h-12 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-white/40"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateCustomSection}
                className="relative inline-flex h-12 items-center justify-center rounded-2xl border border-white/35 bg-white/[0.14] px-5 text-sm font-medium tracking-wide text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-white/[0.2] active:scale-[0.98]"
              >
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(140deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0)_100%)] opacity-80" />
                <span className="relative">Créer section</span>
              </button>
            </div>

            {customSections.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-5 text-sm text-white/65">
                Ajoute une section personnalisée, puis remplis-la avec des artistes ou tout autre item.
              </p>
            ) : (
              <div className="space-y-5">
                {customSections.map(section => (
                  <article key={section.id} className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={section.title}
                        onChange={event => handleSectionTitleChange(section.id, event.target.value)}
                        className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-white/35"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(section.id)}
                        className="h-11 rounded-xl border border-red-300/30 bg-red-500/10 px-4 text-xs font-medium tracking-wide text-red-200 transition hover:bg-red-500/20"
                      >
                        Supprimer section
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        value={section.draftItem}
                        onChange={event => handleSectionDraftChange(section.id, event.target.value)}
                        onKeyDown={event => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          handleAddSectionItem(section.id);
                        }}
                        placeholder="Ajoute un artiste ou un item libre..."
                        className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-white/35"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSectionItem(section.id)}
                        className="relative inline-flex h-11 items-center justify-center rounded-xl border border-white/35 bg-white/[0.12] px-4 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-lg transition hover:bg-white/[0.18] active:scale-[0.98]"
                      >
                        <span className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(140deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0)_100%)] opacity-80" />
                        <span className="relative">Ajouter</span>
                      </button>
                    </div>

                    {section.items.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {section.items.map((item, itemIndex) => (
                          <li key={`${section.id}-${item}-${itemIndex}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs text-white/90">
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSectionItem(section.id, itemIndex)}
                              className="text-white/75 transition hover:text-white"
                              aria-label={`Retirer ${item}`}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-white/60">Aucun item pour le moment.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

    </main>
  );
}
