import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import communityFirstImage from '@/assets/community-first.png';
import communitySecondImage from '@/assets/community-second.png';
import communityThirdImage from '@/assets/community-third.jpeg';
import GradualBlur from '@/components/GradualBlur';
import GradientText from '@/components/GradientText';
import ShinyText from '@/components/ShinyText';
import StaggeredMenu, { type StaggeredMenuItem, type StaggeredMenuSocialItem } from '@/components/StaggeredMenu';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';
import { supabase } from '@/lib/supabase';

const IMG_PADDING = 14;

type CommunitySection = {
  imgUrl: string;
  subheading: string;
  heading: string;
  title: string;
  textA: string;
  textB: string;
  cta: string;
};

const COMMUNITY_SECTIONS: CommunitySection[] = [
  {
    imgUrl: communityFirstImage,
    subheading: 'Collaborate',
    heading: 'Built for all of us.',
    title: 'Connect artists, listeners, and curators in one shared music space.',
    textA:
      'The WebSong community helps you discover shared taste, hidden gems, and visual inspiration around music.',
    textB:
      'Each section highlights a different dynamic: sharing, creative feedback, and collective exploration.',
    cta: 'Join conversation'
  },
  {
    imgUrl: communitySecondImage,
    subheading: 'Quality',
    heading: 'Never compromise.',
    title: 'Curated picks with strong identity and consistent visual direction.',
    textA:
      'We prioritize relevant recommendations, authentic profiles, and conversations that genuinely improve your discoveries.',
    textB:
      'The design stays clean and readable to keep the focus on content: artists, vibes, and communities.',
    cta: 'View standards'
  },
  {
    imgUrl: communityThirdImage,
    subheading: 'Modern',
    heading: 'Discover the next wave.',
    title: 'A modern feed designed to surface culture before it goes mainstream.',
    textA:
      'Move through emerging artists, local scenes, and global trends in a fluid, immersive experience.',
    textB:
      'The parallax system adds depth to each block, turning scrolling into an editorial journey.',
    cta: 'Start discovering'
  }
];

const COMMUNITY_MENU_ITEMS: StaggeredMenuItem[] = [
  { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
  { label: 'Dome', ariaLabel: 'Go to dome page', link: '/dome-gallery' },
  { label: 'Sign-up', ariaLabel: 'Go to sign up page', link: '/sign-up' },
  { label: 'Sign-in', ariaLabel: 'Go to sign in page', link: '/sign-in' }
];

const COMMUNITY_AUTH_ONLY_MENU_ITEMS: StaggeredMenuItem[] = [
  { label: 'Your Songs', ariaLabel: 'Go to your songs page', link: '/post-auth' }
];

const COMMUNITY_SOCIAL_ITEMS: StaggeredMenuSocialItem[] = [
  { label: 'GitHub', link: 'https://github.com' },
  { label: 'Instagram', link: 'https://instagram.com' },
  { label: 'X', link: 'https://x.com' }
];

const GRADIENT_PHRASES = [
  'sharing, creative feedback, and collective exploration',
  'authentic profiles',
  'artists, vibes, and communities',
  'turning scrolling into an editorial journey'
];

function getOAuthAvatarUrl(user: User | null): string | undefined {
  if (!user) return undefined;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates: Array<string | undefined> = [
    typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined,
    typeof metadata.picture === 'string' ? metadata.picture : undefined,
    typeof metadata.photoURL === 'string' ? metadata.photoURL : undefined,
    typeof metadata.profile_image_url === 'string' ? metadata.profile_image_url : undefined,
    typeof metadata.image === 'string' ? metadata.image : undefined
  ];

  for (const identity of user.identities ?? []) {
    const identityData = (identity.identity_data ?? {}) as Record<string, unknown>;
    candidates.push(
      typeof identityData.avatar_url === 'string' ? identityData.avatar_url : undefined,
      typeof identityData.picture === 'string' ? identityData.picture : undefined,
      typeof identityData.photoURL === 'string' ? identityData.photoURL : undefined,
      typeof identityData.profile_image_url === 'string' ? identityData.profile_image_url : undefined,
      typeof identityData.image === 'string' ? identityData.image : undefined
    );
  }

  return candidates.find(value => typeof value === 'string' && value.startsWith('http'));
}

function renderGradientPhrases(text: string) {
  let remaining = text;
  const parts: ReactNode[] = [];
  let key = 0;

  while (remaining.length > 0) {
    let nextPhrase: string | null = null;
    let nextIndex = Number.POSITIVE_INFINITY;

    for (const phrase of GRADIENT_PHRASES) {
      const idx = remaining.indexOf(phrase);
      if (idx !== -1 && idx < nextIndex) {
        nextIndex = idx;
        nextPhrase = phrase;
      }
    }

    if (nextPhrase === null) {
      parts.push(<span key={`text-${key++}`}>{remaining}</span>);
      break;
    }
    const matchedPhrase = nextPhrase;

    if (nextIndex > 0) {
      parts.push(<span key={`text-${key++}`}>{remaining.slice(0, nextIndex)}</span>);
    }

    parts.push(
      <GradientText
        key={`gradient-${key++}`}
        colors={['#1f2937', '#2563eb', '#14b8a6', '#2563eb', '#1f2937']}
        animationSpeed={4.5}
        direction="horizontal"
        pauseOnHover={false}
        yoyo={true}
        className="align-baseline font-medium"
      >
        {matchedPhrase}
      </GradientText>
    );

    remaining = remaining.slice(nextIndex + matchedPhrase.length);
  }

  return parts;
}

type TextParallaxSectionProps = {
  imgUrl: string;
  subheading: string;
  heading: string;
  children: ReactNode;
};

function TextParallaxSection({ imgUrl, subheading, heading, children }: TextParallaxSectionProps) {
  return (
    <section
      style={{
        paddingLeft: IMG_PADDING,
        paddingRight: IMG_PADDING
      }}
      className="pb-10"
    >
      <div className="relative h-[150vh]">
        <StickyImage imgUrl={imgUrl} />
        <OverlayCopy heading={heading} subheading={subheading} />
      </div>
      {children}
    </section>
  );
}

function StickyImage({ imgUrl }: { imgUrl: string }) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['end end', 'end start']
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const dimOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.1]);

  return (
    <motion.div
      ref={targetRef}
      style={{
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: `calc(100vh - ${IMG_PADDING * 2}px)`,
        top: IMG_PADDING,
        scale
      }}
      className="sticky z-0 overflow-hidden rounded-3xl"
    >
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: dimOpacity }} />
    </motion.div>
  );
}

function OverlayCopy({ subheading, heading }: { subheading: string; heading: string }) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start']
  });

  const y = useTransform(scrollYProgress, [0, 1], [220, -220]);
  const opacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0]);

  return (
    <motion.div
      ref={targetRef}
      style={{ y, opacity }}
      className="absolute left-0 top-0 flex h-screen w-full flex-col items-center justify-center text-white"
    >
      <p className="mb-3 text-center text-xl tracking-wide md:text-3xl">{subheading}</p>
      <p className="text-center text-4xl font-semibold md:text-7xl">{heading}</p>
    </motion.div>
  );
}

function CommunityContent({ title, textA, textB, cta }: Omit<CommunitySection, 'imgUrl' | 'subheading' | 'heading'>) {
  const ctaTo = cta === 'Start discovering' ? '/profile-suggestions' : cta === 'View standards' ? '/sign-up' : undefined;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-24 pt-12 md:grid-cols-12">
      <h2 className="col-span-1 text-3xl font-semibold text-neutral-900 md:col-span-4">{title}</h2>
      <div className="col-span-1 md:col-span-8">
        <p className="mb-5 text-xl text-neutral-700 md:text-2xl">{renderGradientPhrases(textA)}</p>
        <p className="mb-8 text-xl text-neutral-700 md:text-2xl">{renderGradientPhrases(textB)}</p>
        {cta !== 'Join conversation' ? (
          ctaTo ? (
            <CraftButton asChild size="lg" className="h-auto w-full rounded-xl px-8 py-4 text-lg md:w-fit">
              <Link to={ctaTo}>
                <CraftButtonLabel>{cta}</CraftButtonLabel>
                <CraftButtonIcon>
                  <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
                </CraftButtonIcon>
              </Link>
            </CraftButton>
          ) : (
            <CraftButton size="lg" className="h-auto w-full rounded-xl px-8 py-4 text-lg md:w-fit">
              <CraftButtonLabel>{cta}</CraftButtonLabel>
              <CraftButtonIcon>
                <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
              </CraftButtonIcon>
            </CraftButton>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setAuthUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(() => {
    void supabase.auth.signOut().finally(() => {
      window.location.assign('/sign-in');
    });
  }, []);

  const menuItems = useMemo(
    () =>
      authUser
        ? [
            ...COMMUNITY_MENU_ITEMS.filter(item => item.link !== '/sign-in' && item.link !== '/sign-up'),
            ...COMMUNITY_AUTH_ONLY_MENU_ITEMS,
            { label: 'Déconnexion', ariaLabel: 'Sign out', link: '/sign-in', onClick: handleSignOut }
          ]
        : COMMUNITY_MENU_ITEMS,
    [authUser, handleSignOut]
  );

  const avatarSrc = getOAuthAvatarUrl(authUser);
  const avatarInitial = authUser?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <main className="bg-neutral-100 text-neutral-900">
      <StaggeredMenu
        isFixed
        position="right"
        items={menuItems}
        socialItems={COMMUNITY_SOCIAL_ITEMS}
        displaySocials={true}
        displayItemNumbering={false}
        colors={['#f5f5f5', '#dedede']}
        menuButtonColor="#111111"
        openMenuButtonColor="#111111"
        changeMenuColorOnOpen={true}
        adaptiveMenuContrast={true}
        accentColor="#111111"
        showAvatar={Boolean(authUser)}
        avatarSrc={avatarSrc}
        avatarInitial={avatarInitial}
        avatarAlt={authUser?.email ? `Avatar ${authUser.email}` : 'User avatar'}
        avatarLink="/about-you"
      />

      <section className="px-4 pt-20 pb-20 text-center sm:px-8">
        <h1 className="mx-auto max-w-5xl text-4xl leading-tight font-semibold md:text-7xl">
          <ShinyText
            text="A creative community to discover, share, and build the next musical wave."
            speed={2.4}
            delay={0.2}
            color="#2a2a2a"
            shineColor="#ffffff"
            spread={118}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            className="block leading-tight"
          />
        </h1>
      </section>

      {COMMUNITY_SECTIONS.map(section => (
        <TextParallaxSection
          key={section.heading}
          imgUrl={section.imgUrl}
          subheading={section.subheading}
          heading={section.heading}
        >
          <CommunityContent title={section.title} textA={section.textA} textB={section.textB} cta={section.cta} />
        </TextParallaxSection>
      ))}

      <GradualBlur
        target="page"
        position="bottom"
        height="8.5rem"
        strength={2}
        divCount={6}
        curve="bezier"
        exponential
        opacity={1}
        zIndex={55}
      />
    </main>
  );
}
