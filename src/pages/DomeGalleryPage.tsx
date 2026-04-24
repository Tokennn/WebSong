import { ArrowLeftIcon } from 'lucide-react';
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
  }
];

export default function DomeGalleryPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
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

      <div className="absolute inset-0 scale-110">
        <DomeGallery
          images={SPOTIFY_TEST_ARTISTS}
          fit={0.6}
          minRadius={700}
          overlayBlurColor="#000000"
          padFactor={0.08}
          grayscale={false}
        />
      </div>
    </main>
  );
}
