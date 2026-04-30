import { cn } from '@/lib/utils';
import React, {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Gem,
  Loader,
  Lock,
  Mail,
  PartyPopper,
  X
} from 'lucide-react';
import { AnimatePresence, motion, useInView, type Transition, type Variants } from 'framer-motion';

import confetti from 'canvas-confetti';
import type {
  CreateTypes as ConfettiInstance,
  GlobalOptions as ConfettiGlobalOptions,
  Options as ConfettiOptions
} from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import Grainient from '@/components/Grainient';
import GradientText from '@/components/GradientText';
import ShinyText from '@/components/ShinyText';
import { supabase } from '@/lib/supabase';

type Api = { fire: (options?: ConfettiOptions) => void };
export type ConfettiRef = Api | null;

const Confetti = forwardRef<
  ConfettiRef,
  React.ComponentPropsWithRef<'canvas'> & {
    options?: ConfettiOptions;
    globalOptions?: ConfettiGlobalOptions;
    manualstart?: boolean;
  }
>((props, ref) => {
  const { options, globalOptions = { resize: true, useWorker: true }, manualstart = false, ...rest } = props;

  const instanceRef = useRef<ConfettiInstance | null>(null);

  const canvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node !== null) {
        if (instanceRef.current) return;
        instanceRef.current = confetti.create(node, { ...globalOptions, resize: true });
      } else if (instanceRef.current) {
        instanceRef.current.reset();
        instanceRef.current = null;
      }
    },
    [globalOptions]
  );

  const fire = useCallback((opts = {}) => instanceRef.current?.({ ...options, ...opts }), [options]);
  const api = useMemo(() => ({ fire }), [fire]);

  useImperativeHandle(ref, () => api, [api]);
  useEffect(() => {
    if (!manualstart) fire();
  }, [manualstart, fire]);

  return <canvas ref={canvasRef} {...rest} />;
});
Confetti.displayName = 'Confetti';

type TextLoopProps = {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
  stopOnEnd?: boolean;
};

export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
  stopOnEnd = false
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);

  useEffect(() => {
    const intervalMs = interval * 1000;
    const timer = setInterval(() => {
      setCurrentIndex(current => {
        if (stopOnEnd && current === items.length - 1) {
          clearInterval(timer);
          return current;
        }
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, stopOnEnd]);

  const motionVariants: Variants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 }
  };

  return (
    <div className={cn('relative inline-block whitespace-nowrap', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          variants={variants || motionVariants}
        >
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: { hidden: { y: number }; visible: { y: number } };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?:
    | `${number}px`
    | `${number}px ${number}px`
    | `${number}px ${number}px ${number}px`
    | `${number}px ${number}px ${number}px ${number}px`;
  blur?: string;
}

function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = true,
  inViewMargin = '-50px',
  blur = '6px'
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;

  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: 'blur(0px)' }
  };

  const combinedVariants = variant || defaultVariants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      exit="hidden"
      variants={combinedVariants}
      transition={{ delay: 0.04 + delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const glassButtonVariants = cva('relative isolate all-unset cursor-pointer rounded-full transition-all', {
  variants: {
    size: {
      default: 'text-base font-medium',
      sm: 'text-sm font-medium',
      lg: 'text-lg font-medium',
      icon: 'h-10 w-10'
    }
  },
  defaultVariants: {
    size: 'default'
  }
});

const glassButtonTextVariants = cva('glass-button-text relative block select-none tracking-tighter', {
  variants: {
    size: {
      default: 'px-6 py-3.5',
      sm: 'px-4 py-2',
      lg: 'px-8 py-4',
      icon: 'flex h-10 w-10 items-center justify-center'
    }
  },
  defaultVariants: {
    size: 'default'
  }
});

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, onClick, ...props }, ref) => {
    const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const button = e.currentTarget.querySelector('button');
      if (button && e.target !== button) button.click();
    };

    return (
      <div className={cn('glass-button-wrap relative cursor-pointer rounded-full', className)} onClick={handleWrapperClick}>
        <button className={cn('glass-button relative z-10', glassButtonVariants({ size }))} ref={ref} onClick={onClick} {...props}>
          <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>{children}</span>
        </button>
        <div className="glass-button-shadow pointer-events-none rounded-full" />
      </div>
    );
  }
);
GlassButton.displayName = 'GlassButton';

const GradientBackground = () => (
  <>
    <style>
      {`@keyframes float1{0%{transform:translate(0,0)}50%{transform:translate(-10px,10px)}100%{transform:translate(0,0)}}@keyframes float2{0%{transform:translate(0,0)}50%{transform:translate(10px,-10px)}100%{transform:translate(0,0)}}`}
    </style>
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className="absolute top-0 left-0 h-full w-full"
    >
      <defs>
        <linearGradient id="rev_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--color-primary)', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-chart-3)', stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="rev_grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--color-chart-4)', stopOpacity: 0.9 }} />
          <stop offset="50%" style={{ stopColor: 'var(--color-secondary)', stopOpacity: 0.7 }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-chart-1)', stopOpacity: 0.6 }} />
        </linearGradient>
        <radialGradient id="rev_grad3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--color-destructive)', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-chart-5)', stopOpacity: 0.4 }} />
        </radialGradient>
        <filter id="rev_blur1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="35" />
        </filter>
        <filter id="rev_blur2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="25" />
        </filter>
        <filter id="rev_blur3" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
      </defs>
      <g style={{ animation: 'float1 20s ease-in-out infinite' }}>
        <ellipse
          cx="200"
          cy="500"
          rx="250"
          ry="180"
          fill="url(#rev_grad1)"
          filter="url(#rev_blur1)"
          transform="rotate(-30 200 500)"
        />
        <rect
          x="500"
          y="100"
          width="300"
          height="250"
          rx="80"
          fill="url(#rev_grad2)"
          filter="url(#rev_blur2)"
          transform="rotate(15 650 225)"
        />
      </g>
      <g style={{ animation: 'float2 25s ease-in-out infinite' }}>
        <circle cx="650" cy="450" r="150" fill="url(#rev_grad3)" filter="url(#rev_blur3)" opacity="0.7" />
        <ellipse cx="50" cy="150" rx="180" ry="120" fill="var(--color-accent)" filter="url(#rev_blur2)" opacity="0.8" />
      </g>
    </svg>
  </>
);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-6 w-6">
    <g fillRule="evenodd" fill="none">
      <g fillRule="nonzero" transform="translate(3, 2)">
        <path
          fill="#4285F4"
          d="M57.8123233,30.1515267 C57.8123233,27.7263183 57.6155321,25.9565533 57.1896408,24.1212666 L29.4960833,24.1212666 L29.4960833,35.0674653 L45.7515771,35.0674653 C45.4239683,37.7877475 43.6542033,41.8844383 39.7213169,44.6372555 L39.6661883,45.0037254 L48.4223791,51.7870338 L49.0290201,51.8475849 C54.6004021,46.7020943 57.8123233,39.1313952 57.8123233,30.1515267"
        />
        <path
          fill="#34A853"
          d="M29.4960833,58.9921667 C37.4599129,58.9921667 44.1456164,56.3701671 49.0290201,51.8475849 L39.7213169,44.6372555 C37.2305867,46.3742596 33.887622,47.5868638 29.4960833,47.5868638 C21.6960582,47.5868638 15.0758763,42.4415991 12.7159637,35.3297782 L12.3700541,35.3591501 L3.26524241,42.4054492 L3.14617358,42.736447 C7.9965904,52.3717589 17.959737,58.9921667 29.4960833,58.9921667"
        />
        <path
          fill="#FBBC05"
          d="M12.7159637,35.3297782 C12.0932812,33.4944915 11.7329116,31.5279353 11.7329116,29.4960833 C11.7329116,27.4640054 12.0932812,25.4976752 12.6832029,23.6623884 L12.6667095,23.2715173 L3.44779955,16.1120237 L3.14617358,16.2554937 C1.14708246,20.2539019 0,24.7439491 0,29.4960833 C0,34.2482175 1.14708246,38.7380388 3.14617358,42.736447 L12.7159637,35.3297782"
        />
        <path
          fill="#EB4335"
          d="M29.4960833,11.4050769 C35.0347044,11.4050769 38.7707997,13.7975244 40.9011602,15.7968415 L49.2255853,7.66898166 C44.1130815,2.91684746 37.4599129,0 29.4960833,0 C17.959737,0 7.9965904,6.62018183 3.14617358,16.2554937 L12.6832029,23.6623884 C15.0758763,16.5505675 21.6960582,11.4050769 29.4960833,11.4050769"
        />
      </g>
    </g>
  </svg>
);

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="h-6 w-6">
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

const modalSteps = [
  { message: 'Signing you up...', icon: <Loader className="h-12 w-12 animate-spin text-primary" /> },
  { message: 'Onboarding you...', icon: <Loader className="h-12 w-12 animate-spin text-primary" /> },
  { message: 'Finalizing...', icon: <Loader className="h-12 w-12 animate-spin text-primary" /> },
  { message: 'Welcome Aboard!', icon: <PartyPopper className="h-12 w-12 text-green-500" /> }
];
const TEXT_LOOP_INTERVAL = 1.5;
const POST_AUTH_PATH = '/about-you';

const DefaultLogo = () => (
  <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
    <Gem className="h-4 w-4" />
  </div>
);

interface AuthComponentProps {
  logo?: React.ReactNode;
  brandName?: string;
  useGradientBackground?: boolean;
  className?: string;
  communityTypography?: boolean;
  showHeader?: boolean;
}

export const AuthComponent = ({
  logo = <DefaultLogo />,
  brandName = 'EaseMize',
  useGradientBackground = true,
  className,
  communityTypography = false,
  showHeader = true
}: AuthComponentProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'password' | 'confirmPassword'>('email');
  const [modalStatus, setModalStatus] = useState<'closed' | 'loading' | 'error' | 'success'>('closed');
  const [modalErrorMessage, setModalErrorMessage] = useState('');
  const [modalSuccessMessage, setModalSuccessMessage] = useState('Welcome Aboard!');
  const confettiRef = useRef<ConfettiRef>(null);
  const hasRedirectedAfterAuthRef = useRef(false);

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const titleClass = communityTypography
    ? 'font-semibold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white'
    : 'font-serif font-light text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground';

  const fireSideCanons = () => {
    const fire = confettiRef.current?.fire;
    if (!fire) return;

    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    const particleCount = 50;
    fire({ ...defaults, particleCount, origin: { x: 0, y: 1 }, angle: 60 });
    fire({ ...defaults, particleCount, origin: { x: 1, y: 1 }, angle: 120 });
  };

  const getAuthRedirectTo = () =>
    typeof window === 'undefined' ? undefined : `${window.location.origin}/sign-in`;

  const redirectAfterAuth = useCallback(() => {
    if (hasRedirectedAfterAuthRef.current) return;
    hasRedirectedAfterAuthRef.current = true;
    navigate(POST_AUTH_PATH, { replace: true });
  }, [navigate]);

  const handleAuthError = (fallbackMessage: string, error?: unknown) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    setModalErrorMessage(message);
    setModalStatus('error');
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    if (modalStatus !== 'closed') return;
    setModalStatus('loading');

    try {
      const redirectTo = getAuthRedirectTo();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined
      });

      if (error) {
        handleAuthError(`Unable to continue with ${provider}.`, error);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      handleAuthError(`OAuth URL missing for ${provider}. Check provider configuration.`);
    } catch (error) {
      handleAuthError(`Unable to continue with ${provider}.`, error);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!isEmailValid) {
      setModalErrorMessage('Enter a valid email address first.');
      setModalStatus('error');
      return;
    }
    if (modalStatus !== 'closed') return;

    setModalStatus('loading');
    try {
      const redirectTo = getAuthRedirectTo();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true
        }
      });

      if (error) {
        handleAuthError('Unable to send magic link.', error);
        return;
      }

      setModalSuccessMessage('Magic link sent. Check your inbox.');
      setModalStatus('success');
    } catch (error) {
      handleAuthError('Unable to send magic link.', error);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStatus !== 'closed' || authStep !== 'confirmPassword') return;

    if (!isEmailValid) {
      setModalErrorMessage('Enter a valid email address.');
      setModalStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setModalErrorMessage('Passwords do not match!');
      setModalStatus('error');
      return;
    }

    setModalStatus('loading');
    try {
      const redirectTo = getAuthRedirectTo();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
      });

      if (error) {
        handleAuthError('Unable to create account.', error);
        return;
      }

      fireSideCanons();
      setModalSuccessMessage(
        data.session
          ? 'Account created and connected.'
          : 'Account created. Please confirm your email to continue.'
      );
      setModalStatus('success');
    } catch (error) {
      handleAuthError('Unable to create account.', error);
    }
  };

  const handleProgressStep = () => {
    if (authStep === 'email' && isEmailValid) setAuthStep('password');
    if (authStep === 'password' && isPasswordValid) setAuthStep('confirmPassword');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleProgressStep();
  };

  const handleGoBack = () => {
    if (authStep === 'confirmPassword') {
      setAuthStep('password');
      setConfirmPassword('');
      return;
    }
    if (authStep === 'password') setAuthStep('email');
  };

  const closeModal = () => {
    setModalStatus('closed');
    setModalErrorMessage('');
    setModalSuccessMessage('Welcome Aboard!');
  };

  useEffect(() => {
    if (authStep === 'password') window.setTimeout(() => passwordInputRef.current?.focus(), 500);
    if (authStep === 'confirmPassword') window.setTimeout(() => confirmPasswordInputRef.current?.focus(), 500);
  }, [authStep]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        redirectAfterAuth();
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      redirectAfterAuth();
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [redirectAfterAuth]);

  const Modal = () => (
    <AnimatePresence>
      {modalStatus !== 'closed' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative mx-2 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-4 border-border bg-card/80 p-8"
          >
            {modalStatus === 'error' || modalStatus === 'success' ? (
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}

            {modalStatus === 'error' ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-medium text-foreground">{modalErrorMessage}</p>
                <GlassButton onClick={closeModal} size="sm" className="mt-4">
                  Try Again
                </GlassButton>
              </>
            ) : null}

            {modalStatus === 'loading' ? (
              <TextLoop interval={TEXT_LOOP_INTERVAL} stopOnEnd={true}>
                {modalSteps.slice(0, -1).map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-4">
                    {step.icon}
                    <p className="text-lg font-medium text-foreground">{step.message}</p>
                  </div>
                ))}
              </TextLoop>
            ) : null}

            {modalStatus === 'success' ? (
              <div className="flex flex-col items-center gap-4">
                {modalSteps[modalSteps.length - 1].icon}
                <p className="text-center text-lg font-medium text-foreground">{modalSuccessMessage}</p>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className={cn('dark flex min-h-screen w-screen flex-col bg-black text-white', className)}>
      <style>{`
        input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear{display:none!important}
        input[type="password"]::-webkit-credentials-auto-fill-button,input[type="password"]::-webkit-strong-password-auto-fill-button{display:none!important}
        @property --angle-1{syntax:"<angle>";inherits:false;initial-value:-75deg}
        @property --angle-2{syntax:"<angle>";inherits:false;initial-value:-45deg}
        .glass-button-wrap{--anim-time:400ms;--anim-ease:cubic-bezier(0.25,1,0.5,1);--border-width:clamp(1px,0.0625em,4px);position:relative;z-index:2;transform-style:preserve-3d;transition:transform var(--anim-time) var(--anim-ease)}
        .glass-button-wrap:has(.glass-button:active){transform:rotateX(25deg)}
        .glass-button-shadow{--shadow-cutoff-fix:2em;position:absolute;width:calc(100% + var(--shadow-cutoff-fix));height:calc(100% + var(--shadow-cutoff-fix));top:calc(0% - var(--shadow-cutoff-fix)/2);left:calc(0% - var(--shadow-cutoff-fix)/2);filter:blur(clamp(2px,0.125em,12px));transition:filter var(--anim-time) var(--anim-ease);pointer-events:none;z-index:0}
        .glass-button-shadow::after{content:"";position:absolute;inset:0;border-radius:9999px;background:linear-gradient(180deg,oklch(from var(--foreground) l c h / 30%),oklch(from var(--foreground) l c h / 10%));width:calc(100% - var(--shadow-cutoff-fix) - 0.25em);height:calc(100% - var(--shadow-cutoff-fix) - 0.25em);top:calc(var(--shadow-cutoff-fix) - 0.5em);left:calc(var(--shadow-cutoff-fix) - 0.875em);padding:0.125em;box-sizing:border-box;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:all var(--anim-time) var(--anim-ease);opacity:.9}
        .glass-button{backdrop-filter:blur(clamp(3px,0.4em,12px));-webkit-backdrop-filter:blur(clamp(3px,0.4em,12px));transition:all var(--anim-time) var(--anim-ease);background:linear-gradient(-75deg,oklch(from var(--background) l c h / 14%),oklch(from var(--background) l c h / 30%),oklch(from var(--background) l c h / 14%));box-shadow:inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 14%),inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 70%),0 0.25em 0.125em -0.125em oklch(from var(--foreground) l c h / 30%),0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 35%)}
        .glass-button:hover{transform:scale(.985);box-shadow:inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 22%),inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 75%),0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 35%),0 0 0.05em 0.1em inset oklch(from var(--background) l c h / 55%)}
        .glass-button-text{color:oklch(from var(--foreground) l c h / 90%)}
        .glass-button-text::after{content:"";display:block;position:absolute;width:calc(100% - var(--border-width));height:calc(100% - var(--border-width));top:calc(0% + var(--border-width)/2);left:calc(0% + var(--border-width)/2);box-sizing:border-box;border-radius:9999px;overflow:clip;background:linear-gradient(var(--angle-2),transparent 0%,oklch(from var(--background) l c h / 50%) 40% 50%,transparent 55%);z-index:3;mix-blend-mode:screen;pointer-events:none;background-size:200% 200%;background-position:0% 50%;transition:background-position calc(var(--anim-time) * 1.25) var(--anim-ease), --angle-2 calc(var(--anim-time) * 1.25) var(--anim-ease)}
        .glass-button:hover .glass-button-text::after{background-position:25% 50%}
        .glass-button::after{content:"";position:absolute;z-index:1;inset:0;border-radius:9999px;width:calc(100% + var(--border-width));height:calc(100% + var(--border-width));top:calc(0% - var(--border-width)/2);left:calc(0% - var(--border-width)/2);padding:var(--border-width);box-sizing:border-box;background:conic-gradient(from var(--angle-1) at 50% 50%,oklch(from var(--foreground) l c h / 65%) 0%,transparent 5% 40%,oklch(from var(--foreground) l c h / 55%) 50%,transparent 60% 95%,oklch(from var(--foreground) l c h / 65%) 100%),linear-gradient(180deg,oklch(from var(--background) l c h / 50%),oklch(from var(--background) l c h / 50%));mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:all var(--anim-time) var(--anim-ease), --angle-1 500ms ease;box-shadow:inset 0 0 0 calc(var(--border-width)/2) oklch(from var(--background) l c h / 60%);pointer-events:none}
        .glass-button:hover::after{--angle-1:-125deg}
        .glass-input-wrap{position:relative;z-index:2;transform-style:preserve-3d;border-radius:9999px}
        .glass-input{display:flex;position:relative;width:100%;align-items:center;gap:0.5rem;border-radius:9999px;padding:0.25rem;backdrop-filter:blur(clamp(3px,0.4em,12px));-webkit-backdrop-filter:blur(clamp(3px,0.4em,12px));background:linear-gradient(-75deg,oklch(from var(--background) l c h / 14%),oklch(from var(--background) l c h / 30%),oklch(from var(--background) l c h / 14%));box-shadow:inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 14%),inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 70%),0 0.25em 0.125em -0.125em oklch(from var(--foreground) l c h / 30%),0 0 0.1em 0.25em inset oklch(from var(--background) l c h / 35%)}
        .glass-input-wrap:focus-within .glass-input{box-shadow:inset 0 0.125em 0.125em oklch(from var(--foreground) l c h / 24%),inset 0 -0.125em 0.125em oklch(from var(--background) l c h / 76%),0 0.15em 0.05em -0.1em oklch(from var(--foreground) l c h / 35%),0 0 0.06em 0.12em inset oklch(from var(--background) l c h / 60%)}
        .glass-input::after{content:"";position:absolute;z-index:1;inset:0;border-radius:9999px;width:calc(100% + clamp(1px,0.0625em,4px));height:calc(100% + clamp(1px,0.0625em,4px));top:calc(0% - clamp(1px,0.0625em,4px)/2);left:calc(0% - clamp(1px,0.0625em,4px)/2);padding:clamp(1px,0.0625em,4px);box-sizing:border-box;background:conic-gradient(from var(--angle-1) at 50% 50%,oklch(from var(--foreground) l c h / 60%) 0%,transparent 5% 40%,oklch(from var(--foreground) l c h / 50%) 50%,transparent 60% 95%,oklch(from var(--foreground) l c h / 60%) 100%),linear-gradient(180deg,oklch(from var(--background) l c h / 50%),oklch(from var(--background) l c h / 50%));mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:all 400ms cubic-bezier(0.25,1,0.5,1), --angle-1 500ms ease;box-shadow:inset 0 0 0 calc(clamp(1px,0.0625em,4px)/2) oklch(from var(--background) l c h / 55%);pointer-events:none}
        .glass-input-wrap:focus-within .glass-input::after{--angle-1:-125deg}
        .glass-input-text-area{position:absolute;inset:0;border-radius:9999px;pointer-events:none}
        .glass-input-text-area::after{content:"";display:block;position:absolute;width:calc(100% - clamp(1px,0.0625em,4px));height:calc(100% - clamp(1px,0.0625em,4px));top:calc(0% + clamp(1px,0.0625em,4px)/2);left:calc(0% + clamp(1px,0.0625em,4px)/2);box-sizing:border-box;border-radius:9999px;overflow:clip;background:linear-gradient(var(--angle-2),transparent 0%,oklch(from var(--background) l c h / 50%) 40% 50%,transparent 55%);z-index:3;mix-blend-mode:screen;pointer-events:none;background-size:200% 200%;background-position:0% 50%;transition:background-position calc(400ms * 1.25) cubic-bezier(0.25,1,0.5,1), --angle-2 calc(400ms * 1.25) cubic-bezier(0.25,1,0.5,1)}
        .glass-input-wrap:focus-within .glass-input-text-area::after{background-position:25% 50%}
      `}</style>

      <Confetti ref={confettiRef} manualstart className="pointer-events-none fixed top-0 left-0 z-[999] h-full w-full" />
      <Modal />

      {showHeader ? (
        <div className={cn('fixed top-4 left-4 z-20 flex items-center gap-2', 'md:left-1/2 md:-translate-x-1/2')}>
          {logo}
          {brandName?.trim().length ? <h1 className="text-base font-bold text-white">{brandName}</h1> : null}
        </div>
      ) : null}

      <div className={cn('relative flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-transparent')}>
        {useGradientBackground ? <div className="absolute inset-0 z-0 opacity-35"><GradientBackground /></div> : null}
        {!useGradientBackground ? (
          <Grainient
            className="absolute inset-0 z-0"
            color1="#f4f4f4"
            color2="#9a9a9a"
            color3="#050505"
            timeSpeed={0}
            colorBalance={0.12}
            warpStrength={1.0}
            warpFrequency={4.8}
            warpSpeed={1.4}
            warpAmplitude={58}
            blendAngle={-18}
            blendSoftness={0.14}
            rotationAmount={260}
            noiseScale={1.8}
            grainAmount={0.14}
            grainScale={2.2}
            grainAnimated={false}
            contrast={1.25}
            gamma={1.0}
            saturation={1.05}
            centerX={0.02}
            centerY={-0.02}
            zoom={0.86}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <fieldset
            disabled={modalStatus !== 'closed'}
            className="pointer-events-auto relative flex w-full max-w-[340px] flex-col items-center gap-8 p-4"
          >
          <AnimatePresence mode="wait">
            {authStep === 'email' ? (
              <motion.div
                key="email-content"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex w-full flex-col items-center gap-4"
              >
                <BlurFade delay={0.25} className="w-full">
                  <div className="text-center">
                    <ShinyText
                      text="Get started with Us"
                      speed={2}
                      delay={0}
                      color="#b5b5b5"
                      shineColor="#ffffff"
                      spread={120}
                      direction="left"
                      yoyo={false}
                      pauseOnHover={false}
                      className={cn(titleClass, 'leading-tight')}
                    />
                  </div>
                </BlurFade>
                <BlurFade delay={0.5}>
                  <GradientText
                    colors={['#ffffff', '#e2e8ff', '#bfdbfe', '#ffffff', '#c7d2fe', '#ffffff']}
                    animationSpeed={4.2}
                    direction="horizontal"
                    pauseOnHover={false}
                    yoyo={true}
                    className="text-sm font-semibold tracking-wide"
                  >
                    Continue with
                  </GradientText>
                </BlurFade>
                <BlurFade delay={0.75}>
                  <div className="flex w-full items-center justify-center gap-4">
                    <GlassButton
                      type="button"
                      onClick={() => void handleOAuthSignIn('google')}
                      contentClassName="flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <GoogleIcon />
                      <span className="font-semibold text-foreground">Google</span>
                    </GlassButton>
                    <GlassButton
                      type="button"
                      onClick={() => void handleOAuthSignIn('github')}
                      contentClassName="flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <GitHubIcon />
                      <span className="font-semibold text-foreground">GitHub</span>
                    </GlassButton>
                  </div>
                </BlurFade>
                <BlurFade delay={1} className="w-[300px]">
                  <div className="flex w-full items-center gap-2 py-2">
                    <hr className="w-full border-zinc-700" />
                    <span className="text-xs font-semibold text-zinc-400">OR</span>
                    <hr className="w-full border-zinc-700" />
                  </div>
                </BlurFade>
              </motion.div>
            ) : null}

            {authStep === 'password' ? (
              <motion.div
                key="password-title"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex w-full flex-col items-center gap-4 text-center"
              >
                <BlurFade delay={0} className="w-full">
                  <div className="text-center">
                    <p className={titleClass}>Create your password</p>
                  </div>
                </BlurFade>
                <BlurFade delay={0.25}>
                  <p className="text-sm font-medium text-zinc-300">Your password must be at least 6 characters long.</p>
                </BlurFade>
              </motion.div>
            ) : null}

            {authStep === 'confirmPassword' ? (
              <motion.div
                key="confirm-title"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex w-full flex-col items-center gap-4 text-center"
              >
                <BlurFade delay={0} className="w-full">
                  <div className="text-center">
                    <p className={titleClass}>One Last Step</p>
                  </div>
                </BlurFade>
                <BlurFade delay={0.25}>
                  <p className="text-sm font-medium text-zinc-300">Confirm your password to continue</p>
                </BlurFade>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <form onSubmit={handleFinalSubmit} className="w-[300px] space-y-6">
            <AnimatePresence>
              {authStep !== 'confirmPassword' ? (
                <motion.div
                  key="email-password-fields"
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full space-y-6"
                >
                  <BlurFade delay={authStep === 'email' ? 1.25 : 0} inView={true} className="w-full">
                    <div className="relative w-full">
                      <AnimatePresence>
                        {authStep === 'password' ? (
                          <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.4 }}
                            className="absolute -top-6 left-4 z-10"
                          >
                            <label className="text-xs font-semibold text-zinc-400">Email</label>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div className="glass-input-wrap w-full">
                        <div className="glass-input">
                          <span className="glass-input-text-area" />
                          <div
                            className={cn(
                              'relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2 transition-all duration-300 ease-in-out',
                              email.length > 20 && authStep === 'email' ? 'w-0 px-0' : 'w-10 pl-2'
                            )}
                          >
                            <Mail className="h-5 w-5 flex-shrink-0 text-foreground/80" />
                          </div>
                          <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                              'relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none transition-[padding-right] duration-300 ease-in-out delay-300',
                              isEmailValid && authStep === 'email' ? 'pr-2' : 'pr-0'
                            )}
                          />
                          <div
                            className={cn(
                              'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                              isEmailValid && authStep === 'email' ? 'w-10 pr-1' : 'w-0'
                            )}
                          >
                            <GlassButton
                              type="button"
                              onClick={handleProgressStep}
                              size="icon"
                              aria-label="Continue with email"
                              contentClassName="text-foreground/80 hover:text-foreground"
                            >
                              <ArrowRight className="h-5 w-5" />
                            </GlassButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BlurFade>
                  <AnimatePresence>
                    {authStep === 'email' ? (
                      <BlurFade key="magic-link" delay={0.1} className="w-full">
                        <button
                          type="button"
                          onClick={() => void handleMagicLinkSignIn()}
                          className="w-full text-center text-sm font-medium text-zinc-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500"
                          disabled={!isEmailValid}
                        >
                          Send me a magic link (email only)
                        </button>
                      </BlurFade>
                    ) : null}
                  </AnimatePresence>

                  <AnimatePresence>
                    {authStep === 'password' ? (
                      <BlurFade key="password-field" className="w-full">
                        <div className="relative w-full">
                          <AnimatePresence>
                            {password.length > 0 ? (
                              <motion.div
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="absolute -top-6 left-4 z-10"
                              >
                                <label className="text-xs font-semibold text-zinc-400">Password</label>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>

                          <div className="glass-input-wrap w-full">
                            <div className="glass-input">
                              <span className="glass-input-text-area" />
                              <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                                {isPasswordValid ? (
                                  <button
                                    type="button"
                                    aria-label="Toggle password visibility"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground"
                                  >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                ) : (
                                  <Lock className="h-5 w-5 flex-shrink-0 text-foreground/80" />
                                )}
                              </div>
                              <input
                                ref={passwordInputRef}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                              />
                              <div
                                className={cn(
                                  'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                                  isPasswordValid ? 'w-10 pr-1' : 'w-0'
                                )}
                              >
                                <GlassButton
                                  type="button"
                                  onClick={handleProgressStep}
                                  size="icon"
                                  aria-label="Submit password"
                                  contentClassName="text-foreground/80 hover:text-foreground"
                                >
                                  <ArrowRight className="h-5 w-5" />
                                </GlassButton>
                              </div>
                            </div>
                          </div>
                        </div>
                        <BlurFade inView delay={0.2}>
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="mt-4 flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                          >
                            <ArrowLeft className="h-4 w-4" /> Go back
                          </button>
                        </BlurFade>
                      </BlurFade>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {authStep === 'confirmPassword' ? (
                <BlurFade key="confirm-password-field" className="w-full">
                  <div className="relative w-full">
                    <AnimatePresence>
                      {confirmPassword.length > 0 ? (
                        <motion.div
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="absolute -top-6 left-4 z-10"
                        >
                          <label className="text-xs font-semibold text-zinc-400">Confirm Password</label>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="glass-input-wrap w-[300px]">
                      <div className="glass-input">
                        <span className="glass-input-text-area" />
                        <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                          {isConfirmPasswordValid ? (
                            <button
                              type="button"
                              aria-label="Toggle confirm password visibility"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          ) : (
                            <Lock className="h-5 w-5 flex-shrink-0 text-foreground/80" />
                          )}
                        </div>
                        <input
                          ref={confirmPasswordInputRef}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                        />
                        <div
                          className={cn(
                            'relative z-10 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
                            isConfirmPasswordValid ? 'w-10 pr-1' : 'w-0'
                          )}
                        >
                          <GlassButton
                            type="submit"
                            size="icon"
                            aria-label="Finish sign-up"
                            contentClassName="text-foreground/80 hover:text-foreground"
                          >
                            <ArrowRight className="h-5 w-5" />
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </div>
                  <BlurFade inView delay={0.2}>
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="mt-4 flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" /> Go back
                    </button>
                  </BlurFade>
                </BlurFade>
              ) : null}
            </AnimatePresence>
          </form>
          </fieldset>
        </div>
      </div>
    </div>
  );
};
