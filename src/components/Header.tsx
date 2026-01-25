"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Compass, Radio, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Headphones className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PodCatch
          </span>
        </Link>
        <nav className="ml-auto flex items-center space-x-2">
          <Button
            variant={isActive("/") && !pathname.startsWith("/browse") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/" className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">My Podcasts</span>
            </Link>
          </Button>
          <Button
            variant={isActive("/browse") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/browse" className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Discover</span>
            </Link>
          </Button>
          <Button
            variant={isActive("/feed") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/feed" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
