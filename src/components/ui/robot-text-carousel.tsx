import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SWEEP_EASE: [number, number, number, number] = [0.2, 0, 0.3, 0.3];
const FADE_MS = 250;
const GAP_MS = 70;

type FontLike = {
  fontFamily?: string;
  family?: string;
  fontWeight?: string | number;
  weight?: string | number;
  fontStyle?: string;
  style?: string;
  fontSize?: number | string;
  size?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
};

type RobotTextCarouselProps = {
  words: string[];
  sweepMs?: number;
  holdMs?: number;
  className?: string;
  font?: FontLike;
  fontSize?: number;
};

function toFontStyle(font?: FontLike) {
  if (!font) return {};
  const fontFamily = font.fontFamily ?? font.family;
  const fontWeight = font.fontWeight ?? font.weight;
  const fontStyle = font.fontStyle ?? font.style;
  const fontSize = font.fontSize ?? font.size;
  const lineHeightRaw = font.lineHeight;
  const letterSpacing = font.letterSpacing;
  const computedLineHeight =
    typeof lineHeightRaw === 'number' && typeof fontSize === 'number'
      ? `${(lineHeightRaw / 100) * fontSize}px`
      : lineHeightRaw;

  return {
    fontFamily,
    fontWeight,
    fontStyle,
    fontSize,
    lineHeight: computedLineHeight,
    letterSpacing
  };
}

export function RobotTextCarousel({
  words,
  sweepMs = 750,
  holdMs = 2000,
  className = '',
  font,
  fontSize
}: RobotTextCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const timer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!words?.length) return;
    if (timer.current) window.clearTimeout(timer.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);

    fadeTimer.current = window.setTimeout(() => {
      setFadeOut(true);
    }, Math.max(0, sweepMs + holdMs - FADE_MS - GAP_MS));

    timer.current = window.setTimeout(() => {
      setFadeOut(false);
      setIdx(i => (i + 1) % words.length);
    }, sweepMs + holdMs + GAP_MS);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, [idx, words, sweepMs, holdMs]);

  const word = words?.[idx] ?? '';
  const gradient = `
    linear-gradient(in oklch 90deg,
      #000000 0%,  #000000 30%,
      #FF0099 35%,
      #FF0000 45%,
      #FF4F04 50%,
      #FFA600 55%,
      #F8F8F8 60%,
      #0056FF 65%,
      #FFFFFF 70%, #FFFFFF 100%
    )
  `;

  const fontStyle = toFontStyle(font);
  if (typeof fontSize === 'number' && fontSize > 0) {
    fontStyle.fontSize = fontSize;
    if (!fontStyle.lineHeight) fontStyle.lineHeight = '1.2em';
  }

  const typography = {
    fontFamily: fontStyle.fontFamily,
    fontWeight: fontStyle.fontWeight,
    fontStyle: fontStyle.fontStyle,
    fontSize: fontStyle.fontSize,
    lineHeight: fontStyle.lineHeight,
    letterSpacing: fontStyle.letterSpacing
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '1.25em', overflow: 'hidden' }}>
      <span
        aria-live="polite"
        className={className}
        style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', ...typography }}
      >
        <motion.span
          key={`black-${idx}`}
          style={{
            color: '#ffffff',
            ...typography
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={
            fadeOut
              ? { duration: FADE_MS / 1000, ease: 'easeOut' }
              : { delay: (sweepMs * 0.8) / 1000, duration: 0.12, ease: 'easeOut' }
          }
        >
          {word}
        </motion.span>

        <motion.span
          key={`overlay-${idx}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '-0.30em',
            bottom: '-0.30em',
            paddingTop: '0.30em',
            paddingBottom: '0.30em',
            pointerEvents: 'none',
            backgroundOrigin: 'padding-box',
            backgroundImage: gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '400% 100%',
            willChange: 'background-position, opacity, filter',
            filter: 'blur(var(--blur))',
            ...typography
          }}
          initial={{ backgroundPositionX: '100%', opacity: 1, ['--blur' as string]: '4px' }}
          animate={{
            backgroundPositionX: '0%',
            opacity: [1, 1, 0],
            ['--blur' as string]: ['4px', '0.5px', '0px']
          }}
          transition={
            {
              backgroundPositionX: { duration: sweepMs / 1000, ease: SWEEP_EASE },
              opacity: { duration: sweepMs / 1000, times: [0, 0.985, 1], ease: 'linear' },
              ['--blur' as string]: { duration: sweepMs / 1000, times: [0, 0.8, 1], ease: 'easeOut' }
            } as any
          }
        >
          {word}
        </motion.span>
      </span>
    </div>
  );
}
