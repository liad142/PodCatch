/**
 * Maps YouTube topic IDs and Wikipedia topic categories to Apple Podcast genre IDs.
 *
 * YouTube channels expose topics in two formats:
 *   1. `topicIds` — Freebase MID strings like `/m/07c1v`
 *   2. `topicCategories` — Wikipedia URLs like `https://en.wikipedia.org/wiki/Technology`
 *
 * This module provides lookup tables for both formats plus helper functions
 * that accept arrays of raw values and return deduplicated genre ID arrays.
 */

// ---------------------------------------------------------------------------
// Freebase MID → Apple Podcast genre IDs
// ---------------------------------------------------------------------------

/** Maps YouTube Freebase MID topic IDs to Apple Podcast genre ID arrays. */
export const YOUTUBE_TOPIC_TO_GENRE: Record<string, string[]> = {
  '/m/07c1v': ['1318'],         // Technology
  '/m/09s1f': ['1321'],         // Business
  '/m/04rlf': ['1309'],         // Music
  '/m/02jjt': ['1310'],         // Entertainment → TV & Film
  '/m/019_rr': ['1305'],        // Lifestyle → Health & Fitness
  '/m/01k8wb': ['1304'],        // Knowledge → Education
  '/m/098wr': ['1324'],         // Society → Society & Culture
  '/m/0kt51': ['1305'],         // Health → Health & Fitness
  '/m/06ntj': ['1545'],         // Sports
  '/m/05qt0': ['1533'],         // Science
  '/m/02mscn': ['1309', '1314'], // Christian music → Music + Religion & Spirituality
  '/m/09kqc': ['1303'],         // Humor → Comedy
  '/m/0410tth': ['1303'],       // Humor (alt) → Comedy
  '/m/06bvp': ['1314'],         // Religion → Religion & Spirituality
  '/m/03glg': ['1324'],         // Hobby → Society & Culture
  '/m/017rf': ['1301'],         // Acting → Arts
  '/m/0bzvm2': ['1310'],        // Gaming → TV & Film
  '/m/01mw1': ['1307'],         // Children → Kids & Family
  '/m/0glt670': ['1511'],       // Politics → Government
  '/m/0f2f9': ['1310'],         // TV shows → TV & Film
  '/m/02vxn': ['1310'],         // Movies → TV & Film
  '/m/068hy': ['1324'],         // Pets → Society & Culture
  '/m/041xxh': ['1324'],        // Food → Society & Culture
  '/m/032tl': ['1324'],         // Fashion → Society & Culture
  '/m/05jhg': ['1489'],         // News
  '/m/0403l': ['1301'],         // Visual arts → Arts
  '/m/05qjc': ['1301'],         // Performing arts → Arts
};

// ---------------------------------------------------------------------------
// Wikipedia topic name → Apple Podcast genre IDs
// ---------------------------------------------------------------------------

/** Maps Wikipedia topic names (extracted from topicCategories URLs) to genre IDs. */
export const YOUTUBE_WIKI_TO_GENRE: Record<string, string[]> = {
  Technology: ['1318'],
  Business: ['1321'],
  Entertainment: ['1310'],
  Music: ['1309'],
  Comedy: ['1303'],
  Humor: ['1303'],
  Sport: ['1545'],
  Sports: ['1545'],
  Science: ['1533'],
  Health: ['1305'],
  Fitness: ['1305'],
  Lifestyle: ['1305'],
  Society: ['1324'],
  Culture: ['1324'],
  News: ['1489'],
  Education: ['1304'],
  Knowledge: ['1304'],
  Children: ['1307'],
  Film: ['1310'],
  Television: ['1310'],
  Gaming: ['1310'],
  'Video game': ['1310'],
  Politics: ['1511'],
  Government: ['1511'],
  Religion: ['1314'],
  Spirituality: ['1314'],
  History: ['1512'],
  Arts: ['1301'],
  'Visual arts': ['1301'],
  'Performing arts': ['1301'],
  Fiction: ['1483'],
  'True crime': ['1481'],
  Crime: ['1481'],
  Hobby: ['1324'],
  Food: ['1324'],
  Fashion: ['1324'],
  Pet: ['1324'],
  Cooking: ['1324'],
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Extract genre IDs from YouTube `topicCategories` (Wikipedia URLs).
 *
 * Each URL looks like `https://en.wikipedia.org/wiki/Technology`.
 * The topic name is the last path segment (decoded, underscores replaced with spaces).
 *
 * @returns Deduplicated array of Apple Podcast genre IDs.
 */
export function extractGenresFromTopicCategories(topicCategories: string[]): string[] {
  const genres = new Set<string>();

  for (const url of topicCategories) {
    try {
      const topicName = decodeURIComponent(url.split('/').pop() ?? '').replace(/_/g, ' ');
      const mapped = YOUTUBE_WIKI_TO_GENRE[topicName];
      if (mapped) {
        for (const id of mapped) {
          genres.add(id);
        }
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return [...genres];
}

/**
 * Extract genre IDs from YouTube `topicIds` (Freebase MID strings).
 *
 * @returns Deduplicated array of Apple Podcast genre IDs.
 */
export function extractGenresFromTopicIds(topicIds: string[]): string[] {
  const genres = new Set<string>();

  for (const mid of topicIds) {
    const mapped = YOUTUBE_TOPIC_TO_GENRE[mid];
    if (mapped) {
      for (const id of mapped) {
        genres.add(id);
      }
    }
  }

  return [...genres];
}
