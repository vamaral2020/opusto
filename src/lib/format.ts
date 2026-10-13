export const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))

export const absoluteURL = (path = '/'): string =>
  new URL(path, process.env.SITE_URL || 'http://localhost:3000').toString()
