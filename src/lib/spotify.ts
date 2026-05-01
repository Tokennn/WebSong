const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SPOTIFY_AUTH_STORAGE_KEY = 'websong.spotify.auth.v1';
const SPOTIFY_OAUTH_STATE_KEY = 'websong.spotify.oauth.state';
const SPOTIFY_OAUTH_VERIFIER_KEY = 'websong.spotify.oauth.verifier';

const SPOTIFY_SCOPES = ['user-follow-read', 'user-library-read'];

type StoredSpotifyAuth = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

type SpotifyImage = {
  url: string;
};

export type SpotifyCardItem = {
  imageUrl: string;
  title: string;
  subtitle: string;
  externalUrl: string;
};

export type SpotifySelectableType = 'artist' | 'album' | 'track';

export type SpotifySelectableItem = SpotifyCardItem & {
  spotifyType: SpotifySelectableType;
  spotifyId: string;
};

type FollowedArtistsResponse = {
  artists: {
    items: Array<{
      name: string;
      images: SpotifyImage[];
      external_urls?: { spotify?: string };
    }>;
  };
};

type SavedAlbumsResponse = {
  items: Array<{
    album: {
      name: string;
      images: SpotifyImage[];
      artists: Array<{ name: string }>;
      external_urls?: { spotify?: string };
    };
  }>;
};

type SavedTracksResponse = {
  items: Array<{
    track: {
      name: string;
      album: {
        images: SpotifyImage[];
      };
      artists: Array<{ name: string }>;
      external_urls?: { spotify?: string };
    };
  }>;
};

type SearchResponse = {
  artists?: {
    items: Array<{
      id: string;
      name: string;
      images: SpotifyImage[];
      external_urls?: { spotify?: string };
    }>;
  };
  albums?: {
    items: Array<{
      id: string;
      name: string;
      images: SpotifyImage[];
      artists: Array<{ name: string }>;
      external_urls?: { spotify?: string };
    }>;
  };
  tracks?: {
    items: Array<{
      id: string;
      name: string;
      album: {
        images: SpotifyImage[];
      };
      artists: Array<{ name: string }>;
      external_urls?: { spotify?: string };
    }>;
  };
};

type FinalizeSpotifyAuthResult = {
  handled: boolean;
  connected: boolean;
  error?: string;
};

const getSpotifyClientId = () => (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

const getSpotifyRedirectUri = () =>
  typeof window === 'undefined' ? '' : `${window.location.origin}/create`;

const base64UrlEncode = (input: Uint8Array) => {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const createRandomString = (length = 64) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < values.length; i += 1) result += charset[values[i] % charset.length];
  return result;
};

const createCodeChallenge = async (verifier: string) => {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64UrlEncode(new Uint8Array(digest));
};

const persistAuth = (payload: SpotifyTokenResponse, previousRefreshToken?: string) => {
  const next: StoredSpotifyAuth = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + payload.expires_in * 1000 - 30_000,
    tokenType: payload.token_type,
    scope: payload.scope
  };
  localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(next));
};

const loadAuth = (): StoredSpotifyAuth | null => {
  try {
    const raw = localStorage.getItem(SPOTIFY_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSpotifyAuth;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const cleanAuthUrl = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
};

const exchangeAuthCodeForToken = async (code: string, verifier: string) => {
  const clientId = getSpotifyClientId();
  const redirectUri = getSpotifyRedirectUri();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Failed to exchange Spotify auth code.');
  }

  return (await response.json()) as SpotifyTokenResponse;
};

const refreshSpotifyToken = async (auth: StoredSpotifyAuth) => {
  if (!auth.refreshToken) return null;

  const clientId = getSpotifyClientId();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
    client_id: clientId
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    localStorage.removeItem(SPOTIFY_AUTH_STORAGE_KEY);
    return null;
  }

  const payload = (await response.json()) as SpotifyTokenResponse;
  persistAuth(payload, auth.refreshToken);
  return loadAuth();
};

const spotifyRequest = async <T>(path: string, accessToken: string): Promise<T> => {
  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Spotify request failed (${response.status}).`);
  }

  return (await response.json()) as T;
};

export const isSpotifyConfigured = () => getSpotifyClientId().length > 0;

export const hasSpotifyAuth = () => loadAuth() !== null;

export const clearSpotifyAuth = () => {
  localStorage.removeItem(SPOTIFY_AUTH_STORAGE_KEY);
  localStorage.removeItem(SPOTIFY_OAUTH_STATE_KEY);
  localStorage.removeItem(SPOTIFY_OAUTH_VERIFIER_KEY);
};

export const startSpotifyAuth = async () => {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID.');
  if (typeof window === 'undefined') throw new Error('Spotify auth is browser-only.');

  const verifier = createRandomString(96);
  const challenge = await createCodeChallenge(verifier);
  const state = createRandomString(24);
  const redirectUri = getSpotifyRedirectUri();

  localStorage.setItem(SPOTIFY_OAUTH_VERIFIER_KEY, verifier);
  localStorage.setItem(SPOTIFY_OAUTH_STATE_KEY, state);

  const authUrl = new URL(`${SPOTIFY_ACCOUNTS_BASE}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('state', state);

  window.location.assign(authUrl.toString());
};

export const finalizeSpotifyAuthFromUrl = async (): Promise<FinalizeSpotifyAuthResult> => {
  if (typeof window === 'undefined') return { handled: false, connected: false };

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const oauthError = params.get('error');

  if (!code && !oauthError) return { handled: false, connected: hasSpotifyAuth() };

  if (oauthError) {
    cleanAuthUrl();
    return { handled: true, connected: false, error: `Spotify auth error: ${oauthError}` };
  }

  const expectedState = localStorage.getItem(SPOTIFY_OAUTH_STATE_KEY);
  const verifier = localStorage.getItem(SPOTIFY_OAUTH_VERIFIER_KEY);

  if (!state || state !== expectedState) {
    cleanAuthUrl();
    return { handled: true, connected: false, error: 'Spotify auth state is invalid. Retry connection.' };
  }

  if (!verifier) {
    cleanAuthUrl();
    return { handled: true, connected: false, error: 'Spotify code verifier is missing. Retry connection.' };
  }

  try {
    const token = await exchangeAuthCodeForToken(code!, verifier);
    persistAuth(token);
    cleanAuthUrl();
    localStorage.removeItem(SPOTIFY_OAUTH_STATE_KEY);
    localStorage.removeItem(SPOTIFY_OAUTH_VERIFIER_KEY);
    return { handled: true, connected: true };
  } catch (error) {
    cleanAuthUrl();
    return {
      handled: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Unable to finish Spotify authentication.'
    };
  }
};

export const getSpotifyAccessToken = async (): Promise<string | null> => {
  const auth = loadAuth();
  if (!auth) return null;

  if (Date.now() < auth.expiresAt) return auth.accessToken;

  const refreshed = await refreshSpotifyToken(auth);
  return refreshed?.accessToken ?? null;
};

const toArtistCards = (payload: FollowedArtistsResponse): SpotifyCardItem[] =>
  payload.artists.items
    .map(artist => ({
      imageUrl: artist.images[0]?.url ?? '',
      title: artist.name,
      subtitle: 'Artist',
      externalUrl: artist.external_urls?.spotify ?? ''
    }))
    .filter(item => item.imageUrl && item.externalUrl);

const toAlbumCards = (payload: SavedAlbumsResponse): SpotifyCardItem[] =>
  payload.items
    .map(({ album }) => ({
      imageUrl: album.images[0]?.url ?? '',
      title: album.name,
      subtitle: `${album.artists.map(artist => artist.name).join(', ')} • Album`,
      externalUrl: album.external_urls?.spotify ?? ''
    }))
    .filter(item => item.imageUrl && item.externalUrl);

const toTrackCards = (payload: SavedTracksResponse): SpotifyCardItem[] =>
  payload.items
    .map(({ track }) => ({
      imageUrl: track.album.images[0]?.url ?? '',
      title: track.name,
      subtitle: `${track.artists.map(artist => artist.name).join(', ')} • Track`,
      externalUrl: track.external_urls?.spotify ?? ''
    }))
    .filter(item => item.imageUrl && item.externalUrl);

export const fetchSpotifyCarouselItems = async (maxItems = 5): Promise<SpotifyCardItem[]> => {
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) return [];

  const [artistsPayload, albumsPayload, tracksPayload] = await Promise.all([
    spotifyRequest<FollowedArtistsResponse>('/me/following?type=artist&limit=20', accessToken),
    spotifyRequest<SavedAlbumsResponse>('/me/albums?limit=20', accessToken),
    spotifyRequest<SavedTracksResponse>('/me/tracks?limit=20', accessToken)
  ]);

  const artists = toArtistCards(artistsPayload);
  const albums = toAlbumCards(albumsPayload);
  const tracks = toTrackCards(tracksPayload);
  const buckets = [artists, albums, tracks];

  const selected: SpotifyCardItem[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  while (selected.length < maxItems && buckets.some(bucket => cursor < bucket.length)) {
    for (const bucket of buckets) {
      const candidate = bucket[cursor];
      if (!candidate) continue;
      const key = `${candidate.imageUrl}|${candidate.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(candidate);
      if (selected.length >= maxItems) break;
    }
    cursor += 1;
  }

  return selected.slice(0, maxItems);
};

export const searchSpotifyItems = async (query: string, limit = 12): Promise<SpotifySelectableItem[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) return [];

  const params = new URLSearchParams({
    q: trimmedQuery,
    type: 'artist,album,track',
    limit: String(Math.max(1, Math.min(limit, 20)))
  });

  const payload = await spotifyRequest<SearchResponse>(`/search?${params.toString()}`, accessToken);

  const artists: SpotifySelectableItem[] =
    payload.artists?.items
      ?.map(artist => ({
        spotifyType: 'artist' as const,
        spotifyId: artist.id,
        imageUrl: artist.images[0]?.url ?? '',
        title: artist.name,
        subtitle: 'Artist',
        externalUrl: artist.external_urls?.spotify ?? ''
      }))
      .filter(item => item.spotifyId && item.imageUrl && item.externalUrl) ?? [];

  const albums: SpotifySelectableItem[] =
    payload.albums?.items
      ?.map(album => ({
        spotifyType: 'album' as const,
        spotifyId: album.id,
        imageUrl: album.images[0]?.url ?? '',
        title: album.name,
        subtitle: `${album.artists.map(artist => artist.name).join(', ')} • Album`,
        externalUrl: album.external_urls?.spotify ?? ''
      }))
      .filter(item => item.spotifyId && item.imageUrl && item.externalUrl) ?? [];

  const tracks: SpotifySelectableItem[] =
    payload.tracks?.items
      ?.map(track => ({
        spotifyType: 'track' as const,
        spotifyId: track.id,
        imageUrl: track.album.images[0]?.url ?? '',
        title: track.name,
        subtitle: `${track.artists.map(artist => artist.name).join(', ')} • Track`,
        externalUrl: track.external_urls?.spotify ?? ''
      }))
      .filter(item => item.spotifyId && item.imageUrl && item.externalUrl) ?? [];

  const byPriority = [artists, albums, tracks];
  const out: SpotifySelectableItem[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  while (out.length < limit && byPriority.some(items => cursor < items.length)) {
    for (const items of byPriority) {
      const candidate = items[cursor];
      if (!candidate) continue;
      const key = `${candidate.spotifyType}:${candidate.spotifyId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
      if (out.length >= limit) break;
    }
    cursor += 1;
  }

  return out;
};
