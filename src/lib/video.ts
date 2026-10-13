export function externalVideoEmbed(value: string): string | null {
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be')
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`
    if (host === 'youtube.com') {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') return `https://player.vimeo.com/video/${url.pathname.slice(1)}`
  } catch {
    return null
  }
  return null
}
