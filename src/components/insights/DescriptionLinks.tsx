"use client";

import { useMemo } from "react";
import { ExternalLink, Github, BookOpen, Globe, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

interface DescriptionLinksProps {
  links: { url: string; text: string }[];
  isRTL: boolean;
}

type LinkCategory = "github" | "docs" | "social" | "other";

function categorizeLink(url: string): LinkCategory {
  const lower = url.toLowerCase();
  if (lower.includes("github.com")) return "github";
  if (
    lower.includes("docs.") ||
    lower.includes("documentation") ||
    lower.includes("readme") ||
    lower.includes("wiki")
  )
    return "docs";
  if (
    lower.includes("twitter.com") ||
    lower.includes("x.com") ||
    lower.includes("linkedin.com") ||
    lower.includes("instagram.com")
  )
    return "social";
  return "other";
}

function getCategoryIcon(category: LinkCategory) {
  switch (category) {
    case "github":
      return Github;
    case "docs":
      return BookOpen;
    case "social":
      return Twitter;
    default:
      return Globe;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getPath(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return path.length > 1 ? path : "";
  } catch {
    return "";
  }
}

export function DescriptionLinks({ links, isRTL }: DescriptionLinksProps) {
  // Deduplicate and filter out YouTube's own tracking/redirect links
  const filtered = useMemo(() => {
    const seen = new Set<string>();
    return links.filter((l) => {
      const domain = getDomain(l.url);
      if (domain.includes("youtube.com") || domain.includes("youtu.be")) return false;
      if (domain.includes("bit.ly") || domain.includes("goo.gl")) return false; // skip shorteners
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });
  }, [links]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <div className={cn("flex items-center gap-2 mb-5", isRTL && "flex-row-reverse")}>
        <h2 className={cn("text-h2 text-foreground flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <ExternalLink className="h-5 w-5 text-blue-500" />
          Resources & Links
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((link, i) => {
          const category = categorizeLink(link.url);
          const Icon = getCategoryIcon(category);
          const domain = getDomain(link.url);
          const path = getPath(link.url);

          // Use context text if it's not the same as the URL and not empty
          const displayText =
            link.text && link.text !== link.url && link.text.length > 2
              ? link.text
              : null;

          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-start gap-3 p-3 rounded-xl bg-card border border-border",
                "hover:border-primary/40 hover:shadow-sm transition-all",
                isRTL && "flex-row-reverse text-right"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                {displayText && (
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayText}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {domain}
                  {path && (
                    <span className="text-muted-foreground/60">{path}</span>
                  )}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 mt-0.5 transition-colors" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
