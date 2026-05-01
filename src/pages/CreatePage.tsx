import { useCallback, useEffect, useMemo, useState } from 'react';

import SequentialCarousel from '@/components/SequentialCarousel';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import image1 from '@/assets/create/1.png';
import image2 from '@/assets/create/2.jpg';
import image3 from '@/assets/create/3.jpg';
import image4 from '@/assets/create/4.jpg';
import {
  clearSpotifyAuth,
  fetchSpotifyCarouselItems,
  finalizeSpotifyAuthFromUrl,
  hasSpotifyAuth,
  isSpotifyConfigured,
  startSpotifyAuth
} from '@/lib/spotify';

type CardItem = {
  image: string;
  title: string;
  subtitle: string;
  externalUrl?: string;
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

export default function CreatePage() {
  const [spotifyCards, setSpotifyCards] = useState<Awaited<ReturnType<typeof fetchSpotifyCarouselItems>>>([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  const spotifyAvailable = isSpotifyConfigured();

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

  const handleConnectSpotify = useCallback(async () => {
    setSpotifyError(null);
    try {
      await startSpotifyAuth();
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : 'Impossible de démarrer la connexion Spotify.');
    }
  }, []);

  const handleDisconnectSpotify = useCallback(() => {
    clearSpotifyAuth();
    setSpotifyCards([]);
    setSpotifyConnected(false);
    setSpotifyError(null);
  }, []);

  const activeCardItems = useMemo(() => {
    if (spotifyCards.length === 0) return DEFAULT_CARD_ITEMS;

    const dynamic = spotifyCards.map(item => ({
      image: item.imageUrl,
      title: item.title,
      subtitle: item.subtitle,
      externalUrl: item.externalUrl
    }));

    const merged: CardItem[] = [...dynamic];
    let fallbackCursor = 0;

    while (merged.length < 5) {
      merged.push(DEFAULT_CARD_ITEMS[fallbackCursor % DEFAULT_CARD_ITEMS.length]);
      fallbackCursor += 1;
    }

    return merged.slice(0, 5);
  }, [spotifyCards]);

  const cards = useMemo(
    () =>
      activeCardItems.map((card, index) => {
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

        if (!card.externalUrl) return content;

        return (
          <a key={`${card.image}-${card.title}-${index}`} href={card.externalUrl} target="_blank" rel="noreferrer">
            {content}
          </a>
        );
      }),
    [activeCardItems]
  );

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-black">
      <div className="z-20 flex flex-wrap items-center justify-center gap-3 px-4 pt-4 pb-2">
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
      </div>

      {spotifyError ? <p className="px-6 pb-2 text-center text-xs text-amber-300">{spotifyError}</p> : null}

      <div className="min-h-0 flex-1">
        <SequentialCarousel
          cards={cards}
          backgroundColor="#000000"
          hideBackground={false}
          cardGap={280}
          animationDuration={600}
          sequenceDelay={80}
          animationOrigin={0}
          fadeStartIndex={2}
        />
      </div>
    </main>
  );
}
