'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, CalendarDays, RotateCcw, User } from 'lucide-react';

const ITEMS = [
  { href: '/planner', icon: Home, label: 'Today' },
  { href: '/journey', icon: BookOpen, label: 'Journey' },
  { href: '/week', icon: CalendarDays, label: 'Week' },
  { href: '/mistakes', icon: RotateCcw, label: 'Mistakes & revision' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on the login screen — nav only makes sense once signed in.
  if (pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-around py-2">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5"
            >
              <Icon size={22} strokeWidth={1.75} className={active ? 'text-amber' : 'text-paper/40'} />
              {active && <span className="h-1 w-1 rounded-full bg-amber" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
