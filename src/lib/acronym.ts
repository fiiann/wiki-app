/**
 * Derives a 3-letter uppercase acronym from a project name.
 * Uses first letter of each word, skipping short words (the/an/a/in).
 * Falls back to first 3 letters if single word.
 */
export function projectAcronym(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return name.slice(0, 3).toUpperCase()
  }
  const significant = words.filter(
    (w) => w.length > 2 && !['the', 'and', 'an', 'a', 'in', 'for', 'with'].includes(w.toLowerCase())
  )
  const letters = (significant.length >= 2 ? significant : words)
    .map((w) => w[0].toUpperCase())
    .join('')
  return letters.slice(0, 3)
}