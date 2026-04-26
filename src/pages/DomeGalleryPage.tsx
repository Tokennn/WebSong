import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { ArrowLeftIcon, ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import DomeGallery from '@/components/DomeGallery';
import { CraftButton, CraftButtonIcon, CraftButtonLabel } from '@/components/ui/craft-button';

const SPOTIFY_TEST_ARTISTS = [
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174034d4cadc0077cfed95d47f1',
    alt: 'Noah Rinker',
    description: 'Auteur-compositeur pop avec des mélodies douces et une ambiance introspective.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174bceb0b4fabbf8639d20ffc42',
    alt: 'Zola',
    description: 'Rappeur français à l’univers trap sombre, énergique et percutant.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174c66b0a8c3268f0b6556f64a8',
    alt: 'Wiz Khalifa',
    description: 'Rappeur US reconnu pour ses flows chill, ses refrains accrocheurs et ses hits rap.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0240e152d8a1f20c7a607e45db',
    alt: 'Dru Down',
    description: 'Rappeur de la scène West Coast, connu pour ses sons G-funk des années 90.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab6761610000517422d7d6f8981c7a27bf68a382',
    alt: 'Tems',
    description: 'Chanteuse nigériane afrobeats/R&B à la voix soulful et aux collaborations internationales.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174f2db81b3312a1f167fc54096',
    alt: 'Trippie Redd',
    description: 'Rappeur/chanteur US mêlant trap, emo rap et mélodies sombres.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dc3ce2b787ae2ca365f974f0',
    alt: 'DJ Quik',
    description: 'Rappeur et producteur emblématique de la West Coast, reconnu pour son groove funk.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab676161000051746ff0cd5ef2ecf733804984bb',
    alt: 'Green Day',
    description: 'Groupe punk rock américain culte, auteur de nombreux hymnes rock générationnels.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174aa16370f435f9f9a99813417',
    alt: 'Georges Brassens',
    description: 'Auteur-compositeur français majeur, figure de la chanson poétique et satirique.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174b014833535144c20f64ae1ed',
    alt: 'Doc Gynéco',
    description: 'Rappeur français des années 90/2000, connu pour ses classiques au ton nonchalant.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab6761610000517470c34ddd03bd00f7c8ca0bf9',
    alt: 'Philippe Sarde',
    description: 'Compositeur français de musiques de films, réputé pour ses orchestrations élégantes.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051744ef6e245168c33922bc6df1a',
    alt: 'Ty Dolla $ign',
    description: 'Artiste US entre hip-hop et R&B, apprécié pour ses refrains et ses featurings.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174cdc193d2ec8287a4917417ba',
    alt: 'BU$HI',
    description: 'Artiste de la scène urbaine française, entre rap, électro et sonorités club modernes.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174371632043a8c12bb7eeeaf9d',
    alt: 'Hans Zimmer',
    description: 'Compositeur allemand légendaire, auteur de nombreuses musiques de films iconiques.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174ac57c28c714286830e389df9',
    alt: 'Ferdi',
    description: 'Artiste émergent à l’univers mélodique moderne, entre émotion et production actuelle.'
  },
  {
    src: 'https://i.scdn.co/image/e3e634272efd0251c2b8298b25fcd4b659993178',
    alt: 'N.W.A.',
    description: 'Groupe fondateur du gangsta rap, figure majeure de la West Coast historique.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051745c9383166226bbe48213b064',
    alt: 'Warren G',
    description: 'Rappeur et producteur West Coast, emblématique du son G-funk des années 90.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c3dc5429b676b16d451e5f77',
    alt: 'Childish Gambino',
    description: 'Artiste polyvalent mêlant rap, soul, funk et pop avec une identité très singulière.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051742dc7b3180bad1885c6ee1320',
    alt: 'Kavinsky',
    description: 'Producteur français de synthwave, célèbre pour son esthétique rétro nocturne.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e024fa5066ce33a65adda043982',
    alt: 'YZ',
    description: 'Rappeur US old-school reconnu pour son flow direct et son identité East Coast.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051749f6f7c2d12975d2a4b3a0fd8',
    alt: 'Malcolm Todd',
    description: 'Chanteur/songwriter indie-pop au style intime et aux productions soignées.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174b3000529ef8325f73141d908',
    alt: '03 Greedo',
    description: 'Rappeur de Los Angeles connu pour son mélange de trap, mélodies et énergie brute.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab6761610000517438df3e7ad0a284eec89ffb33',
    alt: 'Cypress Hill',
    description: 'Groupe hip-hop culte à l’identité latino et au son sombre immédiatement reconnaissable.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02b0af6c9d26487cf55ba0efd6',
    alt: 'Suprême NTM (Album)',
    description: 'Album classique du rap français signé NTM, référence majeure du genre.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174e3ac5eb948e78d9285d1dbdb',
    alt: 'Deftones',
    description: 'Groupe alternatif/metal réputé pour ses ambiances denses et ses textures sonores.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab676161000051743c9e8c67b087ba0cb5923b78',
    alt: 'Pink Floyd',
    description: 'Groupe mythique du rock progressif, connu pour ses albums conceptuels intemporels.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab676161000051743f02c2ff7ea1aa208e015f57',
    alt: 'Lynyrd Skynyrd',
    description: 'Groupe phare du southern rock américain, entre riffs classiques et esprit blues-rock.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174d5233fdc8cad84de5b366f1b',
    alt: 'Megadeth',
    description: 'Groupe culte de thrash metal, reconnu pour sa technique et son intensité.'
  },
  {
    src: 'https://i.scdn.co/image/9e428b0f0a17c0d9ff108340f6f304919af7c435',
    alt: 'Ritchie Valens',
    description: 'Pionnier du rock’n’roll latino, figure historique malgré une carrière très courte.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174a998bc86f87b9fe7e2466110',
    alt: 'Gunna',
    description: 'Rappeur d’Atlanta incontournable de la trap moderne et des flows mélodiques.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051743cb51ac0d2a735316c536315',
    alt: 'Yeat',
    description: 'Rappeur US associé à la nouvelle vague rage/plug avec une signature vocale marquée.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174487b00fa17362b8eab3b16c8',
    alt: 'George Benson',
    description: 'Guitariste et chanteur jazz-funk légendaire, virtuose au groove sophistiqué.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c1719ac9e6a75c1c25835018',
    alt: 'The Weeknd',
    description: 'Star canadienne R&B/pop, connue pour ses productions cinématographiques et ses hits mondiaux.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174514da623c55dc9d2155705dd',
    alt: 'Lil Baby',
    description: 'Rappeur d’Atlanta majeur de la trap contemporaine, entre technique et mélodie.'
  },
  {
    src: 'https://i.scdn.co/image/02fd758d9805ef44d1caafc35ff17a47f9dff098',
    alt: 'Bob Marley & The Wailers',
    description: 'Groupe emblématique du reggae, porté par des classiques intemporels et engagés.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab676161000051749f2fb33940aac624dc5d100d',
    alt: 'Young Thug',
    description: 'Rappeur d’Atlanta influent, reconnu pour son style vocal atypique et avant-gardiste.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174301a9c599d85d89e7a90fed0',
    alt: 'Damso',
    description: 'Rappeur belge francophone majeur, entre introspection sombre et production moderne.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174a4f78bbc847304a2bc118e10',
    alt: 'Big L',
    description: 'Figure culte du rap new-yorkais, célèbre pour sa technique et ses punchlines.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174998010cd1075921b5faf16b2',
    alt: 'Lil Wayne',
    description: 'Icône du rap US, incontournable pour ses mixtapes et son influence générationnelle.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c52b798deb89eb8414a51b7b',
    alt: 'Don Toliver',
    description: 'Artiste US mêlant trap et R&B avec des mélodies planantes et une identité marquée.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051743bb89e2af531884875a31c7b',
    alt: 'cinquemani',
    description: 'Artiste émergent à l’univers urbain moderne, entre toplines mélodiques et flow actuel.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c5f0d80d503eb679845d9661',
    alt: 'K-Reen',
    description: 'Chanteuse R&B française de référence, connue pour sa voix et ses ballades marquantes.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ffa513a2e91f50ea4a178983',
    alt: 'Imagination',
    description: 'Groupe britannique funk/disco, reconnu pour son groove raffiné des années 80.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174432cb55e0b82419302f7cc5a',
    alt: 'Keyshia Cole',
    description: 'Chanteuse R&B américaine à la voix puissante, entre soul contemporaine et émotion brute.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174d86c89284b01716db1bc9a17',
    alt: 'Georges Moustaki',
    description: 'Auteur-compositeur français emblématique, figure majeure de la chanson poétique.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02ee4644e12bef70636167c6bd',
    alt: 'Rage Against The Machine (Album)',
    description: 'Album culte de rock/rap engagé, référence majeure de la scène alternative 90s.'
  },
  {
    src: 'https://i.scdn.co/image/99f49b1947bb7e1156effba51ef87c784952d344',
    alt: 'Barry White',
    description: 'Voix légendaire de la soul, célèbre pour ses orchestrations romantiques et son timbre grave.'
  },
  {
    src: 'https://i.scdn.co/image/827529e6f65be4c27f9a97d27943f4fb082d265e',
    alt: 'Eazy-E',
    description: 'Pionnier du gangsta rap West Coast et membre fondateur de N.W.A.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c7a711a3d016337b5f5905aa',
    alt: 'Billy Paul',
    description: 'Chanteur soul/jazz américain, connu pour ses classiques sophistiqués des années 70.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174cd9f60ab57585bf3b77ecc51',
    alt: 'Whitney Houston',
    description: 'Icône mondiale de la pop/soul, reconnue pour sa voix exceptionnelle.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174f12270128127ba170f90097d',
    alt: 'Aretha Franklin',
    description: 'Reine de la soul, artiste légendaire à l’héritage musical immense.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051744c813aece0480cb93c5e86b7',
    alt: 'Sainté',
    description: 'Artiste UK entre rap et vibes lounge, avec une esthétique minimaliste moderne.'
  }
];

export default function DomeGalleryPage() {
  const [scrollBlurPx, setScrollBlurPx] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const blurRef = useRef(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.2
    });

    let rafId = 0;

    const updateBlur = (progress: number) => {
      const boundedProgress = Math.min(Math.max(progress, 0), 1);
      const nextBlur = boundedProgress * 18;

      if (Math.abs(nextBlur - blurRef.current) >= 0.05) {
        blurRef.current = nextBlur;
        setScrollBlurPx(nextBlur);
      }
    };

    lenis.on('scroll', ({ scroll, limit }: { scroll: number; limit: number }) => {
      const progress = limit > 0 ? scroll / limit : 0;
      updateBlur(progress);
      if (Math.abs(progress - progressRef.current) >= 0.005) {
        progressRef.current = progress;
        setScrollProgress(progress);
      }
    });

    const tick = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const domeTranslateY = -42 * scrollProgress;
  const domeOpacity = Math.max(0, 1 - scrollProgress * 1.15);

  return (
    <main className="relative min-h-[220vh] w-screen bg-black text-white">
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center transition-all duration-500 ${
          scrollProgress >= 0.82 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-auto">
          <CraftButton asChild>
            <Link to="/community">
              <CraftButtonLabel>Discover</CraftButtonLabel>
              <CraftButtonIcon>
                <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
              </CraftButtonIcon>
            </Link>
          </CraftButton>
        </div>
      </div>

      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute top-6 left-6 z-30">
          <CraftButton asChild>
            <Link to="/">
              <CraftButtonIcon>
                <ArrowLeftIcon className="size-3 stroke-2" />
              </CraftButtonIcon>
              <CraftButtonLabel>Back</CraftButtonLabel>
            </Link>
          </CraftButton>
        </div>

        <div
          className="absolute inset-0 will-change-[transform,filter,opacity]"
          style={{
            filter: `blur(${scrollBlurPx}px)`,
            transform: `translate3d(0, ${domeTranslateY}vh, 0) scale(1.1)`,
            opacity: domeOpacity
          }}
        >
          <DomeGallery
            images={SPOTIFY_TEST_ARTISTS}
            fit={0.6}
            minRadius={700}
            overlayBlurColor="#000000"
            padFactor={0.08}
            grayscale={false}
          />
        </div>
      </div>
    </main>
  );
}
