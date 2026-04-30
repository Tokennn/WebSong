import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1504198266287-1659872e6590?w=800',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800'
];

const FIRST_GRID_INDICES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
];

const SCROLL_MARQUEE_TEXT =
  'Enabling the discovery of a musical style, an artist, or anything else has never been more precious, because without music, humanity cannot live.';
const MARQUEE_REPEAT = 2;

const CSS_ID = 'robot-s3d-grid-styles';
const CSS_TEXT = `
.s3d-root *,
.s3d-root *::after,
.s3d-root *::before { box-sizing: border-box; }

.s3d-root {
  --color-text: #fff;
  --color-bg: #000;
  --grid-width: 100%;
  --grid-max-width: 300px;
  --grid-item-ratio: 1.2;
  --grid-item-radius: 4px;
  --grid-gap: 2rem;
  --grid-columns: 2;
  font-size: 16px;
  color: var(--color-text);
  background-color: var(--color-bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

.s3d-root .font-alt { font-family: "Courier New", ui-monospace, monospace; font-weight: 400; letter-spacing: 0.02em; }
.s3d-root .shadow { position: relative; overflow: hidden; width: 100%; }
.s3d-root .mark {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 100vw;
  left: 0;
  z-index: 50;
  overflow: hidden;
  pointer-events: none;
}
.s3d-root .mark__inner {
  display: flex;
  gap: 3rem;
  width: max-content;
  position: relative;
  transform: translateX(100vw);
  will-change: transform;
}
.s3d-root .mark__inner span {
  white-space: nowrap;
  text-transform: uppercase;
  font-size: 3rem;
  line-height: 1;
}
.s3d-root section { display: grid; place-items: center; width: 100%; position: relative; }
.s3d-root .shadow::after {
  content: '';
  top: 0;
  left: 0;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 5000;
  pointer-events: none;
  background: linear-gradient(to right, var(--color-bg), transparent, var(--color-bg));
  background-repeat: no-repeat;
  background-size: 100%;
}
.s3d-root .grid {
  padding: 20vh 0;
  width: var(--grid-width);
  max-width: var(--grid-max-width);
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  position: relative;
  display: grid;
  gap: var(--grid-gap);
  margin-top: 20vh;
  margin-bottom: 10vh;
}
.s3d-root .grid__item {
  margin: 0;
  position: relative;
  z-index: 1;
  perspective: 800px;
  will-change: transform, opacity;
}
.s3d-root .grid__item-imgwrap {
  width: 100%;
  aspect-ratio: var(--grid-item-ratio);
  border-radius: var(--grid-item-radius);
  transform-style: preserve-3d;
  position: relative;
  overflow: hidden;
  will-change: filter, transform;
}
.s3d-root .grid__item-img {
  background-size: cover;
  background-position: 50% 20%;
  backface-visibility: hidden;
  will-change: transform;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

@keyframes robot-s3d-pulse {
  0%, 100% { transform: scale(1); opacity: .45; }
  50% { transform: scale(1.18); opacity: .9; }
}
`;

type GridWrap = {
  el: HTMLElement;
  imgEl: HTMLElement | null;
  leftSide: boolean;
};

function injectCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sineIn = (t: number) => 1 - Math.cos((t * Math.PI) / 2);
const sineOut = (t: number) => Math.sin((t * Math.PI) / 2);

function getTriggerProgress(el: HTMLElement, startLabel = 'top bottom', endLabel = 'bottom top') {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const startY = startLabel === 'top bottom+=10%' ? vh + vh * 0.1 : vh;

  const h = rect.height;
  let endY: number;
  if (endLabel === 'bottom top-=25%') endY = -h - vh * 0.25;
  else if (endLabel === 'bottom top' || endLabel === 'clamp(bottom top)') endY = -h;
  else if (endLabel === 'center center') endY = vh / 2 - h / 2;
  else if (endLabel === 'center center-=25%') endY = vh / 2 - h / 2 - vh * 0.25;
  else endY = -h;

  return clamp((startY - rect.top) / (startY - endY), 0, 1);
}

export function RobotStaggered3DGrid() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const images = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 20; i++) out.push(DEFAULT_IMAGES[i % DEFAULT_IMAGES.length]);
    return out;
  }, []);

  const getImg = (n: number) => images[(n - 1) % 20];
  const gridIndices = useMemo(
    () => (compactMode ? FIRST_GRID_INDICES.slice(0, 28) : FIRST_GRID_INDICES),
    [compactMode]
  );

  useEffect(() => {
    injectCSS();
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const compactQuery = window.matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)');
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = () => {
      setCompactMode(compactQuery.matches);
      setReducedMotion(reduceQuery.matches);
    };

    apply();
    compactQuery.addEventListener('change', apply);
    reduceQuery.addEventListener('change', apply);

    return () => {
      compactQuery.removeEventListener('change', apply);
      reduceQuery.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    const root = rootRef.current;
    if (!root) return;

    root.style.setProperty('--color-bg', '#000');
    root.style.setProperty('--color-text', '#fff');
    root.style.setProperty('--grid-columns', compactMode ? '1' : '2');
    root.style.setProperty('--grid-gap', compactMode ? '1.25rem' : '2rem');
    root.style.setProperty('--grid-max-width', compactMode ? '240px' : '300px');
    root.style.setProperty('--grid-item-ratio', '1.2');
    root.style.setProperty('--grid-item-radius', '4px');

    let rafId = 0;
    let destroyed = false;
    let isVisible = true;
    let fallbackTimerId: number | null = null;
    let lastFrameTime = 0;

    const targetFrameMs = reducedMotion ? 1000 / 24 : compactMode ? 1000 / 45 : 1000 / 60;
    const motionScale = reducedMotion ? 0.25 : compactMode ? 0.62 : 1;
    const blurScale = reducedMotion ? 0 : compactMode ? 0.45 : 1;

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(entries => {
        isVisible = Boolean(entries[0]?.isIntersecting);
      });
      intersectionObserver.observe(root);
    }

    const gridWraps: GridWrap[] = [];
    const firstGridEl = root.querySelector('.grid') as HTMLElement | null;
    if (firstGridEl) {
      const wraps = Array.from(firstGridEl.querySelectorAll('.grid__item-imgwrap')) as HTMLElement[];
      wraps.forEach(el => {
        const imgEl = el.querySelector('.grid__item-img') as HTMLElement | null;
        const rect = el.getBoundingClientRect();
        const elementCenter = rect.left + el.offsetWidth / 2;
        const viewportCenter = window.innerWidth / 2;
        gridWraps.push({ el, imgEl, leftSide: elementCenter < viewportCenter });
      });
    }

    const marqueeInner = root.querySelector('.mark > .mark__inner') as HTMLElement | null;

    const tick = (time: number) => {
      if (destroyed) return;
      if (!isVisible) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      if (time - lastFrameTime < targetFrameMs) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      lastFrameTime = time;

      gridWraps.forEach(({ el, imgEl, leftSide }) => {
        const p = getTriggerProgress(el, 'top bottom+=10%', 'bottom top-=25%');
        let wrapTransform = '';
        let wrapFilter = '';
        let imgTransform = '';

        if (p <= 0.5) {
          const t = sineOut(p * 2);
          const z = lerp(300 * motionScale, 0, t);
          const rx = lerp(70 * motionScale, 0, t);
          const rz = lerp((leftSide ? 5 : -5) * motionScale, 0, t);
          const xp = lerp((leftSide ? -40 : 40) * motionScale, 0, t);
          const skew = lerp((leftSide ? -20 : 20) * motionScale, 0, t);
          const yp = lerp(100 * motionScale, 0, t);
          wrapTransform = `translate3d(${xp}%, ${yp}%, ${z}px) rotateX(${rx}deg) rotateZ(${rz}deg) skewX(${skew}deg)`;
          wrapFilter = `blur(${lerp(7 * blurScale, 0, t).toFixed(2)}px) brightness(${lerp(15, 100, t).toFixed(0)}%) contrast(${lerp(260, 100, t).toFixed(0)}%)`;
          imgTransform = `scaleY(${lerp(1.8 * Math.max(motionScale, 0.7), 1, t)})`;
        } else {
          const t = sineIn((p - 0.5) * 2);
          const z = lerp(0, 300 * motionScale, t);
          const rx = lerp(0, -50 * motionScale, t);
          const rz = lerp(0, (leftSide ? -1 : 1) * motionScale, t);
          const xp = lerp(0, (leftSide ? -20 : 20) * motionScale, t);
          const skew = lerp(0, (leftSide ? 10 : -10) * motionScale, t);
          wrapTransform = `translate3d(${xp}%, 0%, ${z}px) rotateX(${rx}deg) rotateZ(${rz}deg) skewX(${skew}deg)`;
          wrapFilter = `blur(${lerp(0, 4 * blurScale, t).toFixed(2)}px) brightness(${lerp(100, 15, t).toFixed(0)}%) contrast(${lerp(100, 320, t).toFixed(0)}%)`;
          imgTransform = `scaleY(${lerp(1, 1.8 * Math.max(motionScale, 0.7), t)})`;
        }

        el.style.transform = wrapTransform;
        el.style.filter = wrapFilter;
        if (imgEl) imgEl.style.transform = imgTransform;
      });

      if (marqueeInner && firstGridEl) {
        const p = getTriggerProgress(firstGridEl, 'top bottom', 'bottom top');
        const fromX = window.innerWidth;
        const toX = -(marqueeInner.offsetWidth || 1000);
        marqueeInner.style.transform = `translate3d(${lerp(fromX, toX, sineOut(p))}px, 0, 0)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    let loadedCount = 0;
    const totalImages = images.length;
    let loadingPending = true;

    images.forEach(url => {
      const img = new Image();
      const done = () => {
        loadedCount += 1;
        if (loadedCount === totalImages && loadingPending) {
          loadingPending = false;
          setLoading(false);
        }
      };
      img.onload = done;
      img.onerror = done;
      img.src = url;
    });

    fallbackTimerId = window.setTimeout(() => {
      if (loadingPending) {
        loadingPending = false;
        setLoading(false);
      }
    }, 5000);

    rafId = window.requestAnimationFrame(tick);

    const onResize = () => {
      gridWraps.forEach(entry => {
        const rect = entry.el.getBoundingClientRect();
        const elementCenter = rect.left + entry.el.offsetWidth / 2;
        entry.leftSide = elementCenter < window.innerWidth / 2;
      });
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      intersectionObserver?.disconnect();
    };
  }, [compactMode, images, ready, reducedMotion]);

  return (
    <div ref={rootRef} className="s3d-root" style={{ width: '100%', minHeight: '100vh' }}>
      {loading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.45,
              animation: 'robot-s3d-pulse 1s ease-in-out infinite'
            }}
          />
        </div>
      ) : null}

      <main className="shadow">
        <section>
          <div className="grid">
            {gridIndices.map((n, i) => (
              <figure key={`g1-${i}`} className="grid__item">
                <div className="grid__item-imgwrap">
                  <div className="grid__item-img" style={{ backgroundImage: `url(${getImg(n)})` }} />
                </div>
              </figure>
            ))}
          </div>

          <div className="mark">
            <div className="mark__inner font-alt">
              {Array.from({ length: MARQUEE_REPEAT }).map((_, i) => (
                <span key={`marquee-${i}`}>{SCROLL_MARQUEE_TEXT}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
