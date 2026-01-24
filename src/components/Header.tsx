"use client";

import Link from "next/link";
import { Headphones } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Headphones className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PodCatch
          </span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            AI-Powered Podcast Summaries
          </span>
        </nav>
      </div>
    </header>
  );
}
