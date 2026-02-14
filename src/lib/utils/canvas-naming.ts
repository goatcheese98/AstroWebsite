/**
 * Canvas Naming Utilities
 * Handles generation of unique "Untitled Canvas" names
 */

/**
 * Generates a unique canvas name based on existing canvases
 * Handles "Untitled Canvas", "Untitled Canvas 2", etc.
 *
 * @param existingTitles - Array of existing canvas titles to check against
 * @returns A unique canvas name
 */
export function generateCanvasName(existingTitles: string[]): string {
  const untitledPattern = /^Untitled Canvas(?: (\d+))?$/;

  // Filter to only "Untitled Canvas" titles
  const untitledCanvases = existingTitles.filter(title =>
    untitledPattern.test(title)
  );

  // If no untitled canvases exist, return base name
  if (untitledCanvases.length === 0) {
    return 'Untitled Canvas';
  }

  // Check if exact "Untitled Canvas" exists
  const hasExact = untitledCanvases.some(title => title === 'Untitled Canvas');

  // Extract all numbers from numbered variants
  let maxNum = hasExact ? 1 : 0;

  for (const title of untitledCanvases) {
    const match = title.match(untitledPattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  // Generate next number
  if (maxNum > 0) {
    return `Untitled Canvas ${maxNum + 1}`;
  } else if (hasExact) {
    return 'Untitled Canvas 2';
  }

  return 'Untitled Canvas';
}

/**
 * Check if a title starts with "Untitled Canvas"
 */
export function isUntitledCanvas(title: string): boolean {
  return title.startsWith('Untitled Canvas');
}

/**
 * Get all untitled canvas titles for a user from the database
 * This is a helper for API routes that need to query the DB
 */
export async function getUntitledCanvasTitles(
  db: D1Database,
  userId: string
): Promise<string[]> {
  const result = await db
    .prepare('SELECT title FROM canvases WHERE user_id = ? AND title LIKE ?')
    .bind(userId, 'Untitled Canvas%')
    .all();

  return (result.results || []).map((r: any) => r.title);
}

/**
 * Generate a unique canvas name by querying the database
 * Use this in API routes when creating new canvases
 */
export async function generateUniqueCanvasName(
  db: D1Database,
  userId: string,
  proposedTitle: string
): Promise<string> {
  // If not an untitled canvas, return as-is
  if (!isUntitledCanvas(proposedTitle)) {
    return proposedTitle;
  }

  // Get existing untitled canvases and generate unique name
  const existingTitles = await getUntitledCanvasTitles(db, userId);
  return generateCanvasName(existingTitles);
}
