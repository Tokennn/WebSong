const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

function bumpGoogleToken(url: string): string {
  // Examples:
  // - .../s96-c/photo.jpg  -> .../s1024-c/photo.jpg
  // - ...=s96-c            -> ...=s1024-c
  return url.replace(/\/s\d+(-[a-z0-9-]+)?\//i, '/s1024-c/').replace(/=s\d+(-[a-z0-9-]+)?(?=(&|$))/i, '=s1024-c');
}

function bumpSpotifyToken(url: string): string {
  // Common Spotify CDN size tokens:
  // - 0000f178 (160)
  // - 00005174 (320)
  // - 00001e02 / 00001e00 (300-ish variants)
  // Use 0000e5eb (large variant commonly used for higher-res artist images).
  return url
    .replace(/(ab6761[0-9a-z]{2})0000f178/gi, '$10000e5eb')
    .replace(/(ab6761[0-9a-z]{2})00005174/gi, '$10000e5eb')
    .replace(/(ab6761[0-9a-z]{2})00001e0[02]/gi, '$10000e5eb');
}

export function improveAvatarUrlQuality(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return rawUrl;

  let candidate = bumpGoogleToken(trimmed);
  candidate = bumpSpotifyToken(candidate);
  candidate = candidate.replace(/_normal(\.(jpg|jpeg|png|webp))/i, '_400x400$1');

  if (!ABSOLUTE_HTTP_URL.test(candidate)) return candidate;

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('googleusercontent.com') || host.includes('ggpht.com')) {
      const size = Number(parsed.searchParams.get('sz') ?? '0');
      if (!Number.isFinite(size) || size < 1024) parsed.searchParams.set('sz', '1024');
    }

    if (host === 'avatars.githubusercontent.com' || host.endsWith('.gravatar.com') || host === 'gravatar.com') {
      const size = Number(parsed.searchParams.get('s') ?? '0');
      if (!Number.isFinite(size) || size < 512) parsed.searchParams.set('s', '512');
    }

    if (host.includes('discordapp.com') || host.includes('discord.com')) {
      const size = Number(parsed.searchParams.get('size') ?? '0');
      if (!Number.isFinite(size) || size < 1024) parsed.searchParams.set('size', '1024');
    }

    return parsed.toString();
  } catch {
    return candidate;
  }
}

