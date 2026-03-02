/**
 * YouTube storyboard spec parser.
 *
 * Storyboard sprites are grid images (e.g. 5×5 = 25 frames per sheet).
 * The spec from InnerTube looks like:
 *   https://i.ytimg.com/sb/{id}/storyboard3_L$L/$N.jpg|48x27|...#rs$...
 * Levels are separated by `|` after the base URL.
 */

export interface StoryboardLevel {
  baseUrl: string;
  width: number;
  height: number;
  count: number;
  cols: number;
  rows: number;
  intervalMs: number;
  /** Short name like "default", empty string for others */
  name: string;
}

/**
 * Parse a raw storyboard spec string into structured levels.
 */
export function parseStoryboardSpec(spec: string): StoryboardLevel[] {
  if (!spec) return [];

  // Split by `|` — first element is the base URL template, rest are level descriptors
  const parts = spec.split('|');
  if (parts.length < 2) return [];

  const baseUrlTemplate = parts[0]; // e.g. https://i.ytimg.com/sb/{id}/storyboard3_L$L/$N.jpg
  const levels: StoryboardLevel[] = [];

  for (let i = 1; i < parts.length; i++) {
    const levelStr = parts[i];
    // Format: WxH#count#cols#rows#intervalMs#name#sigh
    // Or: WxH followed by more `#`-separated values
    const segments = levelStr.split('#');
    if (segments.length < 5) continue;

    const [dims, countStr, colsStr, rowsStr, intervalStr] = segments;
    const [widthStr, heightStr] = dims.split('x');

    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);
    const count = parseInt(countStr, 10);
    const cols = parseInt(colsStr, 10);
    const rows = parseInt(rowsStr, 10);
    const intervalMs = parseInt(intervalStr, 10);

    if (isNaN(width) || isNaN(height) || isNaN(count) || cols <= 0 || rows <= 0 || intervalMs <= 0) {
      continue;
    }

    // Build actual base URL for this level (replace $L with level index, 0-based)
    const levelIndex = i - 1;
    const sigh = segments.length > 6 ? segments[segments.length - 1] : '';
    let baseUrl = baseUrlTemplate
      .replace('$L', String(levelIndex))
      .replace('$N', 'M$M'); // Keep $N as M$M template for sheet index

    // Append sigh parameter if present
    if (sigh) {
      baseUrl += (baseUrl.includes('?') ? '&' : '?') + `sigh=${sigh}`;
    }

    levels.push({ baseUrl, width, height, count, cols, rows, intervalMs, name: segments[5] || '' });
  }

  return levels;
}

/**
 * Get the sprite sheet URL and CSS crop coordinates for a frame at a given timestamp.
 * Returns the highest-quality (largest width) level.
 */
export function getFrameUrlForTimestamp(
  levels: StoryboardLevel[],
  timestampSec: number
): { sheetUrl: string; x: number; y: number; width: number; height: number } | null {
  if (levels.length === 0) return null;

  // Pick highest quality level (largest width)
  const level = levels.reduce((best, l) => (l.width > best.width ? l : best), levels[0]);
  const { cols, rows, intervalMs, baseUrl, width, height, count } = level;

  const framesPerSheet = cols * rows;
  const frameIndex = Math.min(Math.floor((timestampSec * 1000) / intervalMs), count - 1);
  if (frameIndex < 0) return null;

  const sheetIndex = Math.floor(frameIndex / framesPerSheet);
  const frameWithinSheet = frameIndex % framesPerSheet;

  const row = Math.floor(frameWithinSheet / cols);
  const col = frameWithinSheet % cols;

  const sheetUrl = baseUrl.replace('M$M', String(sheetIndex));

  return {
    sheetUrl,
    x: col * width,
    y: row * height,
    width,
    height,
  };
}
