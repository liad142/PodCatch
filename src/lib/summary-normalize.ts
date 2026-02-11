import type { ActionItem, ChronologicalSection, DeepSummaryContent } from "@/types/database";

/**
 * Normalize actionable_takeaways: old string[] → ActionItem[]
 */
export function normalizeActionItems(
  takeaways: (string | ActionItem)[] | undefined
): ActionItem[] {
  if (!takeaways || takeaways.length === 0) return [];

  return takeaways.map((item) => {
    if (typeof item === "string") {
      return {
        text: item,
        category: "concept" as const,
        priority: "medium" as const,
      };
    }
    return item;
  });
}

/**
 * Normalize chronological_breakdown: old format → new format with timestamp fields
 */
export function normalizeChronologicalSections(
  sections: ChronologicalSection[] | undefined
): ChronologicalSection[] {
  if (!sections || sections.length === 0) return [];

  return sections.map((section) => {
    // Already has new fields
    if (section.title || section.timestamp) {
      return section;
    }
    // Old format: { timestamp_description, content }
    return {
      title: section.timestamp_description || "",
      timestamp: "00:00",
      timestamp_seconds: 0,
      hook: "",
      content: section.content,
    };
  });
}

/**
 * Check if a chronological section has real (non-zero) timestamps
 */
export function hasRealTimestamps(sections: ChronologicalSection[]): boolean {
  return sections.some(
    (s) => s.timestamp_seconds != null && s.timestamp_seconds > 0
  );
}

/**
 * Parse <<highlighted>> markers from comprehensive_overview text.
 * Returns segments of { type: 'text' | 'highlight', content }.
 */
export interface TextSegment {
  type: "text" | "highlight";
  content: string;
}

export function parseHighlightMarkers(text: string): TextSegment[] {
  if (!text) return [];

  const regex = /<<([^>]+)>>/g;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the marker
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    // Add the highlighted segment
    segments.push({
      type: "highlight",
      content: match[1],
    });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // If no markers found, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/**
 * Generate a search URL for a resource (no AI-generated URLs)
 */
export function getResourceSearchUrl(resource: {
  name: string;
  type: string;
}): string {
  const q = encodeURIComponent(resource.name);
  switch (resource.type) {
    case "github":
      return `https://github.com/search?q=${q}`;
    case "book":
      return `https://www.google.com/search?q=${encodeURIComponent(resource.name + " book")}`;
    case "paper":
      return `https://scholar.google.com/scholar?q=${q}`;
    case "person":
      return `https://www.google.com/search?q=${q}`;
    case "tool":
    case "website":
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}
