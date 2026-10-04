'use client';

interface Props {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export function OrbitLogo({ size = 48, className = '', withGlow = true }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background Canvas */}
        <radialGradient id="logo-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#080C14" />
        </radialGradient>

        {/* Solar Orbit Arc Gradient */}
        <linearGradient id="logo-orbitRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="45%" stopColor="#FB923C" />
          <stop offset="85%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>

        {/* Core Sun Gradient */}
        <radialGradient id="logo-sunCore" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>

        {/* Corona Aura Glow */}
        <radialGradient id="logo-sunAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>

        {/* Orbit Glow Filter */}
        <filter id="logo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Deep Obsidian Squircle Container */}
      <rect width="512" height="512" rx="120" fill="url(#logo-bg)" />
      <rect width="510" height="510" x="1" y="1" rx="119" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" />

      {/* Corona Atmospheric Glow Behind Core */}
      {withGlow && <circle cx="256" cy="256" r="140" fill="url(#logo-sunAura)" />}

      {/* Back Half of Orbital Ellipse (Tilted at -30 degrees) */}
      <g transform="rotate(-30 256 256)">
        {/* Ambient orbit track */}
        <ellipse cx="256" cy="256" rx="200" ry="78" stroke="url(#logo-orbitRing)" strokeWidth="32" strokeLinecap="round" filter={withGlow ? "url(#logo-glow)" : undefined} opacity="0.4" />
        <ellipse cx="256" cy="256" rx="200" ry="78" stroke="url(#logo-orbitRing)" strokeWidth="28" strokeLinecap="round" />
      </g>

      {/* Central Celestial Nucleus (The Knowledge Core) */}
      <circle cx="256" cy="256" r="82" fill="url(#logo-sunCore)" filter={withGlow ? "url(#logo-glow)" : undefined} />
      <circle cx="256" cy="256" r="80" fill="url(#logo-sunCore)" />

      {/* Front Arc Highlight / Dynamic Light Streak */}
      <g transform="rotate(-30 256 256)">
        {/* High-energy front arc overlay */}
        <path d="M 120,285 A 200,78 0 0,0 420,240" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.85" />
        
        {/* Active Focus Node / Satellite */}
        <circle cx="430" cy="235" r="26" fill="#FFFFFF" filter={withGlow ? "url(#logo-glow)" : undefined} />
        <circle cx="430" cy="235" r="18" fill="#FDE047" />
      </g>
    </svg>
  );
}
