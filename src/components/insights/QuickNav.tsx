"use client";

import { useState, useEffect, MutableRefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Quote, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
export type SectionId = "hero" | "highlights" | "transcript";

interface QuickNavProps {
  sectionRefs: MutableRefObject<Record<SectionId, HTMLElement | null>>;
  onNavigate: (id: SectionId) => void;
  hasHighlights: boolean;
}

interface NavItem {
  id: SectionId;
  icon: typeof FileText;
  label: string;
}

export function QuickNav({ sectionRefs, onNavigate, hasHighlights }: QuickNavProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [isVisible, setIsVisible] = useState(true);

  // Navigation items
  const navItems: NavItem[] = [
    { id: "hero", icon: FileText, label: "Summary" },
    ...(hasHighlights
      ? [{ id: "highlights" as SectionId, icon: Quote, label: "Quotes" }]
      : []),
    { id: "transcript", icon: ScrollText, label: "Transcript" },
  ];

  // Intersection Observer for active section detection
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section") as SectionId;
          if (sectionId) {
            setActiveSection(sectionId);
          }
        }
      });
    };

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: "-40% 0px -40% 0px", // Trigger when section is in middle of viewport
      threshold: 0,
    };

    // Observe each section
    Object.entries(sectionRefs.current).forEach(([id, element]) => {
      if (element) {
        const observer = new IntersectionObserver(handleIntersect, options);
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionRefs]);

  // Hide QuickNav when scrolled to top or bottom
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;

          // Hide near top (first 100px) or near bottom (last 200px for player)
          const nearTop = scrollY < 100;
          const nearBottom = scrollY + windowHeight > documentHeight - 200;

          setIsVisible(!nearTop && !nearBottom);
          lastScrollY = scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed right-4 top-1/2 -translate-y-1/2 z-40",
            "hidden sm:flex flex-col gap-1",
            "p-1.5 rounded-full",
            "bg-card/95 backdrop-blur-md",
            "border border-border",
            "shadow-[var(--shadow-floating)]"
          )}
          aria-label="Quick navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative w-10 h-10 rounded-full",
                  "flex items-center justify-center",
                  "transition-all duration-200",
                  "group",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Jump to ${item.label}`}
                aria-current={isActive ? "true" : undefined}
              >
                <Icon className="h-5 w-5" />

                {/* Tooltip */}
                <span
                  className={cn(
                    "absolute right-full mr-3 px-2 py-1",
                    "text-xs font-medium whitespace-nowrap",
                    "bg-popover text-popover-foreground rounded shadow-[var(--shadow-2)]",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-200",
                    "pointer-events-none"
                  )}
                >
                  {item.label}
                </span>

                {/* Active indicator ring */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-card"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
