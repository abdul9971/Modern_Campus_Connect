'use client';

import { useEffect, useRef, useState } from 'react';
import { useScroll, useSpring, useTransform, motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOTAL_FRAMES = 153;
const FRAME_PREFIX = '/sequence/ezgif-frame-';

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

// Background colours per act, keyed by scroll progress thresholds
const BG_STOPS = [
  { at: 0.00, color: [200, 184, 154] as [number, number, number] }, // #c8b89a  parchment
  { at: 0.25, color: [200, 184, 154] as [number, number, number] }, // hold parchment
  { at: 0.45, color: [42, 90, 106] as [number, number, number] },   // #2a5a6a  teal
  { at: 0.60, color: [26, 58, 74] as [number, number, number] },    // #1a3a4a  dark teal
  { at: 0.72, color: [26, 58, 90] as [number, number, number] },    // #1a3a5a  navy
  { at: 1.00, color: [26, 58, 90] as [number, number, number] },    // hold navy
];

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function getBgColor(progress: number): string {
  for (let i = 0; i < BG_STOPS.length - 1; i++) {
    const s = BG_STOPS[i];
    const e = BG_STOPS[i + 1];
    if (progress >= s.at && progress <= e.at) {
      const t = e.at === s.at ? 0 : (progress - s.at) / (e.at - s.at);
      return lerpColor(s.color, e.color, t);
    }
  }
  return `rgb(${BG_STOPS[BG_STOPS.length - 1].color.join(',')})`;
}

// ---------------------------------------------------------------------------
// Story beats
// ---------------------------------------------------------------------------
interface Beat {
  range: [number, number];
  title: string;
  subtitle: string;
  align: 'left' | 'center' | 'right';
  titleSize: string;
  darkText: boolean; // true = dark brown text (parchment bg)
}

const BEATS: Beat[] = [
  {
    range: [0.00, 0.22],
    title: 'The Old Way',
    subtitle: 'Paper trails. Manual registers.\nA system built for another era.',
    align: 'center',
    titleSize: 'text-6xl md:text-8xl lg:text-9xl',
    darkText: true,
  },
  {
    range: [0.25, 0.44],
    title: 'Cracks Appear',
    subtitle: 'Every lost register. Every missed check-in.\nThe cracks were always there.',
    align: 'left',
    titleSize: 'text-5xl md:text-7xl lg:text-8xl',
    darkText: false,
  },
  {
    range: [0.48, 0.72],
    title: 'Intelligence\nIgnites',
    subtitle: 'Not a patch. A complete rethinking.\nAI transforms the foundation itself.',
    align: 'right',
    titleSize: 'text-5xl md:text-7xl lg:text-8xl',
    darkText: false,
  },
  {
    range: [0.78, 1.00],
    title: 'CampusConnect',
    subtitle: 'Real-time. Role-aware. Fraud-proof.\nThe attendance system your campus deserves.',
    align: 'center',
    titleSize: 'text-6xl md:text-8xl lg:text-9xl',
    darkText: false,
  },
];

// ---------------------------------------------------------------------------
// BeatOverlay
// ---------------------------------------------------------------------------
interface BeatOverlayProps {
  beat: Beat;
  smoothProgress: ReturnType<typeof useSpring>;
}

function BeatOverlay({ beat, smoothProgress }: BeatOverlayProps) {
  const [start, end] = beat.range;
  const fadeDuration = 0.07;

  const opacity = useTransform(
    smoothProgress,
    [start, start + fadeDuration, end - fadeDuration, end],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    smoothProgress,
    [start, start + fadeDuration, end - fadeDuration, end],
    [28, 0, 0, -28]
  );

  const titleColor = beat.darkText ? '#1a0f00' : '#ffffff';
  const subtitleColor = beat.darkText ? 'rgba(26,15,0,0.65)' : 'rgba(255,255,255,0.65)';
  const textShadow = beat.darkText
    ? '0 2px 24px rgba(200,184,154,0.5)'
    : '0 2px 32px rgba(0,0,0,0.7)';

  const alignClass =
    beat.align === 'center'
      ? 'items-center text-center'
      : beat.align === 'left'
      ? 'items-start text-left pl-8 md:pl-16'
      : 'items-end text-right pr-8 md:pr-16';

  return (
    <motion.div
      style={{ opacity, y }}
      className={`absolute inset-0 flex flex-col justify-center pointer-events-none z-20 ${alignClass}`}
    >
      <h2
        className={`font-black leading-none tracking-tight whitespace-pre-line ${beat.titleSize}`}
        style={{ color: titleColor, textShadow }}
      >
        {beat.title}
      </h2>
      <p
        className="mt-4 text-lg md:text-2xl font-medium whitespace-pre-line max-w-2xl leading-relaxed"
        style={{ color: subtitleColor, textShadow }}
      >
        {beat.subtitle}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ScrollHint
// ---------------------------------------------------------------------------
interface ScrollHintProps {
  smoothProgress: ReturnType<typeof useSpring>;
}

function ScrollHint({ smoothProgress }: ScrollHintProps) {
  const opacity = useTransform(smoothProgress, [0, 0.08], [1, 0]);

  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30"
    >
      <span className="text-white/60 text-sm tracking-[0.2em] uppercase font-medium">
        Scroll to explore
      </span>
      <div className="relative h-10 w-px overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-transparent"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117]">
      <p className="text-white/30 text-xs tracking-[0.4em] uppercase font-medium mb-8">
        Loading Experience
      </p>
      <div className="text-white text-8xl font-black tabular-nums">{Math.round(progress)}%</div>
      <div className="mt-8 w-48 h-px bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/60 rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ScrollSequence component
// ---------------------------------------------------------------------------
export default function ScrollSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number | null>(null);
  const currentBgRef = useRef<string>('#c8b89a');

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 28,
    restDelta: 0.0001,
  });

  // ── Frame preloading ──────────────────────────────────────────────────────
  useEffect(() => {
    let loaded = 0;
    const imgs: HTMLImageElement[] = Array.from({ length: TOTAL_FRAMES }, () => new Image());

    framesRef.current = imgs;

    imgs.forEach((img, i) => {
      img.onload = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) setIsLoaded(true);
      };
      img.onerror = () => {
        // Even if frame fails, count it so loading completes
        loaded++;
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) setIsLoaded(true);
      };
      // Slight stagger to avoid flooding the browser
      img.src = `${FRAME_PREFIX}${pad(i + 1)}.jpg`;
    });

    return () => {
      imgs.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  const dprRef = useRef(1);

  useEffect(() => {
    if (!isLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    dprRef.current = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const dpr = dprRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isLoaded]);

  // ── Render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = smoothProgress.on('change', (progress: number) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = dprRef.current;
        const clientW = canvas.clientWidth;
        const clientH = canvas.clientHeight;

        if (canvas.width !== clientW * dpr || canvas.height !== clientH * dpr) {
          canvas.width = clientW * dpr;
          canvas.height = clientH * dpr;
        }
        ctx.scale(dpr, dpr);

        // Background colour
        const bgColor = getBgColor(Math.max(0, Math.min(1, progress)));
        currentBgRef.current = bgColor;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, clientW, clientH);

        // Frame index
        const frameIdx = Math.min(
          Math.floor(progress * (TOTAL_FRAMES - 1)),
          TOTAL_FRAMES - 1
        );
        const img = framesRef.current[Math.max(0, frameIdx)];
        if (!img?.complete || !img.naturalWidth) return;

        // Contain-fit scaling
        const imgAR = img.naturalWidth / img.naturalHeight;
        const canvasAR = clientW / clientH;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgAR > canvasAR) {
          drawW = clientW;
          drawH = clientW / imgAR;
        } else {
          drawH = clientH;
          drawW = clientH * imgAR;
        }
        drawX = (clientW - drawW) / 2;
        drawY = (clientH - drawH) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Reset transform for next frame
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      });
    });

    return () => {
      unsubscribe();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isLoaded, smoothProgress]);

  // ── Sticky bg sync ─────────────────────────────────────────────────────────
  // We update the wrapper div bg colour in sync with canvas to avoid border flash
  const [wrapperBg, setWrapperBg] = useState('#c8b89a');
  useEffect(() => {
    if (!isLoaded) return;
    const unsub = smoothProgress.on('change', (v: number) => {
      setWrapperBg(getBgColor(Math.max(0, Math.min(1, v))));
    });
    return unsub;
  }, [isLoaded, smoothProgress]);

  // ── Loading overlay opacity ───────────────────────────────────────────────
  const [loadingVisible, setLoadingVisible] = useState(true);
  useEffect(() => {
    if (isLoaded) {
      const t = setTimeout(() => setLoadingVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [isLoaded]);

  return (
    <>
      {/* Loading overlay */}
      {loadingVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 pointer-events-none"
        >
          <LoadingScreen progress={loadProgress} />
        </motion.div>
      )}

      {/* Scroll container — 500vh gives the scroll track */}
      <div ref={containerRef} style={{ height: '500vh' }}>
        {/* Sticky viewport lock */}
        <div
          className="sticky top-0 h-screen w-full overflow-hidden"
          style={{ backgroundColor: wrapperBg, transition: 'background-color 0.1s linear' }}
        >
          {/* Full-bleed canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Text beats */}
          {isLoaded &&
            BEATS.map((beat) => (
              <BeatOverlay key={beat.title} beat={beat} smoothProgress={smoothProgress} />
            ))}

          {/* Scroll hint */}
          {isLoaded && <ScrollHint smoothProgress={smoothProgress} />}
        </div>
      </div>
    </>
  );
}
