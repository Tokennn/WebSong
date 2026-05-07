'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMemo, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export type RubixProfileItem = {
  id: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
};

type RubixImageCubeProps = {
  items: RubixProfileItem[];
};

type CubeFace = {
  key: string;
  transform: string;
};

const FACES: CubeFace[] = [
  { key: 'front', transform: 'rotateY(0deg) translateZ(var(--cube-half))' },
  { key: 'right', transform: 'rotateY(90deg) translateZ(var(--cube-half))' },
  { key: 'back', transform: 'rotateY(180deg) translateZ(var(--cube-half))' },
  { key: 'left', transform: 'rotateY(-90deg) translateZ(var(--cube-half))' },
  { key: 'top', transform: 'rotateX(90deg) translateZ(var(--cube-half))' },
  { key: 'bottom', transform: 'rotateX(-90deg) translateZ(var(--cube-half))' }
];

function FaceGrid({
  items,
  faceIndex,
  transform
}: {
  items: RubixProfileItem[];
  faceIndex: number;
  transform: string;
}) {
  const faceItems = useMemo(
    () => Array.from({ length: 9 }, (_, index) => items[(faceIndex * 9 + index) % items.length]),
    [faceIndex, items]
  );

  return (
    <div
      style={{ transform }}
      className="absolute inset-0 grid grid-cols-3 gap-2 rounded-2xl border border-white/20 bg-black/70 p-2 shadow-[inset_0_0_36px_rgba(255,255,255,0.06)] [backface-visibility:hidden]"
    >
      {faceItems.map((item, index) => (
        <Link
          key={`${item.id}-${faceIndex}-${index}`}
          to={`/about-you/${item.id}`}
          state={{ profile: item }}
          className="group relative overflow-hidden rounded-lg border border-white/15 bg-zinc-900"
        >
          <img src={item.avatarUrl} alt={item.displayName} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5">
            <p className="truncate text-[10px] leading-tight font-medium text-white sm:text-xs">{item.displayName}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function RubixImageCube({ items }: RubixImageCubeProps) {
  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
    captured: false,
    startRotateX: 0,
    startRotateY: 0
  });

  const safeItems = useMemo(() => {
    if (items.length > 0) return items;
    return [
      {
        id: 'fallback-empty',
        displayName: 'WebSong User',
        headline: 'Music profile',
        avatarUrl: 'https://picsum.photos/seed/websong-empty/1200/1200'
      }
    ];
  }, [items]);

  const baseRotateX = 18;
  const baseRotateY = -24;

  const dragRotateX = useMotionValue(0);
  const dragRotateY = useMotionValue(0);
  const smoothDragRotateX = useSpring(dragRotateX, { stiffness: 190, damping: 24, mass: 0.5 });
  const smoothDragRotateY = useSpring(dragRotateY, { stiffness: 190, damping: 24, mass: 0.5 });

  const rotateX = useTransform(smoothDragRotateX, value => baseRotateX + value);
  const rotateY = useTransform(smoothDragRotateY, value => baseRotateY + value);

  const cubeVars = {
    '--cube-size': 'clamp(220px, 56vw, 620px)',
    '--cube-half': 'calc(clamp(220px, 56vw, 620px) / 2)'
  } as CSSProperties;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current.active = true;
    dragStateRef.current.pointerId = event.pointerId;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startY = event.clientY;
    dragStateRef.current.moved = false;
    dragStateRef.current.captured = false;
    dragStateRef.current.startRotateX = dragRotateX.get();
    dragStateRef.current.startRotateY = dragRotateY.get();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const sensitivity = 0.22;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.moved = true;
      if (!state.captured) {
        event.currentTarget.setPointerCapture(event.pointerId);
        state.captured = true;
      }
    }

    if (!state.moved) return;

    const nextRotateY = state.startRotateY + deltaX * sensitivity;
    const nextRotateX = Math.max(-90, Math.min(90, state.startRotateX - deltaY * sensitivity));
    dragRotateY.set(nextRotateY);
    dragRotateX.set(nextRotateX);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (dragStateRef.current.captured && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = -1;
    dragStateRef.current.captured = false;
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragStateRef.current.moved = false;
    }
  };

  return (
    <section className="relative min-h-screen bg-black">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-4">
        <div className="pointer-events-none absolute h-[90vmin] w-[90vmin] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.05)_30%,transparent_68%)] blur-2xl" />

        <div
          className="relative z-10 cursor-grab select-none [perspective:1600px] active:cursor-grabbing"
          style={cubeVars}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onClickCapture={handleClickCapture}
        >
          <motion.div style={{ rotateX, rotateY }} className="relative h-[var(--cube-size)] w-[var(--cube-size)] touch-none [transform-style:preserve-3d]">
            {FACES.map((face, faceIndex) => (
              <FaceGrid key={face.key} items={safeItems} faceIndex={faceIndex} transform={face.transform} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
