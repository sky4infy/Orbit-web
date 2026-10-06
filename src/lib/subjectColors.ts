/**
 * Universal Subject Color & Styling Utility.
 * Provides distinct, high-contrast, theme-consistent colors for all standard and custom subjects.
 */

export interface SubjectTheme {
  badge: string;
  dot: string;
  border: string;
  text: string;
  bgSubtle: string;
}

export function getSubjectTheme(subjectName: string = ''): SubjectTheme {
  const norm = subjectName.toLowerCase();

  // Operating Systems
  if (norm.includes('os') || norm.includes('operating') || norm.includes('systems') || norm.includes('kernel') || norm.includes('linux')) {
    return {
      badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      dot: 'bg-sky-400',
      border: 'border-sky-500/30',
      text: 'text-sky-400',
      bgSubtle: 'bg-sky-500/10',
    };
  }

  // Computer Architecture / COA / Hardware
  if (
    norm.includes('coa') ||
    norm.includes('architecture') ||
    norm.includes('organization') ||
    norm.includes('hardware') ||
    norm.includes('circuits') ||
    norm.includes('microprocessor')
  ) {
    return {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bgSubtle: 'bg-amber-500/10',
    };
  }

  // Core Computer Science / DSA / Database / Networks
  if (
    norm.includes('core computer science') ||
    norm.includes('dsa') ||
    norm.includes('algorithm') ||
    norm.includes('data structure') ||
    norm.includes('database') ||
    norm.includes('dbms') ||
    norm.includes('sql')
  ) {
    return {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      bgSubtle: 'bg-emerald-500/10',
    };
  }

  // AI / ML / Deep Learning / Data Science
  if (
    norm.includes('ai') ||
    norm.includes('machine learning') ||
    norm.includes('deep learning') ||
    norm.includes('aiml') ||
    norm.includes('neural') ||
    norm.includes('nlp') ||
    norm.includes('vision')
  ) {
    return {
      badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
      dot: 'bg-violet-400',
      border: 'border-violet-500/30',
      text: 'text-violet-400',
      bgSubtle: 'bg-violet-500/10',
    };
  }

  // Physics (JEE / Olympiad)
  if (norm.includes('physics') || norm.includes('mechanic') || norm.includes('optic') || norm.includes('electr') || norm.includes('thermo')) {
    return {
      badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      dot: 'bg-indigo-400',
      border: 'border-indigo-500/30',
      text: 'text-indigo-400',
      bgSubtle: 'bg-indigo-500/10',
    };
  }

  // Chemistry (JEE)
  if (norm.includes('chem') || norm.includes('organic') || norm.includes('inorganic') || norm.includes('physical chem')) {
    return {
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      bgSubtle: 'bg-rose-500/10',
    };
  }

  // Mathematics
  if (norm.includes('math') || norm.includes('calculus') || norm.includes('algebra') || norm.includes('probability')) {
    return {
      badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
      dot: 'bg-teal-400',
      border: 'border-teal-500/30',
      text: 'text-teal-400',
      bgSubtle: 'bg-teal-500/10',
    };
  }

  // Dynamic fallback palette for custom subjects
  const palettes: SubjectTheme[] = [
    {
      badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      dot: 'bg-cyan-400',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      bgSubtle: 'bg-cyan-500/10',
    },
    {
      badge: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
      dot: 'bg-fuchsia-400',
      border: 'border-fuchsia-500/30',
      text: 'text-fuchsia-400',
      bgSubtle: 'bg-fuchsia-500/10',
    },
    {
      badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      dot: 'bg-yellow-400',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      bgSubtle: 'bg-yellow-500/10',
    },
    {
      badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-400',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      bgSubtle: 'bg-orange-500/10',
    },
  ];

  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = (hash << 5) - hash + subjectName.charCodeAt(i);
    hash |= 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}
