"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

// Category icons - using different background gradients for visual interest
const CATEGORY_GRADIENTS: Record<string, string> = {
  "comedy": "from-yellow-500 to-orange-500",
  "news": "from-blue-500 to-cyan-500",
  "true_crime": "from-red-600 to-rose-500",
  "society_and_culture": "from-purple-500 to-pink-500",
  "sports": "from-green-500 to-emerald-500",
  "health_and_fitness": "from-teal-500 to-green-500",
  "arts": "from-fuchsia-500 to-purple-500",
  "business": "from-slate-600 to-zinc-500",
  "education": "from-indigo-500 to-blue-500",
  "fiction": "from-violet-500 to-purple-500",
  "history": "from-amber-600 to-yellow-500",
  "kids_and_family": "from-pink-500 to-rose-400",
  "leisure": "from-lime-500 to-green-500",
  "music": "from-rose-500 to-pink-500",
  "religion_and_spirituality": "from-sky-500 to-blue-500",
  "science": "from-cyan-500 to-teal-500",
  "technology": "from-gray-600 to-slate-500",
  "tv_and_film": "from-orange-500 to-red-500",
  "default": "from-primary to-primary/70",
};

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const gradient = CATEGORY_GRADIENTS[category.id] || CATEGORY_GRADIENTS.default;

  return (
    <Link
      href={`/browse/category/${category.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-lg transition-all duration-300",
        "hover:scale-105 hover:shadow-lg hover:shadow-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <div
        className={cn(
          "flex items-end justify-start w-40 h-24 p-4",
          "bg-gradient-to-br",
          gradient
        )}
      >
        {/* Icon overlay if provided */}
        {category.icon && (
          <span className="absolute top-2 right-2 text-3xl opacity-60 group-hover:opacity-80 transition-opacity">
            {category.icon}
          </span>
        )}

        {/* Category name */}
        <span className="text-sm font-bold text-white drop-shadow-md line-clamp-2">
          {category.name}
        </span>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </Link>
  );
}

// Loading skeleton for CategoryCard
export function CategoryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-40 h-24 rounded-lg bg-muted animate-pulse",
        className
      )}
    />
  );
}
