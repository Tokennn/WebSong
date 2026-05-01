import { startTransition, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type InternalCard = {
  id: number;
  component: ReactNode;
};

type CardState = {
  position: number;
  delay: number;
};

type SequentialCarouselProps = {
  cards: ReactNode[];
  cardGap?: number;
  animationDuration?: number;
  sequenceDelay?: number;
  backgroundColor?: string;
  hideBackground?: boolean;
  animationOrigin?: number;
  fadeStartIndex?: number;
  showNavigation?: boolean;
};

export default function SequentialCarousel({
  cards: cardComponents,
  cardGap = 280,
  animationDuration = 600,
  sequenceDelay = 80,
  backgroundColor = '#1e293b',
  hideBackground = false,
  animationOrigin = 0,
  fadeStartIndex = 2,
  showNavigation = true
}: SequentialCarouselProps) {
  const originalCards = useMemo<InternalCard[]>(
    () => cardComponents.map((component, i) => ({ id: i + 1, component })),
    [cardComponents]
  );

  const cards = useMemo<InternalCard[]>(() => {
    if (originalCards.length === 0) return [];
    const repeatCount = 40;
    const repeated: InternalCard[] = [];
    for (let i = 0; i < repeatCount; i += 1) repeated.push(...originalCards);
    return repeated;
  }, [originalCards]);

  const startIndex = useMemo(() => {
    if (originalCards.length === 0) return 0;
    return Math.floor(cards.length / 2);
  }, [cards.length, originalCards.length]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cardStates, setCardStates] = useState<Map<number, CardState>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getCardStyle = (position: number, animate: boolean, delay = 0): CSSProperties => {
    const absPosition = Math.abs(position);
    let cumulativeTranslateX = 0;

    if (position !== 0) {
      const direction = position > 0 ? 1 : -1;
      for (let i = 1; i <= absPosition; i += 1) {
        const gapMultiplier = Math.max(0.3, 1 - (i - 1) * 0.15);
        cumulativeTranslateX += cardGap * gapMultiplier * direction;
      }
    }

    const scale = position === 0 ? 1 : Math.max(0.65, 1 - absPosition * 0.12);
    const opacity = absPosition <= fadeStartIndex ? 1 : 0;
    const zIndex = 20 - absPosition;
    const translateY = animationOrigin * absPosition * absPosition;
    const easing = 'ease-in-out';

    return {
      position: 'absolute',
      borderRadius: 16,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `translateX(${cumulativeTranslateX}px) translateY(${translateY}px) scale(${scale})`,
      opacity,
      zIndex,
      transition: animate ? `all ${animationDuration}ms ${easing} ${delay}ms` : 'none'
    };
  };

  const calculateCardStates = (newIndex: number, animate: boolean): Map<number, CardState> => {
    const newStates = new Map<number, CardState>();
    const threshold = 15;

    cards.forEach((_, index) => {
      const position = index - newIndex;
      const absPosition = Math.abs(position);
      if (absPosition > threshold + 5) return;

      let delay = 0;
      if (animate) {
        const direction = newIndex > currentIndex ? 1 : -1;
        if (direction > 0) {
          if (position < 0) delay = Math.max(0, (threshold - Math.abs(position)) * sequenceDelay);
          else if (position > 0) delay = (threshold + position) * sequenceDelay;
          else delay = threshold * sequenceDelay;
        } else {
          if (position > 0) delay = Math.max(0, (threshold - position) * sequenceDelay);
          else if (position < 0) delay = (threshold + Math.abs(position)) * sequenceDelay;
          else delay = threshold * sequenceDelay;
        }
      }

      newStates.set(index, { position, delay });
    });

    return newStates;
  };

  useEffect(() => {
    const initialStates = calculateCardStates(startIndex, false);
    startTransition(() => {
      setCurrentIndex(startIndex);
      setCardStates(initialStates);
    });
    // We intentionally sync when data changes and re-center the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex, cards.length]);

  const finishAnimation = (newIndex: number, resetIndex: number) => {
    const totalAnimationTime = 15 * sequenceDelay + animationDuration + 200;
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      startTransition(() => setIsAnimating(false));

      if (newIndex !== resetIndex) {
        const resetStates = calculateCardStates(resetIndex, false);
        startTransition(() => {
          setCurrentIndex(resetIndex);
          setCardStates(resetStates);
        });
      }
    }, totalAnimationTime);
  };

  const advanceCarousel = () => {
    if (isAnimating) return;
    startTransition(() => setIsAnimating(true));

    const newIndex = currentIndex + 1;
    const newStates = calculateCardStates(newIndex, true);
    startTransition(() => {
      setCurrentIndex(newIndex);
      setCardStates(newStates);
    });

    const shouldResetAt = startIndex + originalCards.length * 5;
    const resetIndex = newIndex >= shouldResetAt ? newIndex - originalCards.length * 5 : newIndex;
    finishAnimation(newIndex, resetIndex);
  };

  const goToPrevious = () => {
    if (isAnimating) return;
    startTransition(() => setIsAnimating(true));

    const newIndex = currentIndex - 1;
    const newStates = calculateCardStates(newIndex, true);
    startTransition(() => {
      setCurrentIndex(newIndex);
      setCardStates(newStates);
    });

    const shouldResetAt = startIndex - originalCards.length * 5;
    const resetIndex = newIndex <= shouldResetAt ? newIndex + originalCards.length * 5 : newIndex;
    finishAnimation(newIndex, resetIndex);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: hideBackground ? 'transparent' : backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        position: 'relative',
        padding: 20
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {showNavigation ? (
          <>
            <button
              onClick={goToPrevious}
              disabled={isAnimating}
              style={{
                position: 'absolute',
                left: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 100,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                opacity: isAnimating ? 0.5 : 1
              }}
              aria-label="Previous"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={advanceCarousel}
              disabled={isAnimating}
              style={{
                position: 'absolute',
                right: 20,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 100,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                opacity: isAnimating ? 0.5 : 1
              }}
              aria-label="Next"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        ) : null}

        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cards.map((card, index) => {
              const state = cardStates.get(index);
              if (!state) return null;

              const { position, delay } = state;
              const absPosition = Math.abs(position);
              if (absPosition > 15) return null;

              const darknessAmount = position === 0 ? 0 : Math.min(0.4, absPosition * 0.06 + 0.05);
              return (
                <div key={`${card.id}-${index}`} style={getCardStyle(position, isAnimating, delay)}>
                  <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: `rgba(0, 0, 0, ${darknessAmount})`,
                        borderRadius: 16,
                        zIndex: 1,
                        transition: isAnimating ? `background-color ${animationDuration}ms ease-in-out ${delay}ms` : 'none'
                      }}
                    />
                    <div style={{ position: 'relative', zIndex: 0 }}>{card.component}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
