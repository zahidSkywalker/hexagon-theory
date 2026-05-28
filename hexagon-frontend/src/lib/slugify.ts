import { getDb } from './db';

/**
 * Generate a URL-safe slug from a string.
 * If the slug already exists in the ideas collection, append a counter.
 */
export async function generateSlug(baseString: string): Promise<string> {
  const db = await getDb();
  
  // Convert to URL-safe slug
  let slug = baseString
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')   // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens
    .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens

  // Ensure slug is not empty
  if (!slug) {
    slug = 'idea-' + Date.now();
  }

  // Check uniqueness
  const existing = await db.collection('ideas').findOne({ slug });
  if (!existing) {
    return slug;
  }

  // Append counter
  let counter = 1;
  let candidateSlug = `${slug}-${counter}`;
  while (await db.collection('ideas').findOne({ slug: candidateSlug })) {
    counter++;
    candidateSlug = `${slug}-${counter}`;
  }

  return candidateSlug;
}
