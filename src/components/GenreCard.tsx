'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Mic,
  Briefcase,
  Laugh,
  GraduationCap,
  BookOpen,
  Building2,
  History,
  Heart,
  Users,
  Music,
  Newspaper,
  Church,
  Atom,
  Globe,
  Trophy,
  Cpu,
  Search,
  Film,
} from 'lucide-react';

export interface Genre {
  id: string;
  name: string;
}

const genreIcons: Record<string, React.ElementType> = {
  '1301': Mic,        // Arts
  '1321': Briefcase,  // Business
  '1303': Laugh,      // Comedy
  '1304': GraduationCap, // Education
  '1483': BookOpen,   // Fiction
  '1511': Building2,  // Government
  '1512': History,    // History
  '1305': Heart,      // Health & Fitness
  '1307': Users,      // Kids & Family
  '1309': Music,      // Music
  '1489': Newspaper,  // News
  '1314': Church,     // Religion & Spirituality
  '1533': Atom,       // Science
  '1324': Globe,      // Society & Culture
  '1545': Trophy,     // Sports
  '1318': Cpu,        // Technology
  '1481': Search,     // True Crime
  '1310': Film,       // TV & Film
};

const genreGradients: Record<string, string> = {
  '1301': 'from-purple-500 to-pink-500',
  '1321': 'from-blue-600 to-cyan-500',
  '1303': 'from-yellow-400 to-orange-500',
  '1304': 'from-green-500 to-emerald-500',
  '1483': 'from-indigo-500 to-purple-500',
  '1511': 'from-slate-600 to-slate-500',
  '1512': 'from-amber-600 to-yellow-500',
  '1305': 'from-rose-500 to-red-500',
  '1307': 'from-sky-400 to-blue-500',
  '1309': 'from-violet-500 to-purple-600',
  '1489': 'from-red-600 to-orange-500',
  '1314': 'from-indigo-400 to-blue-500',
  '1533': 'from-teal-500 to-cyan-500',
  '1324': 'from-orange-500 to-amber-500',
  '1545': 'from-green-600 to-lime-500',
  '1318': 'from-gray-700 to-gray-500',
  '1481': 'from-red-700 to-rose-600',
  '1310': 'from-pink-500 to-rose-500',
};

interface GenreCardProps {
  genre: Genre;
  className?: string;
}

export function GenreCard({ genre, className }: GenreCardProps) {
  const Icon = genreIcons[genre.id] || Mic;
  const gradient = genreGradients[genre.id] || 'from-gray-500 to-gray-600';

  return (
    <Link
      href={`/browse/genre/${genre.id}`}
      className={cn('block group', className)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl p-4 h-24 transition-all duration-300',
          'hover:shadow-lg hover:-translate-y-1',
          'bg-gradient-to-br',
          gradient
        )}
      >
        <div className="relative z-10 flex flex-col justify-between h-full">
          <Icon className="h-6 w-6 text-white/90" />
          <h3 className="font-semibold text-white text-sm leading-tight">
            {genre.name}
          </h3>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -right-2 -top-2 w-12 h-12 rounded-full bg-white/5" />
      </div>
    </Link>
  );
}
