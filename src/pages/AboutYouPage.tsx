import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import type { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from 'lucide-react';
import { FiMapPin } from 'react-icons/fi';
import { SiGithub, SiInstagram, SiTiktok, SiX } from 'react-icons/si';
import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { Globe } from '@/components/ui/cobe-globe';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { supabase } from '@/lib/supabase';

type BlockProps = ComponentProps<typeof motion.div>;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type AboutProfile = {
  displayName: string;
  headline: string;
  contactLabel: string;
  contactUrl: string;
  aboutIntro: string;
  aboutBody: string;
  locationLabel: string;
  mailingTitle: string;
  mailingCta: string;
  avatarUrl: string;
  youtubeUrl: string;
  githubUrl: string;
  tiktokUrl: string;
  xUrl: string;
};

type AboutProfileRow = {
  user_id: string;
  display_name: string;
  headline: string;
  contact_label: string;
  contact_url: string;
  about_intro: string;
  about_body: string;
  location_label: string;
  mailing_title: string;
  mailing_cta: string;
  avatar_url: string;
  youtube_url: string;
  github_url: string;
  tiktok_url: string;
  x_url: string;
};

const DEFAULT_PROFILE: AboutProfile = {
  displayName: 'Tom',
  headline: 'I build cool websites like this one.',
  contactLabel: 'Contact me',
  contactUrl: '#',
  aboutIntro: 'My passion is building cool stuff.',
  aboutBody:
    "I build primarily with React, Tailwind CSS, and Framer Motion. I love this stack so much that I even built a website about it. I've made over a hundred videos on the subject across YouTube and TikTok.",
  locationLabel: 'Cyberspace',
  mailingTitle: 'Join my mailing list',
  mailingCta: 'Join the list',
  avatarUrl: 'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=John',
  youtubeUrl: '#',
  githubUrl: '#',
  tiktokUrl: '#',
  xUrl: '#'
};

const LOCATION_COORDS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  london: [51.5074, -0.1278],
  tokyo: [35.6762, 139.6503],
  'new york': [40.7128, -74.006],
  nyc: [40.7128, -74.006],
  berlin: [52.52, 13.405],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  lisbon: [38.7223, -9.1393],
  rome: [41.9028, 12.4964],
  milan: [45.4642, 9.19],
  amsterdam: [52.3676, 4.9041],
  brussels: [50.8503, 4.3517],
  montreal: [45.5017, -73.5673],
  toronto: [43.6532, -79.3832],
  'los angeles': [34.0522, -118.2437],
  'san francisco': [37.7595, -122.4367],
  sydney: [-33.8688, 151.2093],
  singapore: [1.3521, 103.8198],
  dubai: [25.2048, 55.2708],
  capetown: [-33.9249, 18.4241],
  'cape town': [-33.9249, 18.4241]
};

function parseCoordinates(value: string): [number, number] | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}

function resolveLocationCoords(rawLabel: string): [number, number] {
  const label = rawLabel.trim();
  if (!label) return LOCATION_COORDS.paris;

  const explicitCoords = parseCoordinates(label);
  if (explicitCoords) return explicitCoords;

  const key = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return LOCATION_COORDS[key] ?? LOCATION_COORDS.paris;
}

function normalizeProfile(row: Partial<AboutProfileRow> | null | undefined, fallbackDisplayName: string): AboutProfile {
  if (!row) {
    return { ...DEFAULT_PROFILE, displayName: fallbackDisplayName || DEFAULT_PROFILE.displayName };
  }

  return {
    displayName: row.display_name || fallbackDisplayName || DEFAULT_PROFILE.displayName,
    headline: row.headline || DEFAULT_PROFILE.headline,
    contactLabel: row.contact_label || DEFAULT_PROFILE.contactLabel,
    contactUrl: row.contact_url || DEFAULT_PROFILE.contactUrl,
    aboutIntro: row.about_intro || DEFAULT_PROFILE.aboutIntro,
    aboutBody: row.about_body || DEFAULT_PROFILE.aboutBody,
    locationLabel: row.location_label || DEFAULT_PROFILE.locationLabel,
    mailingTitle: row.mailing_title || DEFAULT_PROFILE.mailingTitle,
    mailingCta: row.mailing_cta || DEFAULT_PROFILE.mailingCta,
    avatarUrl: row.avatar_url || DEFAULT_PROFILE.avatarUrl,
    youtubeUrl: row.youtube_url || DEFAULT_PROFILE.youtubeUrl,
    githubUrl: row.github_url || DEFAULT_PROFILE.githubUrl,
    tiktokUrl: row.tiktok_url || DEFAULT_PROFILE.tiktokUrl,
    xUrl: row.x_url || DEFAULT_PROFILE.xUrl
  };
}

function toRow(profile: AboutProfile, userId: string): AboutProfileRow {
  return {
    user_id: userId,
    display_name: profile.displayName,
    headline: profile.headline,
    contact_label: profile.contactLabel,
    contact_url: profile.contactUrl,
    about_intro: profile.aboutIntro,
    about_body: profile.aboutBody,
    location_label: profile.locationLabel,
    mailing_title: profile.mailingTitle,
    mailing_cta: profile.mailingCta,
    avatar_url: profile.avatarUrl,
    youtube_url: profile.youtubeUrl,
    github_url: profile.githubUrl,
    tiktok_url: profile.tiktokUrl,
    x_url: profile.xUrl
  };
}

function fallbackDisplayName(user: User | null): string {
  if (!user) return DEFAULT_PROFILE.displayName;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    typeof metadata.full_name === 'string' ? metadata.full_name : '',
    typeof metadata.name === 'string' ? metadata.name : '',
    typeof metadata.preferred_username === 'string' ? metadata.preferred_username : '',
    typeof metadata.user_name === 'string' ? metadata.user_name : '',
    user.email?.split('@')[0] ?? ''
  ];

  return candidates.find(candidate => candidate.trim().length > 0)?.trim() || DEFAULT_PROFILE.displayName;
}

function fallbackAvatarUrl(user: User | null): string {
  if (!user) return DEFAULT_PROFILE.avatarUrl;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarCandidates = [
    typeof metadata.avatar_url === 'string' ? metadata.avatar_url : '',
    typeof metadata.picture === 'string' ? metadata.picture : '',
    typeof metadata.image === 'string' ? metadata.image : ''
  ];

  return avatarCandidates.find(candidate => candidate.startsWith('http')) || DEFAULT_PROFILE.avatarUrl;
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    message.includes('about_profiles') &&
    (message.includes('does not exist') || message.includes('relation') || message.includes('schema cache'))
  );
}

function Block({ className, ...rest }: BlockProps) {
  return (
    <motion.div
      variants={{
        initial: { scale: 0.5, y: 50, opacity: 0 },
        animate: { scale: 1, y: 0, opacity: 1 }
      }}
      transition={{ type: 'spring', mass: 3, stiffness: 400, damping: 50 }}
      className={twMerge('col-span-4 rounded-lg border border-zinc-700 bg-zinc-800 p-6', className)}
      {...rest}
    />
  );
}

function InlineInput({
  value,
  onChange,
  className,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={twMerge(
        'w-full border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70',
        className
      )}
    />
  );
}

function InlineTextarea({
  value,
  onChange,
  className,
  disabled,
  rows = 2
}: {
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={event => onChange(event.target.value)}
      rows={rows}
      disabled={disabled}
      className={twMerge(
        'w-full resize-none border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-70',
        className
      )}
    />
  );
}

function HeaderBlock({
  profile,
  onFieldChange,
  disabled
}: {
  profile: AboutProfile;
  onFieldChange: (key: keyof AboutProfile, value: string) => void;
  disabled: boolean;
}) {
  return (
    <Block className="col-span-12 row-span-2 md:col-span-6">
      <img src={profile.avatarUrl} alt="avatar" className="mb-4 size-14 rounded-full object-cover" />
      <div className="mb-12 text-4xl leading-tight font-medium">
        <div className="mb-2 inline-flex items-center gap-2">
          <span>Hi, I'm</span>
          <InlineInput
            value={profile.displayName}
            onChange={value => onFieldChange('displayName', value)}
            disabled={disabled}
            className="w-[12ch] font-medium"
          />
          <span>.</span>
        </div>
        <InlineTextarea
          value={profile.headline}
          onChange={value => onFieldChange('headline', value)}
          disabled={disabled}
          className="min-h-[3.2em] text-zinc-400"
          rows={2}
        />
      </div>
    </Block>
  );
}

function SocialsBlock({ profile }: { profile: AboutProfile }) {
  return (
    <>
      <Block
        whileHover={{ rotate: '2.5deg', scale: 1.1 }}
        className="col-span-6 bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-600 md:col-span-3"
      >
        <a href={profile.youtubeUrl || '#'} className="grid h-full place-content-center text-3xl text-white">
          <SiInstagram />
        </a>
      </Block>
      <Block whileHover={{ rotate: '-2.5deg', scale: 1.1 }} className="col-span-6 bg-green-600 md:col-span-3">
        <a href={profile.githubUrl || '#'} className="grid h-full place-content-center text-3xl text-white">
          <SiGithub />
        </a>
      </Block>
      <Block whileHover={{ rotate: '-2.5deg', scale: 1.1 }} className="col-span-6 bg-zinc-50 md:col-span-3">
        <a href={profile.tiktokUrl || '#'} className="grid h-full place-content-center text-3xl text-black">
          <SiTiktok />
        </a>
      </Block>
      <Block whileHover={{ rotate: '2.5deg', scale: 1.1 }} className="col-span-6 bg-blue-500 md:col-span-3">
        <a href={profile.xUrl || '#'} className="grid h-full place-content-center text-3xl text-white">
          <SiX />
        </a>
      </Block>
    </>
  );
}

function AboutBlock({
  profile,
  onFieldChange,
  disabled
}: {
  profile: AboutProfile;
  onFieldChange: (key: keyof AboutProfile, value: string) => void;
  disabled: boolean;
}) {
  return (
    <Block className="col-span-12 text-3xl leading-snug">
      <InlineInput
        value={profile.aboutIntro}
        onChange={value => onFieldChange('aboutIntro', value)}
        disabled={disabled}
        className="mb-2 inline-block w-full text-3xl"
      />
      <InlineTextarea
        value={profile.aboutBody}
        onChange={value => onFieldChange('aboutBody', value)}
        disabled={disabled}
        className="min-h-[7.5em] text-zinc-400"
        rows={4}
      />
    </Block>
  );
}

function LocationBlock({
  profile,
  marker,
  onFieldChange,
  disabled
}: {
  profile: AboutProfile;
  marker: { id: string; location: [number, number]; label: string };
  onFieldChange: (key: keyof AboutProfile, value: string) => void;
  disabled: boolean;
}) {
  return (
    <Block className="col-span-12 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FiMapPin className="text-2xl" />
        <span className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Location</span>
      </div>
      <InlineInput
        value={profile.locationLabel}
        onChange={value => onFieldChange('locationLabel', value)}
        disabled={disabled}
        className="text-lg text-zinc-300"
        placeholder="Paris ou 48.8566, 2.3522"
      />
      <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <Globe
          className="mx-auto w-full max-w-[320px]"
          markers={[marker]}
          markerColor={[0.2, 0.6, 1]}
          baseColor={[0.2, 0.23, 0.33]}
          arcColor={[0.4, 0.7, 1]}
          glowColor={[0.5, 0.6, 0.8]}
          dark={1}
          mapBrightness={4}
          markerSize={0.11}
          markerElevation={0.02}
          speed={0.0025}
          theta={0.25}
          diffuse={1.4}
        />
        <p className="mt-3 text-center text-xs text-zinc-400">
          Position: {marker.location[0].toFixed(4)}, {marker.location[1].toFixed(4)}
        </p>
      </div>
    </Block>
  );
}

export default function AboutYouPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AboutProfile>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dbReady, setDbReady] = useState(true);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const lastSyncedJsonRef = useRef(JSON.stringify(DEFAULT_PROFILE));
  const skipAutosaveRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const savedBadgeTimeoutRef = useRef<number | null>(null);

  const canPersist = Boolean(user && dbReady);

  const saveStateLabel = useMemo(() => {
    if (!user) return 'Connecte-toi pour sauvegarder';
    if (!dbReady) return 'Configuration DB requise';
    if (saveState === 'saving') return 'Sauvegarde...';
    if (saveState === 'saved') return 'Sauvegardé';
    if (saveState === 'error') return 'Erreur de sauvegarde';
    return '';
  }, [dbReady, saveState, user]);

  const locationMarker = useMemo(() => {
    const label = profile.locationLabel.trim() || 'Paris';
    return {
      id: 'profile-location',
      label,
      location: resolveLocationCoords(label)
    };
  }, [profile.locationLabel]);

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

  useEffect(() => {
    const name = fallbackDisplayName(user);
    const avatar = fallbackAvatarUrl(user);

    if (!user) {
      const next = { ...DEFAULT_PROFILE, displayName: name, avatarUrl: avatar };
      setProfile(next);
      lastSyncedJsonRef.current = JSON.stringify(next);
      setLoadingProfile(false);
      setInfoMessage('Connecte-toi pour rendre ta page persistante et synchronisée en ligne.');
      return;
    }

    let active = true;
    setLoadingProfile(true);
    setInfoMessage(null);

    void supabase
      .from('about_profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          if (isMissingTableError(error)) {
            setDbReady(false);
            setInfoMessage("Table 'about_profiles' absente. Exécute docs/about_profiles.sql une fois sur Supabase.");
          } else {
            setInfoMessage(error.message);
          }

          const fallback = { ...DEFAULT_PROFILE, displayName: name, avatarUrl: avatar };
          setProfile(fallback);
          lastSyncedJsonRef.current = JSON.stringify(fallback);
          setLoadingProfile(false);
          return;
        }

        setDbReady(true);
        const row = (data?.[0] as Partial<AboutProfileRow> | undefined) ?? null;
        const normalized = normalizeProfile(row, name);
        if (!row?.avatar_url) normalized.avatarUrl = avatar;
        setProfile(normalized);
        lastSyncedJsonRef.current = JSON.stringify(normalized);
        setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !dbReady) return;

    const channel = supabase
      .channel(`about-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'about_profiles',
          filter: `user_id=eq.${user.id}`
        },
        payload => {
          const incoming = payload.new as Partial<AboutProfileRow> | null;
          if (!incoming) return;

          const normalized = normalizeProfile(incoming, fallbackDisplayName(user));
          const incomingJson = JSON.stringify(normalized);
          if (incomingJson === lastSyncedJsonRef.current) return;

          skipAutosaveRef.current = true;
          setProfile(normalized);
          lastSyncedJsonRef.current = incomingJson;
          setSaveState('saved');
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [dbReady, user]);

  useEffect(() => {
    if (!canPersist || loadingProfile) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    const nextJson = JSON.stringify(profile);
    if (nextJson === lastSyncedJsonRef.current) return;

    setSaveState('saving');
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      if (!user) return;

      void supabase
        .from('about_profiles')
        .upsert(toRow(profile, user.id), { onConflict: 'user_id' })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            setSaveState('error');
            if (isMissingTableError(error)) {
              setDbReady(false);
              setInfoMessage("Table 'about_profiles' absente. Exécute docs/about_profiles.sql une fois sur Supabase.");
            } else {
              setInfoMessage(error.message);
            }
            return;
          }

          const normalized = normalizeProfile(data as Partial<AboutProfileRow>, fallbackDisplayName(user));
          lastSyncedJsonRef.current = JSON.stringify(normalized);
          setSaveState('saved');

          if (savedBadgeTimeoutRef.current) window.clearTimeout(savedBadgeTimeoutRef.current);
          savedBadgeTimeoutRef.current = window.setTimeout(() => {
            setSaveState('idle');
          }, 1200);
        });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [canPersist, dbReady, loadingProfile, profile, user]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      if (savedBadgeTimeoutRef.current) window.clearTimeout(savedBadgeTimeoutRef.current);
    };
  }, []);

  const onFieldChange = (key: keyof AboutProfile, value: string) => {
    setProfile(current => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-zinc-900 px-4 py-12 text-zinc-50">
      <motion.div
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.05 }}
        className="mx-auto grid max-w-4xl grid-flow-dense grid-cols-12 gap-4"
      >
        <HeaderBlock profile={profile} onFieldChange={onFieldChange} disabled={!canPersist || loadingProfile} />
        <SocialsBlock profile={profile} />
        <AboutBlock profile={profile} onFieldChange={onFieldChange} disabled={!canPersist || loadingProfile} />
        <LocationBlock
          profile={profile}
          marker={locationMarker}
          onFieldChange={onFieldChange}
          disabled={!canPersist || loadingProfile}
        />
      </motion.div>

      {saveStateLabel || infoMessage ? (
        <div className="mx-auto mt-4 flex max-w-4xl items-center justify-between gap-2 text-xs text-zinc-400">
          <span>{saveStateLabel}</span>
          {infoMessage ? <span className="text-amber-300">{infoMessage}</span> : null}
        </div>
      ) : null}

      <div className="mt-12 flex justify-center">
        <CraftButton asChild size="lg" className="h-auto rounded-xl px-8 py-4 text-lg">
          <Link to="/dome-gallery">
            <CraftButtonLabel>Home</CraftButtonLabel>
            <CraftButtonIcon>
              <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
            </CraftButtonIcon>
          </Link>
        </CraftButton>
      </div>
    </div>
  );
}
