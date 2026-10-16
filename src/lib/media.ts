/** Use local image optimization for media served by this application's origin. */
export function normalizeMediaURL(
  value?: string | null,
  siteURL = process.env.SITE_URL || 'http://localhost:3000',
): string | null {
  if (!value) return null

  // Preserve local paths exactly, including their query strings and encoding.
  if (value.startsWith('/') && !value.startsWith('//')) return value

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    const site = new URL(siteURL)
    if (url.origin === site.origin) {
      // A protocol-relative path would be interpreted as a remote image by Next.js.
      if (url.pathname.startsWith('//')) return null
      return `${url.pathname}${url.search}${url.hash}`
    }

    return value
  } catch {
    return null
  }
}
