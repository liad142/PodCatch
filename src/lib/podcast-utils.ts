/**
 * Check if an RSS URL is an Apple Podcasts reference (format: "apple:1234567890")
 */
export function isApplePodcastRef(rssUrl: string): boolean {
  return rssUrl.startsWith('apple:');
}

/**
 * Extract the Apple Podcast ID from an "apple:ID" reference
 */
export function extractAppleId(rssUrl: string): string {
  return rssUrl.replace('apple:', '');
}
