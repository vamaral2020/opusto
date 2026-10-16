import { cache } from 'react'

import { getCMS } from './payload'

// React cache deduplicates reads within one render, without caching across requests.
export const getSiteSettings = cache(async () =>
  (await getCMS()).findGlobal({
    slug: 'site-settings',
    depth: 1,
    overrideAccess: false,
  }),
)
