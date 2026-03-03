import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

// ─── Animated floating food emoji orbs ───────────────────────────────────────
const FOOD_ORBS = ["🍛", "🥗", "🍜", "🥘", "🍱", "🌮", "🍲", "🥙"];

interface Orb {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const generateOrbs = (): Orb[] =>
  FOOD_ORBS.map((emoji, i) => ({
    id: i,
    emoji,
    x: 5 + (i * 12) % 90,
    y: 5 + (i * 17) % 80,
    size: 1.5 + (i % 3) * 0.6,
    duration: 6 + (i * 1.3) % 4,
    delay: -(i * 0.9),
    opacity: 0.07 + (i % 4) * 0.04,
  }));

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(seconds: number, onComplete: () => void) {
  const [count, setCount] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current!);
  }, [onComplete]);

  return count;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const HOME_URL = "https://www.foovafoods.com/";

const NotFound = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const orbs = generateOrbs();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Trigger fade-in on mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const handleRedirect = () => { window.location.href = HOME_URL; };
  const countdown = useCountdown(10, handleRedirect);

  return (
    <>
      {/* ── SEO: head meta injected via Helmet-like inline approach ── */}
      {/* (title is set via document.title for SPA compatibility) */}
      <TitleEffect />

      <div
        className="not-found-root"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* ── Background ambient blobs ── */}
        <div className="nf-blob nf-blob--gold" aria-hidden="true" />
        <div className="nf-blob nf-blob--emerald" aria-hidden="true" />
        <div className="nf-blob nf-blob--deep" aria-hidden="true" />

        {/* ── Floating food orbs ── */}
        {orbs.map((orb) => (
          <span
            key={orb.id}
            className="nf-food-orb"
            aria-hidden="true"
            style={{
              left: `${orb.x}%`,
              top: `${orb.y}%`,
              fontSize: `${orb.size}rem`,
              opacity: orb.opacity,
              animation: `nfFloat ${orb.duration}s ease-in-out ${orb.delay}s infinite`,
            }}
          >
            {orb.emoji}
          </span>
        ))}

        {/* ── Crescent moon decoration (Ramadan accent) ── */}
        <div className="nf-crescent" aria-hidden="true">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M52 16C38.7 16 28 26.7 28 40C28 53.3 38.7 64 52 64C46.5 64 41.5 61.8 37.9 58.1C34.3 54.4 32 49.5 32 44C32 32.9 41 23.9 52 23.9C57.5 23.9 62.5 26.1 66.1 29.8C62.5 21.5 57.8 16 52 16Z"
              fill="currentColor"
            />
            {/* Stars */}
            <circle cx="62" cy="22" r="2" fill="currentColor" opacity="0.8" />
            <circle cx="70" cy="34" r="1.4" fill="currentColor" opacity="0.6" />
            <circle cx="68" cy="14" r="1" fill="currentColor" opacity="0.5" />
          </svg>
        </div>

        {/* ── Grid overlay for depth ── */}
        <div className="nf-grid" aria-hidden="true" />

        {/* ── Main card ── */}
        <main className="nf-card">
          {/* Glowing ring border effect */}
          <div className="nf-card__ring" aria-hidden="true" />

          {/* 404 Heading */}
          <div className="nf-404-wrapper" aria-hidden="true">
            <span className="nf-404-text">404</span>
            <div className="nf-404-glow" />
          </div>

          {/* Divider line with gold shimmer */}
          <div className="nf-divider">
            <div className="nf-divider__line" />
            <span className="nf-divider__icon" aria-hidden="true">✦</span>
            <div className="nf-divider__line" />
          </div>

          {/* Content */}
          <div className="nf-content">
            <h1 className="nf-heading">Page Not Found</h1>
            <p className="nf-sub">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Countdown */}
            <div className="nf-countdown" aria-live="polite">
              <span className="nf-countdown__number">{countdown}</span>
              <span className="nf-countdown__label">
                Redirecting to home in {countdown} second{countdown !== 1 ? "s" : ""}…
              </span>
            </div>

            {/* Buttons */}
            <div className="nf-actions">
              <a
                id="nf-home-btn"
                href={HOME_URL}
                className="nf-btn nf-btn--primary"
                aria-label="Go back to Foova Foods homepage"
              >
                <span className="nf-btn__icon" aria-hidden="true">🏠</span>
                Back to Home
              </a>

              <a
                id="nf-contact-btn"
                href="https://www.foovafoods.com/contact"
                className="nf-btn nf-btn--secondary"
                aria-label="Contact Foova Foods support"
              >
                <span className="nf-btn__icon" aria-hidden="true">💬</span>
                Contact Support
              </a>
            </div>

            {/* Brand footer note */}
            <p className="nf-brand">
              <span className="nf-brand__logo" aria-hidden="true">🍽️</span>
              <span className="nf-brand__name">Foova Foods</span>
              &nbsp;— Taste the Premium Difference
            </p>
          </div>
        </main>

        {/* ── Inline styles for all 404-specific rules ── */}
        <style>{`
          /* ── Reset / globals ── */
          .not-found-root {
            position: relative;
            min-height: 100vh;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            overflow: hidden;
            background:
              radial-gradient(ellipse 120% 80% at 50% 0%, hsl(160 15% 6%) 0%, hsl(160 15% 3%) 60%),
              hsl(160 15% 3%);
            font-family: 'Inter', system-ui, sans-serif;
          }

          /* ── Ambient blobs ── */
          .nf-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            pointer-events: none;
            will-change: transform;
          }
          .nf-blob--gold {
            width: 520px; height: 520px;
            top: -160px; right: -120px;
            background: radial-gradient(circle, hsl(43 85% 55% / 0.12) 0%, transparent 70%);
            animation: blobPulse 8s ease-in-out infinite;
          }
          .nf-blob--emerald {
            width: 400px; height: 400px;
            bottom: -100px; left: -80px;
            background: radial-gradient(circle, hsl(155 55% 32% / 0.12) 0%, transparent 70%);
            animation: blobPulse 10s ease-in-out 2s infinite;
          }
          .nf-blob--deep {
            width: 300px; height: 300px;
            top: 40%; left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, hsl(43 85% 45% / 0.05) 0%, transparent 70%);
            animation: blobPulse 12s ease-in-out 4s infinite;
          }

          /* ── Grid overlay ── */
          .nf-grid {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background-image:
              linear-gradient(hsl(155 10% 20% / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, hsl(155 10% 20% / 0.04) 1px, transparent 1px);
            background-size: 48px 48px;
          }

          /* ── Floating food orbs ── */
          .nf-food-orb {
            position: absolute;
            pointer-events: none;
            user-select: none;
            will-change: transform;
          }

          /* ── Crescent (Ramadan accent) ── */
          .nf-crescent {
            position: absolute;
            top: 1.5rem;
            right: 2rem;
            width: 56px;
            color: hsl(43 85% 55% / 0.35);
            animation: crescentSway 7s ease-in-out infinite;
          }
          @media (max-width: 640px) {
            .nf-crescent { width: 40px; top: 1rem; right: 1rem; }
          }

          /* ── Main card ── */
          .nf-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 680px;
            background: hsl(160 12% 7% / 0.7);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid hsl(43 85% 55% / 0.18);
            border-radius: 28px;
            padding: 3.5rem 3rem;
            text-align: center;
            box-shadow:
              0 0 0 1px hsl(43 85% 55% / 0.06),
              0 32px 80px hsl(0 0% 0% / 0.6),
              inset 0 1px 0 hsl(43 85% 55% / 0.1);
            animation: cardEntrance 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @media (max-width: 640px) {
            .nf-card { padding: 2.5rem 1.5rem; border-radius: 20px; }
          }

          .nf-card__ring {
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            pointer-events: none;
            background: linear-gradient(
              135deg,
              hsl(43 85% 55% / 0.2) 0%,
              transparent 40%,
              hsl(155 55% 32% / 0.12) 80%,
              transparent 100%
            );
            border-radius: 28px;
          }

          /* ── 404 number ── */
          .nf-404-wrapper {
            position: relative;
            display: inline-block;
            margin-bottom: 0.75rem;
          }
          .nf-404-text {
            display: block;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: clamp(5rem, 18vw, 9rem);
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.05em;
            background: linear-gradient(
              135deg,
              hsl(43 85% 42%) 0%,
              hsl(43 90% 62%) 35%,
              hsl(43 75% 75%) 55%,
              hsl(43 90% 62%) 70%,
              hsl(43 85% 42%) 100%
            );
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: nfFloat 5s ease-in-out infinite, shimmerText 4s linear infinite;
            text-shadow: none;
          }
          .nf-404-glow {
            position: absolute;
            inset: 0;
            pointer-events: none;
            border-radius: 12px;
            filter: blur(40px);
            background: hsl(43 85% 55% / 0.18);
            animation: blobPulse 4s ease-in-out infinite;
          }

          /* ── Divider ── */
          .nf-divider {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin: 1.25rem auto;
            max-width: 300px;
          }
          .nf-divider__line {
            flex: 1;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent,
              hsl(43 85% 55% / 0.5),
              transparent
            );
          }
          .nf-divider__icon {
            color: hsl(43 85% 55%);
            font-size: 0.7rem;
            opacity: 0.7;
          }

          /* ── Content ── */
          .nf-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .nf-heading {
            font-size: clamp(1.5rem, 5vw, 2.25rem);
            font-weight: 700;
            letter-spacing: -0.025em;
            color: hsl(40 25% 93%);
            line-height: 1.15;
            margin: 0;
          }
          .nf-sub {
            font-size: clamp(0.9rem, 2.5vw, 1.05rem);
            color: hsl(160 5% 58%);
            line-height: 1.7;
            max-width: 460px;
            margin: 0;
          }

          /* ── Countdown ── */
          .nf-countdown {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: hsl(160 12% 10% / 0.8);
            border: 1px solid hsl(43 85% 55% / 0.15);
            border-radius: 50px;
            padding: 0.45rem 1.1rem;
            font-size: 0.82rem;
            color: hsl(43 85% 65%);
            margin-top: 0.25rem;
          }
          .nf-countdown__number {
            font-weight: 800;
            font-size: 1.1rem;
            font-variant-numeric: tabular-nums;
            min-width: 1.5ch;
            text-align: center;
          }
          .nf-countdown__label {
            color: hsl(160 5% 55%);
          }

          /* ── Action buttons ── */
          .nf-actions {
            display: flex;
            gap: 0.9rem;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 0.5rem;
          }
          .nf-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.75rem;
            border-radius: 50px;
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 600;
            font-size: 0.95rem;
            letter-spacing: -0.01em;
            cursor: pointer;
            border: none;
            outline: none;
            transition:
              transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease,
              background 0.25s ease;
            position: relative;
            overflow: hidden;
          }
          .nf-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background: hsl(0 0% 100% / 0.06);
            opacity: 0;
            transition: opacity 0.2s;
          }
          .nf-btn:hover::before { opacity: 1; }

          .nf-btn--primary {
            background: linear-gradient(135deg, hsl(43 85% 42%), hsl(43 90% 56%));
            color: hsl(160 15% 5%);
            box-shadow:
              0 4px 20px hsl(43 85% 55% / 0.3),
              0 1px 3px hsl(0 0% 0% / 0.3);
          }
          .nf-btn--primary:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow:
              0 8px 32px hsl(43 85% 55% / 0.5),
              0 0 60px hsl(43 85% 55% / 0.2),
              0 2px 6px hsl(0 0% 0% / 0.4);
          }
          .nf-btn--primary:active { transform: scale(0.98); }

          .nf-btn--secondary {
            background: hsl(160 12% 12% / 0.8);
            color: hsl(40 25% 85%);
            border: 1px solid hsl(43 85% 55% / 0.25);
            box-shadow: 0 4px 16px hsl(0 0% 0% / 0.2);
          }
          .nf-btn--secondary:hover {
            transform: scale(1.05) translateY(-2px);
            border-color: hsl(43 85% 55% / 0.5);
            box-shadow:
              0 8px 28px hsl(0 0% 0% / 0.35),
              0 0 30px hsl(43 85% 55% / 0.12);
          }
          .nf-btn--secondary:active { transform: scale(0.98); }

          .nf-btn__icon {
            font-size: 1.05em;
          }

          /* ── Brand footer ── */
          .nf-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            font-size: 0.78rem;
            color: hsl(160 5% 40%);
            margin-top: 0.75rem;
            letter-spacing: 0.01em;
          }
          .nf-brand__name {
            color: hsl(43 85% 55% / 0.7);
            font-weight: 600;
          }

          /* ── Keyframes ── */
          @keyframes nfFloat {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-18px); }
          }
          @keyframes blobPulse {
            0%,100% { opacity: 0.8; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.06); }
          }
          @keyframes crescentSway {
            0%,100% { transform: rotate(-5deg); opacity: 0.35; }
            50%      { transform: rotate(5deg);  opacity: 0.55; }
          }
          @keyframes shimmerText {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes cardEntrance {
            from { opacity: 0; transform: translateY(32px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </>
  );
};

// ── Sets document title & meta description for SEO ──────────────────────────
const TitleEffect = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "404 | Foova Foods";

    // Meta description
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content ?? "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.content =
      "The page you're looking for doesn't exist on Foova Foods. Return to our homepage to explore our premium food selection.";

    // robots: noindex for 404 pages (good SEO practice)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = robots?.content ?? "";
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";

    return () => {
      document.title = prevTitle;
      if (meta) meta.content = prevDesc;
      if (robots) robots.content = prevRobots;
    };
  }, []);

  return null;
};

export default NotFound;
