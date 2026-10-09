'use client';

/**
 * Orbit Sound Engine
 * Provides Orbit's signature celestial chime for notifications, timers, and completions.
 * 
 * Uses HTML5 Audio with `/sounds/orbit-chime.wav` and falls back to Web Audio API
 * synthetic harmonics so it works 100% offline with zero external network dependencies.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes Orbit's distinct dual-tone cosmic chime using Web Audio API oscillators.
 * Tone: D5 (587 Hz) followed by A5 (880 Hz) + D6 harmonic with exponential bell decay.
 */
function playSynthesizedOrbitChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 1.2);

      // Note 2: A5 (880 Hz) with D6 overtone (1174.66 Hz), triggered 120ms later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.35, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 1.5);

      // Note 3: Shimmer harmonic D6 (1174.66 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1174.66, now + 0.14);

      gain3.gain.setValueAtTime(0, now);
      gain3.gain.setValueAtTime(0, now + 0.14);
      gain3.gain.linearRampToValueAtTime(0.12, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc3.start(now + 0.14);
      osc3.stop(now + 1.3);

      setTimeout(resolve, 1500);
    } catch {
      resolve();
    }
  });
}

/**
 * Plays the signature Orbit notification chime.
 * Tries the high-definition audio file first; if blocked or unavailable, uses Web Audio synthesis.
 */
export async function playOrbitChime(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio('/sounds/orbit-chime.wav');
    audio.volume = 0.85;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      return;
    }
  } catch {
    // If Audio element was restricted by browser autoplay policy or failed to load,
    // fallback to Web Audio synthesizer
    await playSynthesizedOrbitChime();
  }
}
