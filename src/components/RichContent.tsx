import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import type { Media } from '@/payload-types'

import { MediaImage } from './MediaImage'

type RichTextData = Parameters<typeof RichText>[0]['data']

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => {
    if (node.relationTo !== 'media' || typeof node.value !== 'object' || !node.value) return null
    const media = node.value as Media
    return (
      <figure>
        <MediaImage
          media={{ ...media, alt: node.fields?.alt || media.alt }}
          fill={false}
          sizes="(max-width: 768px) 100vw, 900px"
        />
        {media.caption ? <figcaption>{media.caption}</figcaption> : null}
        {media.credit ? <small>{media.credit}</small> : null}
      </figure>
    )
  },
})

export function RichContent({ data }: { data?: RichTextData | null }) {
  if (!data) return null
  return <RichText className="rich-content" converters={converters} data={data} />
}
