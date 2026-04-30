import { startTransition, useEffect, useMemo, useState } from 'react';

type GalleryImage = {
  src: string;
  alt: string;
};

type LayoutCell = {
  imageIndex: number | null;
  colSpan: number;
  rowSpan: number;
  gridColumn: number;
  gridRow: number;
  cellIndex: number;
};

const DEFAULT_IMAGES: GalleryImage[] = [
  { src: 'https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg', alt: 'Image 1' },
  { src: 'https://framerusercontent.com/images/aNsAT3jCvt4zglbWCUoFe33Q.jpg', alt: 'Image 2' },
  { src: 'https://framerusercontent.com/images/BYnxEV1zjYb9bhWh1IwBZ1ZoS60.jpg', alt: 'Image 3' },
  { src: 'https://framerusercontent.com/images/2uTNEj5aTl2K3NJaEFWMbnrA.jpg', alt: 'Image 4' },
  { src: 'https://framerusercontent.com/images/f9RiWoNpmlCMqVRIHz8l8wYfeI.jpg', alt: 'Image 5' },
  { src: 'https://framerusercontent.com/images/l1hY4xIrXE2fAmKX58EqUdhM.jpg', alt: 'Image 6' }
];

const DEFAULT_SPAN_CONFIG = [
  { imageIndex: 0, colSpan: 2, rowSpan: 1 },
  { imageIndex: 4, colSpan: 1, rowSpan: 2 }
];

function buildGridLayout(images: GalleryImage[], gridColumns: number, gridRows: number): LayoutCell[] {
  const grid = Array(gridRows)
    .fill(null)
    .map(() => Array(gridColumns).fill(false));
  const layout: LayoutCell[] = [];
  const used = new Set<number>();

  DEFAULT_SPAN_CONFIG.forEach(span => {
    if (span.imageIndex >= images.length || used.has(span.imageIndex)) return;

    for (let row = 0; row <= gridRows - span.rowSpan; row++) {
      for (let col = 0; col <= gridColumns - span.colSpan; col++) {
        let canPlace = true;
        for (let r = row; r < row + span.rowSpan; r++) {
          for (let c = col; c < col + span.colSpan; c++) {
            if (grid[r][c]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
        if (!canPlace) continue;

        for (let r = row; r < row + span.rowSpan; r++) {
          for (let c = col; c < col + span.colSpan; c++) {
            grid[r][c] = true;
          }
        }

        layout.push({
          imageIndex: span.imageIndex,
          colSpan: span.colSpan,
          rowSpan: span.rowSpan,
          gridColumn: col + 1,
          gridRow: row + 1,
          cellIndex: layout.length
        });
        used.add(span.imageIndex);
        return;
      }
    }
  });

  let currentImageIndex = 0;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      if (grid[row][col]) continue;

      while (currentImageIndex < images.length && used.has(currentImageIndex)) currentImageIndex++;
      const imageIndex = currentImageIndex < images.length ? currentImageIndex : null;

      layout.push({
        imageIndex,
        colSpan: 1,
        rowSpan: 1,
        gridColumn: col + 1,
        gridRow: row + 1,
        cellIndex: layout.length
      });

      if (imageIndex !== null) {
        used.add(imageIndex);
        currentImageIndex++;
      }
    }
  }

  return layout;
}

export function RobotBentoGallery() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const gridColumns = 3;
  const gridRows = 2;
  const gap = 10;
  const borderRadius = 20;

  const layout = useMemo(
    () => buildGridLayout(DEFAULT_IMAGES, gridColumns, gridRows).filter(cell => cell.imageIndex !== null),
    []
  );

  const openLightbox = (index: number) => {
    startTransition(() => {
      setLightboxIndex(index);
      setLightboxOpen(true);
    });
  };

  const closeLightbox = () => {
    startTransition(() => {
      setLightboxOpen(false);
    });
  };

  const showNext = () => {
    startTransition(() => {
      setLightboxIndex(current => (current + 1) % DEFAULT_IMAGES.length);
    });
  };

  const showPrev = () => {
    startTransition(() => {
      setLightboxIndex(current => (current === 0 ? DEFAULT_IMAGES.length - 1 : current - 1));
    });
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') showNext();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') showPrev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '78vh',
        background: '#000',
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: 'min(1200px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, minmax(160px, 29vh))`,
          gap: `${gap}px`,
          padding: `${gap}px`,
          position: 'relative',
          zIndex: 2
        }}
      >
        {layout.map((cell, idx) => {
          if (cell.imageIndex === null) return null;
          const image = DEFAULT_IMAGES[cell.imageIndex] ?? DEFAULT_IMAGES[0];
          return (
            <div
              key={`${cell.cellIndex}-${idx}`}
              onClick={() => openLightbox(cell.imageIndex ?? 0)}
              style={{
                gridColumn: `${cell.gridColumn} / span ${cell.colSpan}`,
                gridRow: `${cell.gridRow} / span ${cell.rowSpan}`,
                borderRadius: `${Math.max(0, borderRadius - gap)}px`,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                transform: 'translateZ(0)',
                transition: 'transform 260ms ease'
              }}
              onMouseEnter={event => {
                event.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src={image.src}
                alt={image.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />
            </div>
          );
        })}
      </div>

      {lightboxOpen ? (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            cursor: 'pointer'
          }}
        >
          <img
            src={DEFAULT_IMAGES[lightboxIndex]?.src}
            alt={DEFAULT_IMAGES[lightboxIndex]?.alt}
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(78vw, 840px)',
              height: 'min(84vh, 760px)',
              objectFit: 'cover',
              borderRadius: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)'
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
