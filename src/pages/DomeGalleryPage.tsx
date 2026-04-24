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
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab6761610000517422d7d6f8981c7a27bf68a382',
    alt: 'Tems',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174f2db81b3312a1f167fc54096',
    alt: 'Trippie Redd',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dc3ce2b787ae2ca365f974f0',
    alt: 'DJ Quik',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-ak.spotifycdn.com/image/ab676161000051746ff0cd5ef2ecf733804984bb',
    alt: 'Green Day',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174aa16370f435f9f9a99813417',
    alt: 'Georges Brassens',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab67616100005174b014833535144c20f64ae1ed',
    alt: 'Doc Gynéco',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab6761610000517470c34ddd03bd00f7c8ca0bf9',
    alt: 'Philippe Sarde',
    description: 'Artiste suivi sur Spotify.'
  },
  {
    src: 'https://image-cdn-fa.spotifycdn.com/image/ab676161000051744ef6e245168c33922bc6df1a',
    alt: 'Ty Dolla $ign',
    description: 'Artiste suivi sur Spotify.'
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
