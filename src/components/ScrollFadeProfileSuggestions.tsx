import { Children, useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

type AnimationEasing = 'spring' | 'easeIn' | 'easeOut' | 'easeInOut' | 'linear';

export type ProfileSuggestionItem = {
  id: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
};

type ScrollScatterProps = {
  children: ReactNode;
  scatterDistance?: number;
  imageSize?: number;
  imageEndSize?: number;
  imageRadius?: number;
  scrollStart?: number;
  scrollEnd?: number;
  rotationAngle?: number;
  animationEasing?: AnimationEasing;
  style?: CSSProperties;
};

function ScrollScatter({
  children,
  scatterDistance = 100,
  imageSize = 400,
  imageEndSize = 200,
  imageRadius = 80,
  scrollStart = 0,
  scrollEnd = 1,
  rotationAngle = 360,
  animationEasing = 'spring',
  style
}: ScrollScatterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const scatterData = [
    { x: -250, y: -330, scale: 0.5, rotate: -5 },
    { x: -450, y: -220, scale: 0.42, rotate: -7 },
    { x: -380, y: 190, scale: 0.5, rotate: 6 },
    { x: -150, y: 320, scale: 0.35, rotate: 4 },
    { x: 340, y: -390, scale: 0.46, rotate: 5 },
    { x: 500, y: -280, scale: 0.4, rotate: -4 },
    { x: 420, y: 200, scale: 0.4, rotate: 4 },
    { x: 210, y: 340, scale: 0.4, rotate: -6 }
  ];

  const scatterMultiplier = scatterDistance / 100;

  const getTransition = (delay: number) => {
    if (animationEasing === 'spring') {
      return { type: 'spring' as const, stiffness: 100, damping: 20, delay };
    }

    return { type: 'tween' as const, ease: animationEasing, duration: 0.6, delay };
  };

  const childrenArray = Children.toArray(children).slice(0, 8);
  const totalImages = childrenArray.length;

  const handleImageKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, index: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (index + 1) % totalImages;
        setFocusedImageIndex(nextIndex);
        const nextElement = document.getElementById(`scatter-image-${nextIndex}`);
        nextElement?.focus();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (index - 1 + totalImages) % totalImages;
        setFocusedImageIndex(prevIndex);
        const prevElement = document.getElementById(`scatter-image-${prevIndex}`);
        prevElement?.focus();
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setFocusedImageIndex(0);
        const firstElement = document.getElementById('scatter-image-0');
        firstElement?.focus();
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        const lastIndex = totalImages - 1;
        setFocusedImageIndex(lastIndex);
        const lastElement = document.getElementById(`scatter-image-${lastIndex}`);
        lastElement?.focus();
      }
    },
    [totalImages]
  );

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: imageSize,
        minHeight: imageSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible'
      }}
      role="region"
      aria-label="Image scatter effect container"
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
        role="group"
        aria-label={`Image gallery with ${totalImages} images`}
      >
        {childrenArray.map((child, index) => {
          const scatter = scatterData[index];

          const staggerDelay = index * 0.05;
          const staggerAmount = staggerDelay * 0.15;
          const adjustedStart = Math.min(scrollStart + staggerAmount, scrollEnd - 0.1);
          const adjustedEnd = Math.min(scrollEnd + staggerAmount, 1);

          const x = useTransform(scrollYProgress, [adjustedStart, adjustedEnd], [0, scatter.x * scatterMultiplier]);
          const y = useTransform(scrollYProgress, [adjustedStart, adjustedEnd], [0, scatter.y * scatterMultiplier]);
          const scale = useTransform(scrollYProgress, [adjustedStart, adjustedEnd], [1, imageEndSize / imageSize]);
          const rotate = useTransform(scrollYProgress, [adjustedStart, adjustedEnd], [0, rotationAngle]);

          return (
            <motion.div
              key={index}
              id={`scatter-image-${index}`}
              tabIndex={0}
              role="img"
              aria-label={`Gallery image ${index + 1} of ${totalImages}. Use arrow keys to navigate between images.`}
              onKeyDown={e => handleImageKeyDown(e, index)}
              onFocus={() => setFocusedImageIndex(index)}
              onBlur={() => setFocusedImageIndex(null)}
              style={{
                position: 'absolute',
                width: imageSize,
                height: imageSize,
                borderRadius: imageRadius,
                overflow: 'hidden',
                x,
                y,
                scale,
                rotate,
                outline: focusedImageIndex === index ? '3px solid #0099FF' : 'none',
                outlineOffset: '4px',
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
              transition={getTransition(staggerDelay)}
            >
              {child}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScrollFadeProfileSuggestions({ items }: { items: ProfileSuggestionItem[] }) {
  const children = items.slice(0, 8).map((item, index) => (
    <div key={item.id} className="h-full w-full bg-zinc-900">
      <img src={item.avatarUrl} alt={item.displayName || `Suggestion ${index + 1}`} className="h-full w-full object-cover" />
    </div>
  ));

  return (
    <section className="relative h-[220vh] overflow-hidden bg-black">
      <div className="sticky top-0 h-screen">
        <ScrollScatter
          scatterDistance={100}
          imageSize={400}
          imageEndSize={200}
          imageRadius={80}
          scrollStart={0}
          scrollEnd={1}
          rotationAngle={360}
          animationEasing="spring"
          style={{ width: '100%', height: '100%' }}
        >
          {children}
        </ScrollScatter>
      </div>
    </section>
  );
}
