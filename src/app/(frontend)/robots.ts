import type { MetadataRoute } from 'next'

import { absoluteURL } from '@/lib/format'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { allow: '/', disallow: ['/admin/', '/api/'], userAgent: '*' },
    sitemap: absoluteURL('/sitemap.xml'),
  }
}
