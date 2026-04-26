import { memo, type CSSProperties, type PropsWithChildren, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

type BlurPosition = 'top' | 'bottom' | 'left' | 'right';
type BlurCurve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';
type BlurAnimationMode = boolean | 'scroll';
type BlurTarget = 'parent' | 'page';

export type GradualBlurProps = PropsWithChildren<{
  position?: BlurPosition;
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  zIndex?: number;
  animated?: BlurAnimationMode;
  duration?: string;
  easing?: string;
  opacity?: number;
  curve?: BlurCurve;
  responsive?: boolean;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
  preset?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'subtle'
    | 'intense'
    | 'smooth'
    | 'sharp'
    | 'header'
    | 'footer'
    | 'sidebar'
    | 'page-header'
    | 'page-footer';
  gpuOptimized?: boolean;
  hoverIntensity?: number;
  target?: BlurTarget;
  onAnimationComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}>;

type ResolvedConfig = Required<GradualBlurProps>;

const DEFAULT_CONFIG: Partial<GradualBlurProps> = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  width: '',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  gpuOptimized: true,
  className: '',
  style: {}
};

const PRESETS: Record<string, Partial<GradualBlurProps>> = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', width: '6rem' },
  right: { position: 'right', width: '6rem' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', width: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 }
};

const CURVE_FUNCTIONS: Record<BlurCurve, (progress: number) => number> = {
  linear: progress => progress,
  bezier: progress => progress * progress * (3 - 2 * progress),
  'ease-in': progress => progress * progress,
  'ease-out': progress => 1 - Math.pow(1 - progress, 2),
  'ease-in-out': progress => (progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2)
};

const mergeConfigs = (...configs: Partial<GradualBlurProps>[]): Partial<GradualBlurProps> => {
  return configs.reduce((acc, config) => ({ ...acc, ...config }), {});
};

const getGradientDirection = (position: BlurPosition): string => {
  const directions: Record<BlurPosition, string> = {
    top: 'to top',
    bottom: 'to bottom',
    left: 'to left',
    right: 'to right'
  };
  return directions[position];
};

const debounce = <T extends (...args: never[]) => void>(fn: T, wait: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), wait);
  };
};

const useResponsiveDimension = (
  responsive: boolean,
  config: ResolvedConfig,
  key: 'height' | 'width'
): string | undefined => {
  const [value, setValue] = useState<string | undefined>(config[key] || undefined);

  useEffect(() => {
    if (!responsive) return;

    const computeValue = () => {
      const screenWidth = window.innerWidth;
      let nextValue = config[key] || undefined;

      const mobileKey = key === 'height' ? config.mobileHeight : config.mobileWidth;
      const tabletKey = key === 'height' ? config.tabletHeight : config.tabletWidth;
      const desktopKey = key === 'height' ? config.desktopHeight : config.desktopWidth;

      if (screenWidth <= 480 && mobileKey) {
        nextValue = mobileKey;
      } else if (screenWidth <= 768 && tabletKey) {
        nextValue = tabletKey;
      } else if (screenWidth <= 1024 && desktopKey) {
        nextValue = desktopKey;
      }

      setValue(nextValue);
    };

    const debouncedCompute = debounce(computeValue, 100);
    computeValue();
    window.addEventListener('resize', debouncedCompute);
    return () => window.removeEventListener('resize', debouncedCompute);
  }, [config, key, responsive]);

  return responsive ? value : config[key] || undefined;
};

const useIntersectionObserver = (ref: React.RefObject<HTMLDivElement | null>, shouldObserve: boolean): boolean => {
  const [isVisible, setIsVisible] = useState(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      threshold: 0.1
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
};

function GradualBlur({
  children,
  ...props
}: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo<ResolvedConfig>(() => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, props) as ResolvedConfig;
  }, [props]);

  const responsiveHeight = useResponsiveDimension(Boolean(config.responsive), config, 'height');
  const responsiveWidth = useResponsiveDimension(Boolean(config.responsive), config, 'width');
  const isVisible = useIntersectionObserver(containerRef, config.animated === 'scroll');

  const blurLayers = useMemo<ReactNode[]>(() => {
    const layers: ReactNode[] = [];
    const increment = 100 / config.divCount;
    const hoverMultiplier = isHovered && config.hoverIntensity ? config.hoverIntensity : 1;
    const currentStrength = config.strength * hoverMultiplier;
    const curveFn = CURVE_FUNCTIONS[config.curve];

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFn(progress);

      const blurValue = config.exponential
        ? Number(Math.pow(2, progress * 4)) * 0.0625 * currentStrength
        : 0.0625 * (progress * config.divCount + 1) * currentStrength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position);
      const layerStyle: CSSProperties = {
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
        willChange: config.gpuOptimized ? 'backdrop-filter, opacity' : undefined,
        transform: config.gpuOptimized ? 'translateZ(0)' : undefined,
        transition:
          config.animated && config.animated !== 'scroll'
            ? `backdrop-filter ${config.duration} ${config.easing}, opacity ${config.duration} ${config.easing}`
            : undefined
      };

      layers.push(<div key={i} className="absolute inset-0" style={layerStyle} />);
    }

    return layers;
  }, [config, isHovered]);

  const containerStyle = useMemo<CSSProperties>(() => {
    const isVertical = config.position === 'top' || config.position === 'bottom';
    const isPageTarget = config.target === 'page';
    const style: CSSProperties = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: config.hoverIntensity ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style
    };

    if (isVertical) {
      style.height = responsiveHeight || '6rem';
      style.width = responsiveWidth || '100%';
      style.left = 0;
      style.right = 0;
      style[config.position] = 0;
    } else {
      style.width = responsiveWidth || responsiveHeight || '6rem';
      style.height = '100%';
      style.top = 0;
      style.bottom = 0;
      style[config.position] = 0;
    }

    return style;
  }, [config, isVisible, responsiveHeight, responsiveWidth]);

  useEffect(() => {
    if (!isVisible || config.animated !== 'scroll' || !config.onAnimationComplete) return;
    const timeoutId = setTimeout(() => {
      config.onAnimationComplete?.();
    }, Math.max(0, Number.parseFloat(config.duration) * 1000));
    return () => clearTimeout(timeoutId);
  }, [config, isVisible]);

  return (
    <div
      ref={containerRef}
      className={[
        'gradual-blur',
        'relative',
        'isolate',
        config.target === 'page' ? 'gradual-blur-page' : 'gradual-blur-parent',
        config.className
      ]
        .filter(Boolean)
        .join(' ')}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="relative h-full w-full">{blurLayers}</div>
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}

const GradualBlurMemo = memo(GradualBlur);
GradualBlurMemo.displayName = 'GradualBlur';

export default GradualBlurMemo;
